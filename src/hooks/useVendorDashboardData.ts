import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { apiGet } from '@/src/services/api';
import { logger } from '@/src/lib/logger';
import { captureException } from '@/src/lib/errorTracking';
import type { Order, Product, Shop, Vendor } from '@/src/types';

/** Vendor shop, extended with the location fields the vendor dashboard reads. */
export type VendorShop = Shop & {
  region?: string;
  district?: string;
  ward?: string;
};

/** Vendor product, extended with the moderation status shown in the products tab. */
export type VendorProduct = Product & {
  status?: string;
};

export function useVendorDashboardData(accessToken: string | null | undefined) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [shop, setShop] = useState<VendorShop | null>(null);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!accessToken) return;
      if (!silent) setLoading(true);
      try {
        // Fetch vendor profile
        const vendorRes = await apiGet<{ data: Vendor[] }>('/vendors', accessToken);
        const vendorData = vendorRes?.data?.[0];
        setVendor(vendorData || null);

        // Fetch shop details
        const shopRes = await apiGet<{ shops?: VendorShop[]; data?: VendorShop[] }>('/vendor/shop', accessToken);
        const actualShop = shopRes?.shops?.[0] || shopRes?.data?.[0] || null;
        setShop(actualShop);

        if (actualShop?.id) {
          // Fetch products and orders in parallel
          const [productsData, ordersData] = await Promise.all([
            apiGet<{ data?: VendorProduct[] } | VendorProduct[]>(`/shops/${actualShop.id}/products`, accessToken).catch(() => ({ data: [] })),
            apiGet<{ orders?: Order[] } | Order[]>(`/shops/${actualShop.id}/orders`, accessToken).catch(() => ({ orders: [] })),
          ]);
          const productsList = Array.isArray(productsData)
            ? productsData
            : Array.isArray(productsData?.data)
              ? productsData.data
              : [];
          setProducts(productsList);

          const ordersList = Array.isArray(ordersData)
            ? ordersData
            : ordersData?.orders || [];
          setOrders(ordersList);
        }

        // Fetch notification count
        try {
          const notifRes = await apiGet<{ unread_count?: number }>('/notifications/unread-count', accessToken);
          setUnreadNotifs(notifRes?.unread_count || 0);
        } catch (err) {
          // Non-critical: dashboard should still render without the notification badge.
          // `err` may be an AppError (see src/lib/errors.ts) exposing `.kind`/`.status`
          // for future handling, but we simply log and move on for now.
          logger.error('[VENDOR DASHBOARD] Failed to fetch unread notification count', err);
          captureException(err, { hook: 'useVendorDashboardData' });
        }
      } catch (error) {
        logger.error('[VENDOR DASHBOARD] Fetch Error:', error);
        captureException(error, { hook: 'useVendorDashboardData' });
      } finally {
        setLoading(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh data when screen gains focus (e.g. after editing product/shop)
  useFocusEffect(
    useCallback(() => {
      fetchData(true);
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  }, [fetchData]);

  return {
    loading,
    refreshing,
    vendor,
    setVendor,
    shop,
    products,
    setProducts,
    orders,
    unreadNotifs,
    fetchData,
    onRefresh,
  };
}
