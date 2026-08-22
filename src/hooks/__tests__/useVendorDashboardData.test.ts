import { renderHook, waitFor } from '@testing-library/react-native';
import { useVendorDashboardData } from '@/src/hooks/useVendorDashboardData';
import { apiGet } from '@/src/services/api';

jest.mock('@/src/services/api');

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}));

const mockedApiGet = apiGet as jest.Mock;

describe('useVendorDashboardData', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when there is no access token', () => {
    const { result } = renderHook(() => useVendorDashboardData(null));
    expect(result.current.loading).toBe(true);
    expect(mockedApiGet).not.toHaveBeenCalled();
  });

  it('populates vendor, shop, products and orders on success', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/vendors') return Promise.resolve({ data: [{ id: 'v1', business_name: 'Acme' }] });
      if (path === '/vendor/shop') return Promise.resolve({ shops: [{ id: 's1', name: 'Acme Shop' }] });
      if (path === '/shops/s1/products') return Promise.resolve({ data: [{ id: 'p1' }] });
      if (path === '/shops/s1/orders') return Promise.resolve({ orders: [{ id: 'o1', status: 'pending' }] });
      if (path === '/notifications/unread-count') return Promise.resolve({ unread_count: 3 });
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useVendorDashboardData('token-123'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.vendor).toEqual({ id: 'v1', business_name: 'Acme' });
    expect(result.current.shop).toEqual({ id: 's1', name: 'Acme Shop' });
    expect(result.current.products).toEqual([{ id: 'p1' }]);
    expect(result.current.orders).toEqual([{ id: 'o1', status: 'pending' }]);
    expect(result.current.unreadNotifs).toBe(3);
  });

  it('does not throw and still resolves when the notification count fetch fails', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/vendors') return Promise.resolve({ data: [{ id: 'v1' }] });
      if (path === '/vendor/shop') return Promise.resolve({ shops: [] });
      if (path === '/notifications/unread-count') return Promise.reject(new Error('network down'));
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useVendorDashboardData('token-123'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Silent failure: dashboard still loads, notification count just stays at default.
    expect(result.current.unreadNotifs).toBe(0);
    expect(result.current.vendor).toEqual({ id: 'v1' });
  });

  it('recovers gracefully when the vendor fetch itself fails', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/vendors') return Promise.reject(new Error('server error'));
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useVendorDashboardData('token-123'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.vendor).toBeNull();
  });
});
