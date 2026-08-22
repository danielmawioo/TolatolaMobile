/**
 * Vendor shop payloads from GET /vendor/shop (and /vendors fallbacks) vary by backend:
 * top-level id vs shop_id, numeric ids, and { data: { ... } } / { shop: { ... } } wrappers.
 * Marketplace products use shop_id from GET /products; the vendor dashboard must resolve the same id.
 */

import { apiGet } from '@/src/services/api';
import type { Order, Product } from '@/src/types';

export function coerceRecordId(v: unknown): string | undefined {
  if (typeof v === 'string') {
    const t = v.trim();
    return t.length > 0 ? t : undefined;
  }
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return undefined;
}

export function normalizeVendorShopPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const data = o.data;
  if (data != null && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  const nestedShop = o.shop;
  if (nestedShop != null && typeof nestedShop === 'object' && !Array.isArray(nestedShop)) {
    return nestedShop as Record<string, unknown>;
  }
  return o;
}

export function extractVendorShopId(raw: unknown): string | undefined {
  const base = normalizeVendorShopPayload(raw);
  if (!base) return undefined;
  return (
    coerceRecordId(base.id) ??
    coerceRecordId(base.shop_id) ??
    coerceRecordId(base.shopId) ??
    coerceRecordId((base as { store_id?: unknown }).store_id)
  );
}

export function vendorShopHasIdentifyingId(raw: unknown): boolean {
  return Boolean(extractVendorShopId(raw));
}

export function shopIdFromProfileUser(user: Record<string, unknown> | null | undefined): string | undefined {
  if (!user) return undefined;
  return (
    coerceRecordId(user.shop_id) ??
    coerceRecordId(user.shopId) ??
    coerceRecordId(user.vendor_shop_id) ??
    coerceRecordId((user as { vendorShopId?: unknown }).vendorShopId)
  );
}

function extractArrayFromPayload(raw: unknown, nestedKeys: string[]): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;
  for (const k of nestedKeys) {
    const v = o[k];
    if (Array.isArray(v)) return v;
  }
  const data = o.data;
  if (Array.isArray(data)) return data;
  if (data != null && typeof data === 'object' && !Array.isArray(data)) {
    const inner = data as Record<string, unknown>;
    for (const k of nestedKeys) {
      const v = inner[k];
      if (Array.isArray(v)) return v;
    }
    if (Array.isArray(inner.data)) return inner.data;
  }
  return [];
}

function withStringId<T extends { id: string }>(x: unknown): T | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const idRaw = o.id;
  const id =
    typeof idRaw === 'string'
      ? idRaw.trim()
      : typeof idRaw === 'number' && Number.isFinite(idRaw)
        ? String(idRaw)
        : '';
  if (!id) return null;
  return { ...o, id } as T;
}

export function parseProductListResponse(raw: unknown): Product[] {
  const arr = extractArrayFromPayload(raw, ['data', 'products', 'items', 'results']);
  return arr.map((x) => withStringId<Product>(x)).filter((x): x is Product => x != null);
}

export function parseOrderListResponse(raw: unknown): Order[] {
  const arr = extractArrayFromPayload(raw, ['data', 'orders', 'items', 'results']);
  return arr.map((x) => withStringId<Order>(x)).filter((x): x is Order => x != null);
}

function isMissingOrWrongShopError(e: unknown): boolean {
  const st = (e as { status?: number }).status;
  return st === 404 || st === 400;
}

export async function fetchVendorShopProducts(token: string, shopId: string): Promise<Product[]> {
  try {
    const raw = await apiGet<unknown>(`/shops/${shopId}/products`, token);
    return parseProductListResponse(raw);
  } catch (e) {
    if (!isMissingOrWrongShopError(e)) throw e;
  }
  for (const path of ['/vendor/products', '/vendor/shop/products']) {
    try {
      const raw = await apiGet<unknown>(path, token);
      return parseProductListResponse(raw);
    } catch {
      /* try next */
    }
  }
  return [];
}

export async function fetchVendorShopOrders(token: string, shopId: string): Promise<Order[]> {
  try {
    const raw = await apiGet<unknown>(`/shops/${shopId}/orders`, token);
    return parseOrderListResponse(raw);
  } catch (e) {
    if (!isMissingOrWrongShopError(e)) throw e;
  }
  for (const path of ['/vendor/orders', '/vendor/shop/orders']) {
    try {
      const raw = await apiGet<unknown>(path, token);
      return parseOrderListResponse(raw);
    } catch {
      /* try next */
    }
  }
  return [];
}
