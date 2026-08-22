import type { Product } from '@/src/types';
import { haversineKm } from '@/src/lib/checkoutPricing';
import { getProductDisplayLocation, getProductShopsRecord } from '@/src/lib/productDisplay';

export type BuyerProximityInput = {
  coords: { lat: number; lng: number } | null;
  /** Free-text address for matching region/district tokens when GPS is missing */
  addressHint: string | null;
};

function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Shop / pickup coordinates when API embeds them on the product or nested shop. */
export function getShopCoordsFromProduct(product: Product): { lat: number; lng: number } | null {
  const p = product as Record<string, unknown>;
  const shopsRec = getProductShopsRecord(product);
  if (shopsRec) {
    const lat = num(shopsRec.latitude ?? shopsRec.lat);
    const lng = num(shopsRec.longitude ?? shopsRec.lng);
    if (lat != null && lng != null) return { lat, lng };
  }
  const shop = p.shop;
  if (shop && typeof shop === 'object' && shop !== null) {
    const s = shop as Record<string, unknown>;
    const lat = num(s.latitude ?? s.lat);
    const lng = num(s.longitude ?? s.lng);
    if (lat != null && lng != null) return { lat, lng };
  }
  const lat = num(p.shop_latitude ?? p.latitude);
  const lng = num(p.shop_longitude ?? p.longitude);
  if (lat != null && lng != null) return { lat, lng };
  return null;
}

function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s,]/gi, ' ')
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

/**
 * 0–1 score: overlap between tokens in the buyer’s saved address and product location labels.
 */
export function textLocationMatchScore(product: Product, buyerAddressHint: string): number {
  const buyerTokens = new Set(normalizeTokens(buyerAddressHint));
  if (buyerTokens.size === 0) return 0;
  const loc = getProductDisplayLocation(product);
  const prodTokens = new Set(normalizeTokens(`${loc ?? ''}`));
  if (prodTokens.size === 0) return 0;
  let hit = 0;
  for (const t of buyerTokens) {
    if (prodTokens.has(t)) {
      hit++;
      continue;
    }
    for (const pt of prodTokens) {
      if (pt.includes(t) || t.includes(pt)) {
        hit++;
        break;
      }
    }
  }
  return hit / buyerTokens.size;
}

/**
 * Sort key: lower = show first. Geo distance (km) when both ends have coords;
 * otherwise boosted text match in 20k–25k band; unknown = tail.
 */
export function productProximitySortWeight(product: Product, buyer: BuyerProximityInput): number {
  const dkRaw = (product as Record<string, unknown>).distance_km;
  if (dkRaw !== undefined && dkRaw !== null) {
    const dn = typeof dkRaw === 'number' ? dkRaw : Number(dkRaw);
    if (
      Number.isFinite(dn) &&
      dn !== Number.POSITIVE_INFINITY &&
      dn !== Number.NEGATIVE_INFINITY
    ) {
      return dn;
    }
  }
  if (buyer.coords) {
    const sc = getShopCoordsFromProduct(product);
    if (sc) return haversineKm(buyer.coords, sc);
  }
  const hint = buyer.addressHint?.trim();
  if (hint) {
    const score = textLocationMatchScore(product, hint);
    if (score > 0.06) return 25_000 - score * 20_000;
  }
  return 80_000;
}

export function sortProductsByBuyerProximity(products: Product[], buyer: BuyerProximityInput): Product[] {
  if (!buyer.coords && !buyer.addressHint?.trim()) return products;
  return products
    .map((p, index) => ({ p, index, w: productProximitySortWeight(p, buyer) }))
    .sort((a, b) => {
      if (a.w !== b.w) return a.w - b.w;
      return a.index - b.index;
    })
    .map((x) => x.p);
}

export function hasBuyerProximityPreference(buyer: BuyerProximityInput): boolean {
  return !!(buyer.coords || buyer.addressHint?.trim());
}
