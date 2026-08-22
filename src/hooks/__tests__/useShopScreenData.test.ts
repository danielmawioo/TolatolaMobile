import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useShopScreenData } from '@/src/hooks/useShopScreenData';
import { apiGet } from '@/src/services/api';
import { getCachedData, setCachedData } from '@/src/services/cache';

jest.mock('@/src/services/api', () => ({
  apiGet: jest.fn(),
}));

jest.mock('@/src/services/cache', () => ({
  getCachedData: jest.fn(),
  setCachedData: jest.fn(),
  CACHE_KEYS: { SHOP_PRODUCTS: 'shop_products', CATEGORIES: 'categories' },
}));

const mockedApiGet = apiGet as jest.Mock;
const mockedGetCachedData = getCachedData as jest.Mock;
const mockedSetCachedData = setCachedData as jest.Mock;

describe('useShopScreenData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSetCachedData.mockResolvedValue(undefined);
  });

  it('loads categories and products on mount', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/categories') return Promise.resolve({ data: [{ id: 'c1', name: 'Phones' }] });
      return Promise.resolve({ data: [{ id: 'p1', name: 'iPhone', price: 1000 }] });
    });

    const { result } = renderHook(() => useShopScreenData());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.categories).toEqual([{ id: 'c1', name: 'Phones' }]);
    expect(result.current.products).toEqual([{ id: 'p1', name: 'iPhone', price: 1000 }]);
    expect(result.current.isOffline).toBe(false);
    expect(mockedSetCachedData).toHaveBeenCalledWith('shop_products', result.current.products);
  });

  it('falls back to cached products and applies local filters when the API fails', async () => {
    mockedApiGet.mockRejectedValue(new Error('network down'));
    mockedGetCachedData.mockImplementation((key: string) => {
      if (key === 'categories') return Promise.resolve([{ id: 'c1', name: 'Phones' }]);
      if (key === 'shop_products') {
        return Promise.resolve([
          { id: 'p1', name: 'Cheap Phone', price: 100 },
          { id: 'p2', name: 'Expensive Phone', price: 5000 },
        ]);
      }
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useShopScreenData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isOffline).toBe(true);
    expect(result.current.products).toHaveLength(2);

    act(() => {
      result.current.setMinPriceQuery('1000');
    });
    await act(async () => {
      await result.current.fetchData();
    });

    expect(result.current.products).toEqual([{ id: 'p2', name: 'Expensive Phone', price: 5000 }]);
  });

  it('handleSearch commits the search input as the active query', async () => {
    mockedApiGet.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useShopScreenData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setSearchInput('  shoes  ');
    });
    act(() => {
      result.current.handleSearch();
    });

    expect(result.current.searchQuery).toBe('shoes');
  });

  it('handleCategorySelect updates the selected category and sets loading', async () => {
    mockedApiGet.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useShopScreenData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleCategorySelect('cat-2');
    });

    expect(result.current.selectedCategory).toBe('cat-2');
    expect(result.current.loading).toBe(true);
  });

  it('computes activeFilterCount from the location/price filters', async () => {
    mockedApiGet.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useShopScreenData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeFilterCount).toBe(0);

    act(() => {
      result.current.setLocationQuery('Dar es Salaam');
      result.current.setMinPriceQuery('100');
    });

    expect(result.current.activeFilterCount).toBe(2);
  });
});
