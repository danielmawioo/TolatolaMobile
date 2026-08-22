import type { Product } from '@/src/types';

function trimStr(v: unknown): string {
  if (v == null) return '';
  const s = String(v).trim();
  return s;
}

/** Resolve web-style `product.shops` (object or array[0]); fall back to `product.shop`. */
export function getProductShopsRecord(product: Product): Record<string, unknown> | null {
  const p = product as Record<string, unknown>;
  const shops = p.shops;
  if (shops && typeof shops === 'object' && !Array.isArray(shops)) {
    return shops as Record<string, unknown>;
  }
  if (Array.isArray(shops) && shops[0] && typeof shops[0] === 'object') {
    return shops[0] as Record<string, unknown>;
  }
  const shop = p.shop;
  if (shop && typeof shop === 'object' && shop !== null && !Array.isArray(shop)) {
    return shop as Record<string, unknown>;
  }
  return null;
}

/**
 * Web ProductCard: [shop.region, shop.district].filter(Boolean).join(", ").
 */
export function getWebProductCardRegionDistrictLabel(product: Product): string | null {
  const s = getProductShopsRecord(product);
  if (!s) return null;
  const parts = [trimStr(s.region), trimStr(s.district)].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Web ProductCard distance chip: only when distance_km is set and not Infinity; "< 1 km" or rounded km.
 */
export function formatProductDistanceKmChip(product: Product): string | null {
  const raw = (product as Record<string, unknown>).distance_km;
  if (raw === undefined || raw === null) return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n === Number.POSITIVE_INFINITY || n === Number.NEGATIVE_INFINITY) {
    return null;
  }
  if (n < 1) return '< 1 km';
  return `${Math.round(n)} km`;
}

/**
 * Location line for cards — matches web (e.g. "Pwani, Kibaha…").
 * Uses product.location, then shop region/district/ward from nested or flat API fields.
 */
function shopRecordParts(s: Record<string, unknown>): string[] {
  return [
    trimStr(s.region),
    trimStr(s.state),
    trimStr(s.province),
    trimStr(s.district),
    trimStr(s.ward),
    trimStr(s.city),
    trimStr(s.town),
    trimStr(s.county),
    trimStr(s.address),
    trimStr(s.location),
  ].filter(Boolean);
}

export function getProductDisplayLocation(product: Product): string | null {
  const webLoc = getWebProductCardRegionDistrictLabel(product);
  if (webLoc) return webLoc;

  const loc = trimStr(product.location);
  if (loc) return loc;

  const p = product as Record<string, unknown>;

  const shop = p.shop;
  if (shop && typeof shop === 'object' && shop !== null) {
    const s = shop as Record<string, unknown>;
    const parts = shopRecordParts(s);
    if (parts.length) {
      return parts.slice(0, 2).join(', ');
    }
  }

  const shops = p.shops;
  if (Array.isArray(shops) && shops[0] && typeof shops[0] === 'object') {
    const s0 = shops[0] as Record<string, unknown>;
    const parts = shopRecordParts(s0);
    if (parts.length) return parts.slice(0, 2).join(', ');
  }

  if (shops && typeof shops === 'object' && !Array.isArray(shops)) {
    const parts = shopRecordParts(shops as Record<string, unknown>);
    if (parts.length) return parts.slice(0, 2).join(', ');
  }

  const flat = [
    trimStr(p.region),
    trimStr(p.district),
    trimStr(p.ward),
    trimStr(p.city),
    trimStr(p.town),
    trimStr(p.shop_region),
    trimStr(p.shop_district),
    trimStr(p.shop_city),
    trimStr(p.pickup_city),
    trimStr(p.seller_city),
    trimStr(p.origin_region),
  ].filter(Boolean);
  if (flat.length) return flat.slice(0, 2).join(', ');

  return null;
}

export function isProductHot(product: Product): boolean {
  const p = product as Record<string, unknown>;
  const h = p.is_hot ?? p.hot ?? p.isHot ?? p.trending;
  if (h === true) return true;
  if (typeof h === 'string' && h.toLowerCase() === 'true') return true;
  if (typeof h === 'number' && h === 1) return true;
  const badge = trimStr(p.badge).toLowerCase();
  return badge === 'hot';
}

export function formatMarketplaceCurrency(raw?: string | null): string {
  const c = trimStr(raw).toUpperCase();
  if (!c || c === 'TSH' || c === 'TZS') return 'TZS';
  return c;
}
