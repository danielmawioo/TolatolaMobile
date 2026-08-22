import { renderHook, act, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useProductDetailData } from '@/src/hooks/useProductDetailData';
import { apiGet } from '@/src/services/api';
import { useCart } from '@/src/contexts/CartContext';

jest.mock('@/src/services/api');

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@/src/contexts/CartContext', () => ({
  useCart: jest.fn(),
}));

const mockedApiGet = apiGet as jest.Mock;
const mockedUseCart = useCart as jest.Mock;

const baseProduct = {
  id: 'p1',
  name: 'Test Shirt',
  price: 1000,
  stock_quantity: 10,
  moq: 2,
};

function mockApiFor(product: any, reviews: any[] = [], recommendations: any[] = []) {
  mockedApiGet.mockImplementation((path: string) => {
    if (path === '/products/p1') return Promise.resolve({ data: product });
    if (path === '/products/p1/reviews') return Promise.resolve({ data: reviews });
    if (path === '/products/p1/recommendations') return Promise.resolve({ data: recommendations });
    return Promise.resolve(null);
  });
}

describe('useProductDetailData', () => {
  let addItem: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    addItem = jest.fn().mockResolvedValue(undefined);
    mockedUseCart.mockReturnValue({ addItem, items: [] });
  });

  it('loads the product, reviews and recommendations, defaulting quantity to the MOQ', async () => {
    mockApiFor(baseProduct, [{ id: 'r1', rating: 4, comment: 'Nice', created_at: '2024-01-01' }], [{ id: 'p2', name: 'Other' }]);

    const { result } = renderHook(() => useProductDetailData('p1'));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.product).toEqual(baseProduct);
    expect(result.current.reviews).toHaveLength(1);
    expect(result.current.recommendations).toEqual([{ id: 'p2', name: 'Other' }]);
    expect(result.current.quantity).toBe(2);
    expect(result.current.resolvedPrice).toBe(1000);
    expect(result.current.isSoldOut).toBe(false);
  });

  it('selects the first color/size by default and resolves price from the selected size', async () => {
    const fashionProduct = {
      ...baseProduct,
      colors: [{ name: 'Red', price: 1200 }, { name: 'Blue', price: 1300 }],
      sizes: ['S', 'M'],
      size_prices: { S: 1500, M: 1600 },
    };
    mockApiFor(fashionProduct);

    const { result } = renderHook(() => useProductDetailData('p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.selectedColor).toEqual({ name: 'Red', price: 1200 });
    expect(result.current.selectedSize).toBe('S');
    // Fashion products with a size price for the selected size take priority over color price.
    expect(result.current.resolvedPrice).toBe(1500);
  });

  it('reports sold out when stock is zero and marks the product in-cart when a matching cart item exists', async () => {
    mockApiFor({ ...baseProduct, stock_quantity: 0 });
    mockedUseCart.mockReturnValue({
      addItem,
      items: [{ product_id: 'p1', selected_color: null, selected_size: null }],
    });

    const { result } = renderHook(() => useProductDetailData('p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isSoldOut).toBe(true);
    expect(result.current.isInCart).toBe(true);
  });

  it('handleAddToCart adds the item with the resolved price and navigates to the cart', async () => {
    mockApiFor(baseProduct);
    const { result } = renderHook(() => useProductDetailData('p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleAddToCart();
    });

    expect(addItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p1', price: 1000 }),
      2,
      null,
      undefined
    );
    expect(router.push).toHaveBeenCalledWith('/(tabs)/cart');
    expect(result.current.adding).toBe(false);
  });

  it('does nothing when there is no id', () => {
    const { result } = renderHook(() => useProductDetailData(undefined));

    expect(result.current.loading).toBe(false);
    expect(mockedApiGet).not.toHaveBeenCalled();
  });
});
