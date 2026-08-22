import type { Product } from '@/src/types';

/**
 * Resolve a shop/vendor/store id from a product-like object.
 * Handles multiple backend shapes used across web and mobile.
 */
export function getShopIdForNavigation(p: Product | Record<string, unknown>): string | undefined {
  const anyP = p as any;
  const shopsRel = anyP.shops;
  const shopsId =
    shopsRel && typeof shopsRel === 'object'
      ? Array.isArray(shopsRel)
        ? shopsRel[0]?.id
        : shopsRel.id
      : undefined;

  const raw =
    anyP.shop_id ??
    shopsId ??
    anyP.vendor_id ??
    anyP.store_id ??
    (anyP.shop && typeof anyP.shop === 'object' ? anyP.shop.id : undefined);

  if (!raw) return undefined;
  const s = String(raw).trim();
  return s || undefined;
}

