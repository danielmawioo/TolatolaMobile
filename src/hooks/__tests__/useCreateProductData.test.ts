import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useCreateProductData } from '@/src/hooks/useCreateProductData';
import { apiGet } from '@/src/services/api';

jest.mock('@/src/services/api');

const mockedApiGet = apiGet as jest.Mock;

// classifyProductCategory itself (re-exported via useCreateProductData's return
// value) is exhaustively tested in src/lib/__tests__/productForm.test.ts — no
// need to duplicate those cases here.
describe('useCreateProductData', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when there is no access token', () => {
    const { result } = renderHook(() => useCreateProductData(undefined));
    expect(result.current.categories).toEqual([]);
    expect(result.current.shopId).toBeNull();
    expect(mockedApiGet).not.toHaveBeenCalled();
  });

  it('loads categories and resolves the vendor shop_id', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/categories') {
        return Promise.resolve({
          data: [
            { id: 'fashion', name: 'Fashion', parent_id: null },
            { id: 'men', name: 'Men', parent_id: 'fashion', slug: 'men' },
          ],
        });
      }
      if (path === '/vendor/shop') {
        return Promise.resolve({ shops: [{ id: 'shop-1' }] });
      }
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useCreateProductData('token-123'));

    await waitFor(() => expect(result.current.shopId).toBe('shop-1'));
    expect(result.current.categories).toEqual([
      { id: 'fashion', name: 'Fashion', parent_id: null },
      { id: 'men', name: 'Men', parent_id: 'fashion', slug: 'men' },
    ]);
  });

  it('falls back to the res.data shape for the shop lookup', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/categories') return Promise.resolve({ data: [] });
      if (path === '/vendor/shop') return Promise.resolve({ data: [{ id: 'shop-2' }] });
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useCreateProductData('token-123'));

    await waitFor(() => expect(result.current.shopId).toBe('shop-2'));
  });

  it('leaves shopId null and does not throw when both fetches fail', async () => {
    mockedApiGet.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useCreateProductData('token-123'));

    // Give the rejected promises a tick to settle.
    await waitFor(() => expect(mockedApiGet).toHaveBeenCalledTimes(2));
    expect(result.current.shopId).toBeNull();
    expect(result.current.categories).toEqual([]);
  });

  it('clears a stale weight_unit when the category changes away from agriculture', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/categories') {
        return Promise.resolve({
          data: [
            { id: 'agriculture', name: 'Agriculture', parent_id: null },
            { id: 'rice', name: 'Rice', parent_id: 'agriculture' },
            { id: 'fashion', name: 'Fashion', parent_id: null },
          ],
        });
      }
      if (path === '/vendor/shop') return Promise.resolve({ shops: [] });
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useCreateProductData('token-123'));

    await waitFor(() => expect(result.current.categories.length).toBe(3));

    // Select the agriculture subcategory and set a weight_unit.
    act(() => {
      result.current.setFormData(f => ({ ...f, category_id: 'rice', weight_unit: 'Kg' }));
    });
    expect(result.current.isAgriculture).toBe(true);
    expect(result.current.formData.weight_unit).toBe('Kg');

    // Switching to a non-agriculture category should clear the stale weight_unit.
    act(() => {
      result.current.setFormData(f => ({ ...f, category_id: 'fashion' }));
    });

    await waitFor(() => expect(result.current.formData.weight_unit).toBe(''));
  });
});
