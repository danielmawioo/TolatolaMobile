/**
 * Map items to promises with at most `concurrency` in flight (pool pattern).
 * Preserves result order. Use for many parallel GETs without opening unbounded connections.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const limit = Math.max(1, Math.floor(concurrency));
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await mapper(items[i]!, i);
    }
  }

  const pool = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: pool }, () => worker()));
  return results;
}
