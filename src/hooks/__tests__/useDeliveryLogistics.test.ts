import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useDeliveryLogistics } from '@/src/hooks/useDeliveryLogistics';
import { apiGet, apiPost } from '@/src/services/api';
import type { CartItem } from '@/src/contexts/CartContext';
import type { TransportMethod } from '@/src/constants/checkout';

jest.mock('@/src/services/api');

const mockedApiGet = apiGet as jest.Mock;
const mockedApiPost = apiPost as jest.Mock;

const shopItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: 'ci-1',
  product_id: 'p-1',
  name: 'Rice',
  price: 1000,
  quantity: 3,
  shop_id: 'shop-1',
  shop_latitude: -6.8,
  shop_longitude: 39.28,
  ...overrides,
});

describe('useDeliveryLogistics', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads transport methods on mount and selects the first one', async () => {
    const methods: TransportMethod[] = [
      { id: 'moto', name: 'Motorcycle', rate_per_km: 500 },
      { id: 'van', name: 'Van', rate_per_km: 800 },
    ];
    mockedApiGet.mockImplementation((url: string) => {
      if (url === '/transport-methods') return Promise.resolve({ data: methods });
      return Promise.resolve(null);
    });

    const onError = jest.fn();
    const { result } = renderHook(() => useDeliveryLogistics({ items: [shopItem()], onError }));

    await waitFor(() => expect(result.current.transportMethods).toEqual(methods));
    expect(result.current.selectedTransportId).toBe('moto');
  });

  it('computes per-shop delivery fees and total delivery fee after address completion', async () => {
    mockedApiGet.mockImplementation((url: string) => {
      if (url === '/transport-methods') {
        return Promise.resolve({ data: [{ id: 'moto', name: 'Motorcycle', rate_per_km: 500 }] });
      }
      return Promise.resolve(null);
    });
    mockedApiPost.mockResolvedValueOnce({ distanceKm: 10, duration: '20 min' });

    const onError = jest.fn();
    const items = [shopItem()];
    const { result } = renderHook(() => useDeliveryLogistics({ items, onError }));

    await waitFor(() => expect(result.current.selectedTransportId).toBe('moto'));

    await act(async () => {
      await result.current.handleAddressComplete('Some Address', { lat: -6.79, lng: 39.2 });
    });

    expect(mockedApiPost).toHaveBeenCalledWith('/maps/distance', {
      destLat: -6.79,
      destLng: 39.2,
      originLat: -6.8,
      originLng: 39.28,
    });
    expect(result.current.shopDeliveries).toEqual({ 'shop-1': { distanceKm: 10, duration: '20 min' } });
    expect(result.current.shopFees).toEqual({ 'shop-1': 5000 }); // 10km * 500/km
    expect(result.current.deliveryFee).toBe(5000);
    expect(result.current.latitude).toBe(-6.79);
    expect(result.current.longitude).toBe(39.2);
    expect(onError).not.toHaveBeenCalled();
  });

  it('falls back to distance-tier pricing when the transport method has no rates', async () => {
    mockedApiGet.mockImplementation((url: string) => {
      if (url === '/transport-methods') {
        return Promise.resolve({ data: [{ id: 'flat', name: 'Standard' }] });
      }
      return Promise.resolve(null);
    });
    mockedApiPost.mockResolvedValueOnce({ distanceKm: 3, duration: 'Fast' });

    const onError = jest.fn();
    const items = [shopItem()];
    const { result } = renderHook(() => useDeliveryLogistics({ items, onError }));

    await waitFor(() => expect(result.current.selectedTransportId).toBe('flat'));

    await act(async () => {
      await result.current.handleAddressComplete('Some Address', { lat: -6.79, lng: 39.2 });
    });

    expect(result.current.shopFees).toEqual({ 'shop-1': 3000 }); // <=5km tier
  });

  it('reports an error and resets loading state when the distance call fails', async () => {
    mockedApiGet.mockResolvedValue(null);
    mockedApiPost.mockRejectedValueOnce(new Error('network down'));

    const onError = jest.fn();
    const items = [shopItem()];
    const { result } = renderHook(() => useDeliveryLogistics({ items, onError }));

    await act(async () => {
      await result.current.handleAddressComplete('Some Address', { lat: -6.79, lng: 39.2 });
    });

    expect(onError).toHaveBeenCalledWith('Could not calculate delivery routes. Please check your connection and try again.');
    expect(result.current.isCalculatingDelivery).toBe(false);
  });

  it('does nothing when handleAddressComplete is called without coordinates', async () => {
    mockedApiGet.mockResolvedValue(null);
    const onError = jest.fn();
    const { result } = renderHook(() => useDeliveryLogistics({ items: [shopItem()], onError }));

    await act(async () => {
      await result.current.handleAddressComplete('Some Address', undefined);
    });

    expect(mockedApiPost).not.toHaveBeenCalled();
    expect(result.current.shopDeliveries).toEqual({});
  });
});
