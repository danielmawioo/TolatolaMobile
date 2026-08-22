/**
 * Match Tolatola web shop list: GET /products (or shop-scoped lists) with userLat, userLng,
 * and sortBy=closest so the API can attach distance_km and sort by proximity.
 */

export type ProductsQueryCoords = { lat: number; lng: number };

export function withProductsProximityQuery(
  path: string,
  coords: ProductsQueryCoords | null | undefined,
  options?: { sortBy?: string | null }
): string {
  if (
    coords == null ||
    typeof coords.lat !== 'number' ||
    typeof coords.lng !== 'number' ||
    !Number.isFinite(coords.lat) ||
    !Number.isFinite(coords.lng)
  ) {
    return path;
  }
  const params = new URLSearchParams();
  params.set('userLat', String(coords.lat));
  params.set('userLng', String(coords.lng));
  const sort = options?.sortBy;
  if (sort != null && String(sort).trim() !== '') {
    params.set('sortBy', String(sort).trim());
  } else {
    params.set('sortBy', 'closest');
  }
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}${params.toString()}`;
}
