import type { Product } from '@/src/types';

function salesCount(p: Product): number {
  const raw =
    (p as Record<string, unknown>).sales_count ??
    (p as Record<string, unknown>).sold_count ??
    (p as Record<string, unknown>).total_sold;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? 0), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function categoryKey(p: Product): string {
  const raw =
    (p as Record<string, unknown>).category_id ??
    (p as Record<string, unknown>).category ??
    (p as Record<string, unknown>).category_slug;
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  return s || 'uncategorized';
}

/**
 * Spec: top sellers per category with daily refresh — the API should expose fresh `sales_count`.
 * Client-side we round-robin the best-selling product from each category, then top up by global sales.
 */
export function buildPopularProducts(products: Product[], limit = 12): Product[] {
  if (products.length === 0) return [];
  const byCat = new Map<string, Product[]>();
  for (const p of products) {
    const k = categoryKey(p);
    if (!byCat.has(k)) byCat.set(k, []);
    byCat.get(k)!.push(p);
  }
  for (const arr of byCat.values()) {
    arr.sort((a, b) => {
      const ds = salesCount(b) - salesCount(a);
      if (ds !== 0) return ds;
      return (Number(b.price) || 0) - (Number(a.price) || 0);
    });
  }
  const cats = [...byCat.keys()].sort();
  const out: Product[] = [];
  const seen = new Set<string>();
  let round = 0;
  while (out.length < limit && seen.size < products.length) {
    let anyAdded = false;
    for (const ck of cats) {
      const arr = byCat.get(ck)!;
      if (round >= arr.length) continue;
      const p = arr[round];
      if (!seen.has(p.id)) {
        seen.add(p.id);
        out.push(p);
        anyAdded = true;
        if (out.length >= limit) break;
      }
    }
    if (!anyAdded) break;
    round += 1;
  }
  if (out.length < limit) {
    const rest = [...products].sort((a, b) => salesCount(b) - salesCount(a));
    for (const p of rest) {
      if (out.length >= limit) break;
      if (!seen.has(p.id)) {
        seen.add(p.id);
        out.push(p);
      }
    }
  }
  return out;
}
