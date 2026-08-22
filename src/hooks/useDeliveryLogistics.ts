import { useEffect, useMemo, useState } from 'react';
import { InteractionManager } from 'react-native';
import { apiGet, apiPost } from '@/src/services/api';
import { logger } from '@/src/lib/logger';
import type { TransportMethod } from '@/src/constants/checkout';
import type { CartItem } from '@/src/contexts/CartContext';

export interface ShopDeliveryInfo {
  distanceKm: number;
  duration: string;
}

interface UseDeliveryLogisticsParams {
  items: CartItem[];
  /** Called when delivery-distance calculation fails, so the caller can surface it. */
  onError: (message: string) => void;
}

interface UseDeliveryLogisticsResult {
  transportMethods: TransportMethod[];
  selectedTransportId: string;
  setSelectedTransportId: (id: string) => void;
  shopDeliveries: Record<string, ShopDeliveryInfo>;
  shopFees: Record<string, number>;
  deliveryFee: number;
  isCalculatingDelivery: boolean;
  latitude: number | null;
  longitude: number | null;
  setLatitude: (lat: number | null) => void;
  setLongitude: (lng: number | null) => void;
  handleAddressComplete: (fullAddress: string, coords?: { lat: number; lng: number }) => Promise<void>;
}

/**
 * Owns transport-method loading, per-shop distance/fee calculation, and the
 * "verify address -> compute delivery routes" flow for the checkout screen.
 */
export function useDeliveryLogistics({ items, onError }: UseDeliveryLogisticsParams): UseDeliveryLogisticsResult {
  const [transportMethods, setTransportMethods] = useState<TransportMethod[]>([]);
  const [selectedTransportId, setSelectedTransportId] = useState('');
  const [shopDeliveries, setShopDeliveries] = useState<Record<string, ShopDeliveryInfo>>({});
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  useEffect(() => {
    // Defer heavy API work until after the navigation animation completes
    const handle = InteractionManager.runAfterInteractions(() => {
      // Load transport methods
      apiGet<{ data: TransportMethod[] }>('/transport-methods')
        .then((res) => {
          const methods = (res as any).data || (Array.isArray(res) ? res : []);
          setTransportMethods(methods);
          if (methods.length > 0) setSelectedTransportId(methods[0].id);
        })
        .catch(() => {});

      // Fetch shop coordinates for cart items that are missing them (backward compat)
      const itemsMissingCoords = items.filter((i) => i.shop_id && (!i.shop_latitude || !i.shop_longitude));
      if (itemsMissingCoords.length > 0) {
        const uniqueProductIds = [...new Set(itemsMissingCoords.map((i) => i.product_id))];
        Promise.all(
          uniqueProductIds.map((pid) => apiGet<any>(`/products/${pid}`).catch(() => null))
        ).then((results) => {
          const coordsMap: Record<string, { lat: number; lng: number }> = {};
          results.forEach((res) => {
            const product = res?.data || res;
            if (product?.shop_id && product?.shops?.latitude && product?.shops?.longitude) {
              coordsMap[product.shop_id] = {
                lat: product.shops.latitude,
                lng: product.shops.longitude,
              };
            }
          });
          // Update items in-place (they are mutable refs from context)
          items.forEach((item) => {
            if (item.shop_id && coordsMap[item.shop_id]) {
              item.shop_latitude = coordsMap[item.shop_id].lat;
              item.shop_longitude = coordsMap[item.shop_id].lng;
            }
          });
        });
      }
    });

    return () => handle.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate derived fees per shop based on distances
  const shopFees = useMemo(() => {
    const method = transportMethods.find((m) => m.id === selectedTransportId);
    const rateKm = Number(method?.rate_per_km) || 0;
    const rateKg = Number(method?.rate_per_kg) || 0;

    const fees: Record<string, number> = {};
    for (const sId in shopDeliveries) {
      const distanceKm = shopDeliveries[sId].distanceKm;
      const weight = items.filter((i) => (i.shop_id || 'unknown') === sId).reduce((sum, i) => sum + i.quantity, 0);
      let fee = 0;
      if (rateKg > 0) fee = weight * rateKg;
      else if (rateKm > 0) fee = distanceKm * rateKm;
      else {
        if (distanceKm <= 5) fee = 3000;
        else if (distanceKm <= 15) fee = 5000;
        else fee = distanceKm * 500;
      }
      fees[sId] = Math.round(fee);
    }
    return fees;
  }, [shopDeliveries, selectedTransportId, transportMethods, items]);

  // Recalculate total delivery fee
  useEffect(() => {
    if (Object.keys(shopDeliveries).length > 0) {
      const totalFee = Object.values(shopFees).reduce((a, b) => a + b, 0);
      setDeliveryFee(totalFee);
    } else {
      setDeliveryFee(0);
    }
  }, [shopFees, shopDeliveries, selectedTransportId, transportMethods, items.length]);

  const handleAddressComplete = async (fullAddress: string, coords?: { lat: number; lng: number }) => {
    if (!coords) return;
    setLatitude(coords.lat);
    setLongitude(coords.lng);

    setIsCalculatingDelivery(true);

    const newDeliveries: Record<string, ShopDeliveryInfo> = {};

    try {
      const shopsData: Record<string, { lat: number; lng: number }> = {};

      // Group items by shop and extract actual shop coordinates from cart items
      items.forEach((item) => {
        const sId = item.shop_id || 'unknown';
        if (!shopsData[sId]) {
          shopsData[sId] = {
            lat: item.shop_latitude || -6.7924, // Use actual vendor coordinates
            lng: item.shop_longitude || 39.2083, // Fallback to Dar es Salaam only if truly missing
          };
        }
      });

      for (const sId in shopsData) {
        const shop = shopsData[sId];
        const res = await apiPost<any>('/maps/distance', {
          destLat: coords.lat,
          destLng: coords.lng,
          originLat: shop.lat,
          originLng: shop.lng,
        });

        if (res && res.distanceKm !== undefined) {
          newDeliveries[sId] = {
            distanceKm: res.distanceKm,
            duration: res.duration || 'Fast',
          };
        }
      }
      setShopDeliveries(newDeliveries);
    } catch (err) {
      logger.error('Failed to calculate delivery', err);
      onError('Could not calculate delivery routes. Please check your connection and try again.');
    } finally {
      setIsCalculatingDelivery(false);
    }
  };

  return {
    transportMethods,
    selectedTransportId,
    setSelectedTransportId,
    shopDeliveries,
    shopFees,
    deliveryFee,
    isCalculatingDelivery,
    latitude,
    longitude,
    setLatitude,
    setLongitude,
    handleAddressComplete,
  };
}
