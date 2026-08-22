import { renderHook, act, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useCheckoutSubmit } from '@/src/hooks/useCheckoutSubmit';
import { apiPost } from '@/src/services/api';
import { INITIAL_ADDRESS, type AddressData } from '@/src/constants/checkout';
import type { CartItem } from '@/src/contexts/CartContext';

jest.mock('@/src/services/api');

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

const mockedApiPost = apiPost as jest.Mock;

const filledAddress: AddressData = {
  ...INITIAL_ADDRESS,
  region: 'Dar es Salaam',
  district: 'Ilala',
  ward: 'Kariakoo',
  street: 'Msimbazi',
};

const item: CartItem = {
  id: 'ci-1',
  product_id: 'p-1',
  name: 'Rice',
  price: 1000,
  quantity: 2,
  shop_id: 'shop-1',
};

function baseParams(overrides: Partial<Parameters<typeof useCheckoutSubmit>[0]> = {}) {
  return {
    items: [item],
    fullName: 'Asha Vendor',
    phone: '0754000000',
    guestEmail: '',
    isAuthenticated: true,
    addressData: filledAddress,
    selectedTransportId: 'transport-1',
    shopDeliveries: { 'shop-1': { distanceKm: 5, duration: 'Fast' } },
    shopFees: { 'shop-1': 3000 },
    paymentMethod: 'cash-on-delivery',
    paymentPhone: '',
    cardDetails: { number: '', expiry: '', cvv: '' },
    deliveryFee: 3000,
    insuranceFee: 45,
    total: 3045,
    latitude: -6.8,
    longitude: 39.2,
    session: null,
    expoPushToken: null,
    clearCart: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('useCheckoutSubmit', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('surfaces a validation error without calling the API', async () => {
    const params = baseParams({ fullName: '' });
    const { result } = renderHook(() => useCheckoutSubmit(params));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe('Please enter your full name');
    expect(result.current.showErrorModal).toBe(true);
    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it('creates the order and clears the cart on cash-on-delivery success', async () => {
    mockedApiPost.mockResolvedValueOnce({ order: { id: 'order-1' } });
    const params = baseParams();
    const { result } = renderHook(() => useCheckoutSubmit(params));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockedApiPost).toHaveBeenCalledWith('/orders', expect.objectContaining({ totalAmount: 3045 }), undefined);
    expect(params.clearCart).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/payment-success',
      params: { orderId: 'order-1', paymentMethod: 'cash-on-delivery' },
    });
    expect(result.current.error).toBeNull();
  });

  it('surfaces an API error and stops the loading state', async () => {
    mockedApiPost.mockRejectedValueOnce(new Error('Network down'));
    const params = baseParams();
    const { result } = renderHook(() => useCheckoutSubmit(params));

    await act(async () => {
      await result.current.handleSubmit();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Network down');
    expect(result.current.showErrorModal).toBe(true);
    expect(params.clearCart).not.toHaveBeenCalled();
  });
});
