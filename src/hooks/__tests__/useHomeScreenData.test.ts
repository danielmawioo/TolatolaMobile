import { renderHook, waitFor } from '@testing-library/react-native';
import { useHomeScreenData, sortTopLevelCategories } from '@/src/hooks/useHomeScreenData';
import { apiGet } from '@/src/services/api';
import { getCachedData } from '@/src/services/cache';

jest.mock('@/src/services/api', () => ({
  apiGet: jest.fn(),
}));

jest.mock('@/src/services/cache', () => ({
  CACHE_KEYS: {
    CATEGORIES: 'tolatola_cache_categories',
    HOME_PRODUCTS: 'tolatola_cache_home_products',
    HOME_PROMOTIONS: 'tolatola_cache_home_promotions',
  },
  getCachedData: jest.fn().mockResolvedValue(null),
  setCachedData: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

const mockedApiGet = apiGet as jest.Mock;

describe('sortTopLevelCategories', () => {
  it('filters out sub-categories and sorts "services" to the end', () => {
    const categories = [
      { id: '1', name: 'Services', slug: 'services' },
      { id: '2', name: 'Electronics', slug: 'electronics' },
      { id: '3', name: 'Sub Item', slug: 'sub-item', parent_id: '2' },
      { id: '4', name: 'Fashion', slug: 'fashion' },
    ];

    const result = sortTopLevelCategories(categories);

    expect(result.map((c) => c.id)).toEqual(['2', '4', '1']);
  });
});

describe('useHomeScreenData', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches categories, promotions and products for a guest (unauthenticated) user', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/categories') return Promise.resolve({ data: [{ id: 'c1', name: 'Cat 1' }] });
      if (path === '/promotions') return Promise.resolve({ data: [{ id: 'p1' }] });
      if (path === '/products') return Promise.resolve({ data: [{ id: 'prod1', name: 'Widget' }] });
      return Promise.resolve(null);
    });

    const { result } = renderHook(() =>
      useHomeScreenData({ isAuthenticated: false, accessToken: null })
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.categories).toEqual([{ id: 'c1', name: 'Cat 1' }]);
    expect(result.current.promotions).toEqual([{ id: 'p1' }]);
    expect(result.current.products).toEqual([{ id: 'prod1', name: 'Widget' }]);
    expect(result.current.isOffline).toBe(false);
    expect(mockedApiGet).toHaveBeenCalledWith('/products');
  });

  it('splits matched vs. other products and captures the supply-chain notification for an authenticated user', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/categories') return Promise.resolve({ data: [] });
      if (path === '/promotions') return Promise.resolve({ data: [] });
      if (path.startsWith('/products/for-you')) {
        return Promise.resolve({
          data: {
            matched: [{ id: 'm1', name: 'Matched' }],
            others: [{ id: 'o1', name: 'Other' }],
          },
        });
      }
      if (path === '/notifications/supply-chain') {
        return Promise.resolve({ data: [{ id: 'n1', title: 'Price drop', type: 'price_change' }] });
      }
      return Promise.resolve(null);
    });

    const { result } = renderHook(() =>
      useHomeScreenData({ isAuthenticated: true, accessToken: 'token-abc' })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.scProducts).toEqual({
      matched: [{ id: 'm1', name: 'Matched' }],
      others: [{ id: 'o1', name: 'Other' }],
    });
    expect(result.current.products).toEqual([
      { id: 'm1', name: 'Matched' },
      { id: 'o1', name: 'Other' },
    ]);
    expect(result.current.scNotification).toEqual({ id: 'n1', title: 'Price drop', type: 'price_change' });
  });

  it('falls back to cached data and marks the screen offline when the fetch fails', async () => {
    mockedApiGet.mockRejectedValue(new Error('network down'));
    (getCachedData as jest.Mock).mockImplementation((key: string) => {
      if (key === 'tolatola_cache_categories') return Promise.resolve([{ id: 'cached-cat' }]);
      if (key === 'tolatola_cache_home_products') return Promise.resolve([{ id: 'cached-prod' }]);
      return Promise.resolve(null);
    });

    const { result } = renderHook(() =>
      useHomeScreenData({ isAuthenticated: false, accessToken: null })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isOffline).toBe(true);
    expect(result.current.categories).toEqual([{ id: 'cached-cat' }]);
    expect(result.current.products).toEqual([{ id: 'cached-prod' }]);
  });

  it('derives featuredProducts, bestSelling and bestDeals from the product list', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/categories') return Promise.resolve({ data: [] });
      if (path === '/promotions') return Promise.resolve({ data: [] });
      if (path === '/products') {
        return Promise.resolve({
          data: [
            { id: 'a', name: 'A', sales_count: 5, price: 100 },
            { id: 'b', name: 'B', sales_count: 0, price: 50, compare_at_price: 80 },
            { id: 'c', name: 'C', sales_count: 10, price: 20 },
          ],
        });
      }
      return Promise.resolve(null);
    });

    const { result } = renderHook(() =>
      useHomeScreenData({ isAuthenticated: false, accessToken: null })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.featuredProducts.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(result.current.bestSelling.map((p) => p.id)).toEqual(['c', 'a']);
    expect(result.current.bestDeals.map((p) => p.id)).toEqual(['b']);
  });
});
