import { renderHook, waitFor } from '@testing-library/react-native';
import { useTransporterDashboardData } from '@/src/hooks/useTransporterDashboardData';
import { apiGet } from '@/src/services/api';
import { logger } from '@/src/lib/logger';

jest.mock('@/src/services/api');

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3, High: 4 },
}));

const mockedApiGet = apiGet as jest.Mock;

const session: any = {
  access_token: 'token-123',
  user: { id: 'user-1', email: 'driver@example.com' },
};

describe('useTransporterDashboardData', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when there is no session', () => {
    const { result } = renderHook(() => useTransporterDashboardData(null));
    expect(result.current.loading).toBe(true);
    expect(mockedApiGet).not.toHaveBeenCalled();
  });

  it('populates state from the dashboard endpoints on success', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/profile') return Promise.resolve({ profile: { full_name: 'Asha', email: 'a@t.co', phone: '0700' } });
      if (path === '/transporters/me') return Promise.resolve({ transporter: { id: 't-1', business_name: 'Fast Cargo', vehicle_type: 'car', kyc_status: 'approved' } });
      if (path === '/transporter/jobs') return Promise.resolve({ assignments: [{ id: 'a1', status: 'delivered', is_customer_verified: true }] });
      if (path === '/transporters/payments') return Promise.resolve({ payments: [{ id: 'p1', status: 'available', amount: 1000 }] });
      if (path === '/transporter/finance-summary') return Promise.resolve({ withdrawable_balance: 2500 });
      if (path === '/notifications/unread-count') return Promise.resolve({ unread_count: 4 });
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useTransporterDashboardData(session));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.transporterId).toBe('t-1');
    expect(result.current.transporter?.business_name).toBe('Fast Cargo');
    expect(result.current.profileData.full_name).toBe('Asha');
    expect(result.current.completedAssignments).toHaveLength(1);
    expect(result.current.availableBalance).toBe(2500);
    expect(result.current.unreadNotifs).toBe(4);
  });

  it('logs and continues without alerting when the notification count fetch fails', async () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/profile') return Promise.resolve({ profile: { full_name: 'Asha' } });
      if (path === '/transporters/me') return Promise.resolve({ transporter: { id: 't-1' } });
      if (path === '/transporter/jobs') return Promise.resolve({ assignments: [] });
      if (path === '/transporters/payments') return Promise.resolve({ payments: [] });
      if (path === '/transporter/finance-summary') return Promise.resolve(null);
      if (path === '/notifications/unread-count') return Promise.reject(new Error('boom'));
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useTransporterDashboardData(session));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Non-throwing / non-alerting: the rest of the dashboard data still loads.
    expect(result.current.transporterId).toBe('t-1');
    expect(result.current.unreadNotifs).toBe(0);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[TRANSPORTER DASHBOARD]'),
      expect.any(Error)
    );

    errorSpy.mockRestore();
  });
});
