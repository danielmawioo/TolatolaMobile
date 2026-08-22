import { mapWithConcurrency } from '@/src/lib/mapWithConcurrency';

describe('mapWithConcurrency', () => {
  it('returns an empty array for empty input without calling the mapper', async () => {
    const mapper = jest.fn();
    const result = await mapWithConcurrency([], 3, mapper);
    expect(result).toEqual([]);
    expect(mapper).not.toHaveBeenCalled();
  });

  it('preserves result order regardless of resolution order', async () => {
    const delays = [30, 10, 20];
    const result = await mapWithConcurrency(delays, 3, (ms) => new Promise((resolve) => setTimeout(() => resolve(ms), ms)));
    expect(result).toEqual([30, 10, 20]);
  });

  it('never runs more than `concurrency` mappers at once', async () => {
    let active = 0;
    let maxActive = 0;
    const items = Array.from({ length: 10 }, (_, i) => i);

    await mapWithConcurrency(items, 3, async (i) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return i;
    });

    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it('caps concurrency at the item count when concurrency exceeds it', async () => {
    const mapper = jest.fn(async (i: number) => i * 2);
    const result = await mapWithConcurrency([1, 2], 10, mapper);
    expect(result).toEqual([2, 4]);
  });
});
