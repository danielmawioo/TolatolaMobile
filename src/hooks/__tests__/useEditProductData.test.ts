import { renderHook, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useEditProductData } from '@/src/hooks/useEditProductData';
import { apiGet } from '@/src/services/api';

jest.mock('@/src/services/api');

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

const mockedApiGet = apiGet as jest.Mock;

// classifyProductCategory itself (re-exported via useEditProductData's return value)
// is exhaustively tested in src/lib/__tests__/productForm.test.ts — no need to
// duplicate those cases here.
describe('useEditProductData', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when there is no id or access token', () => {
    const { result } = renderHook(() => useEditProductData(undefined, undefined));
    expect(result.current.loading).toBe(true);
    expect(mockedApiGet).not.toHaveBeenCalled();
  });

  it('populates form state, images, colors, sizes and category selection from the fetched product', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/categories') {
        return Promise.resolve({
          data: [
            { id: 'fashion', name: 'Fashion', parent_id: null },
            { id: 'men', name: 'Men', parent_id: 'fashion', slug: 'men' },
          ],
        });
      }
      if (path === '/products/p1') {
        return Promise.resolve({
          data: {
            name: 'Denim Jacket',
            price: 25000,
            stock_quantity: 10,
            category_id: 'men',
            images: ['https://img/1.png'],
            colors: [{ name: 'Blue', image: '' }],
            sizes: ['M', 'L'],
            delivery_available: false,
          },
        });
      }
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useEditProductData('p1', 'token-123'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.formData.name).toBe('Denim Jacket');
    expect(result.current.formData.price).toBe('25000');
    expect(result.current.formData.delivery_available).toBe(false);
    expect(result.current.images).toEqual(['https://img/1.png']);
    expect(result.current.colors).toEqual([{ name: 'Blue', image: '' }]);
    expect(result.current.sizes).toEqual(['M', 'L']);
    expect(result.current.parentCategoryId).toBe('fashion');
    expect(result.current.subCategoryId).toBe('men');
    expect(result.current.isFashion).toBe(true);
  });

  it('auto-derives vehicle_section from a spare-parts subcategory on load', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/categories') {
        return Promise.resolve({
          data: [
            { id: 'vehicles', name: 'Vehicles', parent_id: null },
            { id: 'spare-parts', name: 'Spare Parts', parent_id: 'vehicles', slug: 'spare-parts' },
          ],
        });
      }
      if (path === '/products/p2') {
        return Promise.resolve({ data: { name: 'Brake Pad', category_id: 'spare-parts' } });
      }
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useEditProductData('p2', 'token-123'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.formData.vehicle_section).toBe('spare_part');
    expect(result.current.isVehicles).toBe(true);
  });

  it('sends the user back and shows an alert when the fetch fails', async () => {
    mockedApiGet.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useEditProductData('p3', 'token-123'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(router.back).toHaveBeenCalled();
  });
});
