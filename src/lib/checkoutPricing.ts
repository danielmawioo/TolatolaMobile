/**
 * Checkout pricing aligned with web: per-shop distance (shop → drop-off),
 * transport method rate_per_km / rate_per_kg (with distance fallback),
 * insurance = 1.5% × (subtotal + delivery).
 */

/** Subset of API transport method fields used for fee calculation. */
export type TransportMethodRates = {
  rate_per_km?: number | string | null;
  rate_per_kg?: number | string | null;
  is_available?: boolean;
};

/** Dar es Salaam hub — used when shop coordinates are missing (matches web BASE_LOCATION fallback). */
export const BASE_LOCATION = { lat: -6.792354, lng: 39.208328 };

/** When the user has no Places pin, use this distance (km) for every shop (urban average). */
export const DEFAULT_DISTANCE_KM = 12;

/** Haversine road-ish factor for shop → customer when Distance Matrix is not used on device. */
const ROAD_FACTOR_SHOP_TO_CUSTOMER = 1.3;

const INSURANCE_RATE = 0.015;

export type TransportModeId =
  | 'motorcycle'
  | 'bajaj'
  | 'car'
  | 'truck'
  | 'semi_trailer';

export type EnrichedCartLine = {
  product_id: string;
  quantity: number;
  price: number;
  shop_id: string;
  weight_kg_per_unit: number;
};

export type ShopDelivery = {
  shopId: string;
  distanceKm: number;
  deliveryFee: number;
  weightKg: number;
};

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

/**
 * Distance from shop to customer drop-off (km), rounded to 0.1 km.
 * Missing shop coords → measure from BASE_LOCATION to drop-off (same idea as web fallback).
 * Missing drop-off → flat DEFAULT_DISTANCE_KM per shop.
 */
export function distanceKmShopToDropoff(
  shopCoords: { lat: number; lng: number } | null,
  dropoff: { lat: number; lng: number } | null
): number {
  if (!dropoff) {
    return DEFAULT_DISTANCE_KM;
  }
  const origin = shopCoords ?? BASE_LOCATION;
  const straight = haversineKm(origin, dropoff);
  const km = straight * ROAD_FACTOR_SHOP_TO_CUSTOMER;
  return Math.max(0.1, Math.round(km * 10) / 10);
}

/**
 * Mirrors web checkout-content calculateFee: rate_per_kg takes precedence, then rate_per_km,
 * else tiered distance fallback.
 */
export function calculateTransportFee(
  method: TransportMethodRates | undefined,
  distanceKm: number,
  weightKg: number,
  isAvailable: boolean
): number {
  if (!isAvailable) return 0;
  if (distanceKm < 0.1) return 0;
  const rateKm = Number(method?.rate_per_km) || 0;
  const rateKg = Number(method?.rate_per_kg) || 0;
  let fee = 0;
  if (rateKg > 0) {
    fee = weightKg * rateKg;
  } else if (rateKm > 0) {
    fee = distanceKm * rateKm;
  } else {
    if (distanceKm <= 5) fee = 3000;
    else if (distanceKm <= 15) fee = 5000;
    else fee = distanceKm * 500;
  }
  return Math.round(fee);
}

function transportMethodIsAvailable(method: TransportMethodRates | undefined): boolean {
  if (method == null) return true;
  return method.is_available !== false;
}

export function buildShopDeliveries(
  lines: EnrichedCartLine[],
  shopCoordsById: Record<string, { lat: number; lng: number } | null>,
  dropoff: { lat: number; lng: number } | null,
  method: TransportMethodRates | undefined
): Record<string, ShopDelivery> {
  const weightByShop = new Map<string, number>();
  for (const line of lines) {
    const add = line.weight_kg_per_unit * line.quantity;
    weightByShop.set(line.shop_id, (weightByShop.get(line.shop_id) ?? 0) + add);
  }

  const available = transportMethodIsAvailable(method);
  const out: Record<string, ShopDelivery> = {};
  for (const [shopId, weightKg] of weightByShop) {
    const coords = shopCoordsById[shopId] ?? null;
    const distanceKm = distanceKmShopToDropoff(coords, dropoff);
    const deliveryFee = calculateTransportFee(method, distanceKm, weightKg, available);
    out[shopId] = { shopId, distanceKm, deliveryFee, weightKg };
  }
  return out;
}

export function insuranceFeeFromSubtotalAndDelivery(subtotal: number, deliveryFee: number): number {
  return Math.round((subtotal + deliveryFee) * INSURANCE_RATE);
}

export type OrderLineItemWithDelivery = {
  product_id: string;
  quantity: number;
  price: number;
  shop_id: string;
  delivery_fee: number;
  delivery_distance_km: number;
};

/** Full per-shop fee and distance on the first cart line for each shop only (avoids double counting). */
export function assignPerShopDeliveryToLines(
  lines: EnrichedCartLine[],
  shopDeliveries: Record<string, ShopDelivery>
): OrderLineItemWithDelivery[] {
  const assigned = new Set<string>();
  return lines.map((line) => {
    const d = shopDeliveries[line.shop_id];
    const first = !assigned.has(line.shop_id);
    if (first) assigned.add(line.shop_id);
    return {
      product_id: line.product_id,
      quantity: line.quantity,
      price: line.price,
      shop_id: line.shop_id,
      delivery_fee: first ? d.deliveryFee : 0,
      delivery_distance_km: first ? d.distanceKm : 0,
    };
  });
}

export function subtotalFromEnriched(lines: EnrichedCartLine[]): number {
  return lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
}

export function totalDeliveryFee(shopDeliveries: Record<string, ShopDelivery>): number {
  return Object.values(shopDeliveries).reduce((s, d) => s + d.deliveryFee, 0);
}

export function maxShopDistanceKm(shopDeliveries: Record<string, ShopDelivery>): number {
  const vals = Object.values(shopDeliveries).map((d) => d.distanceKm);
  return vals.length ? Math.max(...vals) : 0;
}
