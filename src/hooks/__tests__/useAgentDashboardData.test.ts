import { renderHook, waitFor } from '@testing-library/react-native';
import { useAgentDashboardData } from '@/src/hooks/useAgentDashboardData';
import { apiGet } from '@/src/services/api';

jest.mock('@/src/services/api');

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}));

const mockedApiGet = apiGet as jest.Mock;

describe('useAgentDashboardData', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when there is no access token', () => {
    const { result } = renderHook(() => useAgentDashboardData(null));
    expect(result.current.loading).toBe(true);
    expect(mockedApiGet).not.toHaveBeenCalled();
  });

  it('populates state from the dashboard endpoints on success', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/agents/my-role') return Promise.resolve({ agent: { agent_code: 'AG-1' } });
      if (path === '/agents/dashboard') return Promise.resolve({ overview: { totalRegistrations: 3 } });
      if (path === '/agents/registrations') return Promise.resolve({ data: [{ id: 1 }] });
      if (path === '/agents/commissions') return Promise.resolve({ data: [{ id: 2, amount: 100, status: 'paid' }] });
      if (path === '/agents/referral-link') return Promise.resolve({ referral_link: 'https://tola/ref', referral_code: 'AG-1' });
      if (path === '/agents/wallet') return Promise.resolve({ success: true, wallet: { withdrawableBalance: 500 } });
      if (path === '/notifications/unread-count') return Promise.resolve({ unread_count: 2 });
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useAgentDashboardData('token-123'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.agentProfile).toEqual({ agent_code: 'AG-1' });
    expect(result.current.registrations).toEqual([{ id: 1 }]);
    expect(result.current.commissions).toEqual([{ id: 2, amount: 100, status: 'paid' }]);
    expect(result.current.referralLink).toBe('https://tola/ref');
    expect(result.current.walletStats).toEqual({ withdrawableBalance: 500 });
    expect(result.current.unreadNotifs).toBe(2);
  });

  it('falls back to computing wallet stats from commissions when the wallet endpoint fails', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/agents/commissions') {
        return Promise.resolve({
          data: [
            { id: 1, amount: 100, status: 'paid' },
            { id: 2, amount: 50, status: 'pending' },
          ],
        });
      }
      if (path === '/agents/wallet') return Promise.resolve(null);
      if (path === '/agents/registrations') return Promise.resolve({ data: [] });
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useAgentDashboardData('token-123'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.walletStats).toEqual({
      lifetimeEarnings: 150,
      pendingBalance: 50,
      withdrawableBalance: 0,
      paidBalance: 100,
      commissions: [
        { id: 1, amount: 100, status: 'paid' },
        { id: 2, amount: 50, status: 'pending' },
      ],
      withdrawals: [],
    });
  });
});
