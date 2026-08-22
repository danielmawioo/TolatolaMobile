import { apiGet, apiPost } from '@/src/services/api';
import { AppError } from '@/src/lib/errors';
import { ProductResponseSchema } from '@/src/api/schemas';
import type { CartItem } from '@/src/contexts/CartContext';
import { mapWithConcurrency } from '@/src/lib/mapWithConcurrency';
import {
  assignPerShopDeliveryToLines,
  buildShopDeliveries,
  insuranceFeeFromSubtotalAndDelivery,
  maxShopDistanceKm,
  subtotalFromEnriched,
  totalDeliveryFee,
  type EnrichedCartLine,
  type ShopDelivery,
} from '@/src/lib/checkoutPricing';

export type TransportMethod = {
  id: string;
  name?: string | null;
  rate_per_km?: number | string | null;
  rate_per_kg?: number | string | null;
  is_available?: boolean;
};

function unwrapShopApiResponse(res: unknown): unknown {
  if (res == null || typeof res !== 'object') return res;
  const o = res as Record<string, unknown>;
  if (o.shop != null && typeof o.shop === 'object') return o.shop;
  if (o.data != null && typeof o.data === 'object') return o.data;
  return res;
}

/** Lat/lng from GET /shops/:id (wrapped or bare). */
export function parseShopCoordsFromApi(res: unknown): { lat: number; lng: number } | null {
  const inner = unwrapShopApiResponse(res);
  if (inner == null || typeof inner !== 'object') return null;
  const o = inner as Record<string, unknown>;
  const lat = o.latitude ?? o.lat;
  const lng = o.longitude ?? o.lng;
  const la = typeof lat === 'number' ? lat : Number(lat);
  const ln = typeof lng === 'number' ? lng : Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return { lat: la, lng: ln };
}

function productWeightKgPerUnit(p: Record<string, unknown>): number {
  const w = p.weight_kg ?? p.weightKg ?? p.weight;
  const n = Number(w);
  if (Number.isFinite(n) && n > 0) return n;
  return 1;
}

export async function fetchShopCoordsForCheckout(
  shopId: string,
  accessToken: string | null | undefined
): Promise<{ lat: number; lng: number } | null> {
  const raw = await apiGet<unknown>(`/shops/${shopId}`, accessToken ?? undefined);
  return parseShopCoordsFromApi(raw);
}

/**
 * Resolves shop_id and per-unit weight for each cart row (one GET /products/:id per distinct product).
 * Fetches all distinct products in parallel to reduce checkout latency.
 */
export async function enrichCartItemsForCheckout(
  items: CartItem[],
  accessToken: string | null | undefined
): Promise<EnrichedCartLine[]> {
  if (items.length === 0) return [];
  const uniqueIds = [...new Set(items.map((i) => i.product_id))];
  /** Cap in-flight GETs so large carts do not overwhelm the device or server. */
  const PRODUCT_FETCH_CONCURRENCY = 5;
  const tok = accessToken ?? undefined;
  const payloads = await mapWithConcurrency(uniqueIds, PRODUCT_FETCH_CONCURRENCY, async (productId) => {
    const raw = await apiGet<unknown>(`/products/${productId}`, tok);
    const parsed = ProductResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError(
        `Malformed product response for "${productId}": ${parsed.error.issues[0]?.message ?? 'invalid shape'}`,
        'validation'
      );
    }
    return { productId, p: parsed.data as Record<string, unknown> };
  });

  const productMeta = new Map<string, { shop_id: string; weight_kg_per_unit: number }>();
  for (const { productId, p } of payloads) {
    const line = items.find((i) => i.product_id === productId);
    const shopFromProduct = String(p.shop_id ?? '').trim();
    const shopId = String(line?.shop_id || '').trim() || shopFromProduct;
    if (!shopId) {
      throw new Error(
        `Missing shop for "${line?.name ?? 'item'}". Remove it from the cart and add it again from the product page.`
      );
    }
    productMeta.set(productId, {
      shop_id: shopId,
      weight_kg_per_unit: productWeightKgPerUnit(p),
    });
  }

  return items.map((item) => {
    const meta = productMeta.get(item.product_id)!;
    const shopId = String(item.shop_id || '').trim() || meta.shop_id;
    return {
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
      shop_id: shopId,
      weight_kg_per_unit: meta.weight_kg_per_unit,
    };
  });
}

export type CheckoutQuote = {
  lineItems: Array<{
    product_id: string;
    quantity: number;
    price: number;
    shop_id: string;
    delivery_fee: number;
    delivery_distance_km: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  insuranceFee: number;
  platformTotal: number;
  displayDistanceKm: number;
  transportMethodId: string | null;
  shopDeliveries: Record<string, ShopDelivery>;
};

export async function getCheckoutQuote(
  items: CartItem[],
  accessToken: string | null | undefined,
  dropoffCoords: { lat: number; lng: number } | null,
  deliveryOption: string,
  transportMethods: TransportMethod[]
): Promise<CheckoutQuote> {
  const enriched = await enrichCartItemsForCheckout(items, accessToken);
  const subtotal = subtotalFromEnriched(enriched);
  const shopIds = [...new Set(enriched.map((e) => e.shop_id))];
  const SHOP_COORDS_CONCURRENCY = 5;
  const shopCoordPairs = await mapWithConcurrency(shopIds, SHOP_COORDS_CONCURRENCY, async (id) => {
    const c = await fetchShopCoordsForCheckout(id, accessToken);
    return { id, c };
  });
  const shopCoordsById: Record<string, { lat: number; lng: number } | null> = {};
  for (const { id, c } of shopCoordPairs) {
    shopCoordsById[id] = c;
  }
  const transportMethodId = resolveTransportMethodId(transportMethods, deliveryOption);
  const method = transportMethods.find((m) => m.id === transportMethodId);
  const shopDeliveries = buildShopDeliveries(enriched, shopCoordsById, dropoffCoords, method);
  const deliveryFee = totalDeliveryFee(shopDeliveries);
  const insuranceFee = insuranceFeeFromSubtotalAndDelivery(subtotal, deliveryFee);
  const platformTotal = Math.round(subtotal + deliveryFee + insuranceFee);
  const lineItems = assignPerShopDeliveryToLines(enriched, shopDeliveries);
  return {
    lineItems,
    subtotal,
    deliveryFee,
    insuranceFee,
    platformTotal,
    displayDistanceKm: maxShopDistanceKm(shopDeliveries),
    transportMethodId,
    shopDeliveries,
  };
}

export async function fetchTransportMethods(accessToken?: string | null): Promise<TransportMethod[]> {
  const res = await apiGet<{ data?: TransportMethod[] }>('/transport-methods', accessToken ?? undefined);
  return Array.isArray(res.data) ? res.data : [];
}

export function resolveTransportMethodId(
  methods: TransportMethod[],
  deliveryOptionId: string
): string | null {
  const nm = (s?: string | null) => (s || '').toLowerCase();
  const find = (fn: (m: TransportMethod) => boolean) => methods.find(fn)?.id ?? null;

  if (deliveryOptionId === 'motorcycle') {
    return find((m) => {
      const n = nm(m.name);
      return n.includes('motor') || n.includes('boda') || n.includes('bike') || n.includes('pikipiki');
    });
  }
  if (deliveryOptionId === 'bajaj') {
    return find((m) => {
      const n = nm(m.name);
      return n.includes('bajaj') || n.includes('tuk') || n.includes('tuktuk') || n.includes('rickshaw');
    });
  }
  if (deliveryOptionId === 'car') {
    return find((m) => {
      const n = nm(m.name);
      return (
        (n.includes('car') || n.includes('sedan') || n.includes('van') || n.includes('medium')) &&
        !n.includes('truck') &&
        !n.includes('trailer')
      );
    });
  }
  if (deliveryOptionId === 'truck') {
    return find((m) => {
      const n = nm(m.name);
      return (
        (n.includes('truck') || n.includes('lorry') || n.includes('cargo') || n.includes('lori')) &&
        !n.includes('semi') &&
        !n.includes('trailer')
      );
    });
  }
  if (deliveryOptionId === 'semi_trailer') {
    return find((m) => {
      const n = nm(m.name);
      return n.includes('semi') || n.includes('trailer') || n.includes('articulated') || n.includes('container');
    });
  }
  return find((m) => {
    const n = nm(m.name);
    return n.includes('car') || n.includes('sedan') || n.includes('van');
  });
}

export async function resolveCartLineItems(
  items: CartItem[],
  accessToken: string | null | undefined
): Promise<Array<{ product_id: string; quantity: number; price: number; shop_id: string }>> {
  const enriched = await enrichCartItemsForCheckout(items, accessToken);
  return enriched.map(({ product_id, quantity, price, shop_id }) => ({
    product_id,
    quantity,
    price,
    shop_id,
  }));
}

export function mapUiPaymentMethodToApi(ui: string): string {
  switch (ui) {
    case 'cod':
      return 'cash-on-delivery';
    case 'mpesa':
      return 'm-pesa';
    case 'tigopesa':
      return 'tigo-pesa';
    case 'airtel_money':
      return 'airtel-money';
    case 'halopesa':
      return 'halopesa';
    case 'card':
      return 'visa';
    default:
      return ui;
  }
}

export async function createOrder(
  accessToken: string,
  payload: {
    items: Array<{
      product_id: string;
      quantity: number;
      price: number;
      shop_id: string;
      delivery_fee?: number;
      delivery_distance_km?: number;
    }>;
    shippingAddress: Record<string, unknown>;
    /** Grand total charged (items + delivery + insurance). */
    totalAmount: number;
    paymentMethod: string;
    transportMethodId?: string | null;
    deliveryFee?: number;
    insuranceFee?: number;
  }
): Promise<{ id: string; order_number?: string; tracking_code?: string | null; status?: string }> {
  const res = await apiPost<{ success?: boolean; order: Record<string, unknown> }>(
    '/orders',
    {
      items: payload.items,
      shippingAddress: payload.shippingAddress,
      totalAmount: payload.totalAmount,
      paymentMethod: payload.paymentMethod,
      transportMethodId: payload.transportMethodId ?? null,
      deliveryFee: payload.deliveryFee ?? 0,
      insuranceFee: payload.insuranceFee ?? 0,
    },
    accessToken
  );
  const order = res.order;
  if (!order || typeof order.id !== 'string') {
    throw new Error('Invalid order response from server');
  }
  return {
    id: order.id as string,
    order_number: order.order_number as string | undefined,
    tracking_code: (order.tracking_code as string | null | undefined) ?? null,
    status: order.status as string | undefined,
  };
}

function unwrapCreatedOrder(res: unknown): {
  id: string;
  order_number?: string;
  tracking_code?: string | null;
  status?: string;
} | null {
  if (!res || typeof res !== 'object') return null;
  const o = res as Record<string, unknown>;
  const order = (o.order ?? o.data) as Record<string, unknown> | undefined;
  const doc = order && typeof order === 'object' ? order : o;
  const id = doc.id != null ? String(doc.id) : '';
  if (!id) return null;
  return {
    id,
    order_number: doc.order_number as string | undefined,
    tracking_code: (doc.tracking_code as string | null | undefined) ?? null,
    status: doc.status as string | undefined,
  };
}

/**
 * Guest checkout: tries several backend paths (no Bearer token). If none exist, throws a clear error.
 */
export async function createGuestOrder(payload: {
  items: Array<{
    product_id: string;
    quantity: number;
    price: number;
    shop_id: string;
    delivery_fee?: number;
    delivery_distance_km?: number;
  }>;
  shippingAddress: Record<string, unknown>;
  totalAmount: number;
  paymentMethod: string;
  transportMethodId?: string | null;
  deliveryFee?: number;
  insuranceFee?: number;
  guestEmail: string;
  guestPhone: string;
  guestName: string;
}): Promise<{ id: string; order_number?: string; tracking_code?: string | null; status?: string }> {
  const body: Record<string, unknown> = {
    items: payload.items,
    shippingAddress: {
      ...payload.shippingAddress,
      email: payload.guestEmail,
      guest_email: payload.guestEmail,
      guest_phone: payload.guestPhone,
      guest_name: payload.guestName,
    },
    totalAmount: payload.totalAmount,
    paymentMethod: payload.paymentMethod,
    transportMethodId: payload.transportMethodId ?? null,
    deliveryFee: payload.deliveryFee ?? 0,
    insuranceFee: payload.insuranceFee ?? 0,
    guest_email: payload.guestEmail,
    guest_phone: payload.guestPhone,
    guest_name: payload.guestName,
    is_guest: true,
  };
  const paths = ['/orders/guest', '/guest/orders', '/checkout/guest-order', '/orders'];
  let lastErr: unknown;
  for (const path of paths) {
    try {
      const raw = await apiPost<unknown>(path, body, undefined);
      const parsed = unwrapCreatedOrder(raw);
      if (parsed) return parsed;
    } catch (e) {
      const st = (e as { status?: number }).status;
      lastErr = e;
      if (st === 404 || st === 405 || st === 401) continue;
      throw e;
    }
  }
  throw new Error(
    lastErr instanceof Error
      ? lastErr.message
      : 'Guest checkout is not enabled on the server. Please create an account to place an order.'
  );
}
