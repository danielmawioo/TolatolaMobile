import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationsProvider, useNotifications } from '@/src/contexts/NotificationsContext';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from '@/src/api/notifications';
import { getUserRoleFromSession } from '@/src/lib/roleRedirect';

// NotificationsContext imports useAuth via a relative path ('./AuthContext'), which
// resolves to the same module as the '@/' alias below — mocking either path
// intercepts the same underlying module in Jest's module registry.
const mockUseAuth = jest.fn();
jest.mock('@/src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/src/lib/roleRedirect', () => ({
  getUserRoleFromSession: jest.fn(),
}));

jest.mock('@/src/api/notifications');

const mockedFetchNotifications = fetchNotifications as jest.Mock;
const mockedFetchUnreadCount = fetchUnreadCount as jest.Mock;
const mockedMarkNotificationRead = markNotificationRead as jest.Mock;
const mockedMarkAllNotificationsRead = markAllNotificationsRead as jest.Mock;
const mockedGetUserRoleFromSession = getUserRoleFromSession as jest.Mock;

const guestAuth = {
  session: null,
  isLoading: false,
  isAuthenticated: false,
  accessToken: null,
  login: jest.fn(),
  signup: jest.fn(),
  logout: jest.fn(),
  setSession: jest.fn(),
  switchRole: jest.fn(),
};

const authedAuth = {
  ...guestAuth,
  session: { access_token: 'tok-abc', refresh_token: 'refresh-abc', expires_at: 9999999999 },
  isAuthenticated: true,
  accessToken: 'tok-abc',
};

function makeNotification(overrides: Partial<Notification>): Notification {
  return {
    id: 'n1',
    user_id: 'u1',
    type: 'order_placed',
    title: 'Title',
    message: 'Message',
    data: null,
    is_read: false,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// react-query keeps its notifyManager/observer subscriptions alive after a test
// ends unless the client is torn down explicitly — left unmanaged, those pending
// timers hold the Jest process open indefinitely instead of just failing/leaking.
let activeQueryClients: QueryClient[] = [];
let activeUnmounts: Array<() => void> = [];

function renderWithProviders() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  activeQueryClients.push(queryClient);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <NotificationsProvider>{children}</NotificationsProvider>
    </QueryClientProvider>
  );
  const rendered = renderHook(() => useNotifications(), { wrapper });
  activeUnmounts.push(rendered.unmount);
  return rendered;
}

describe('NotificationsContext', () => {
  afterEach(() => {
    activeUnmounts.forEach((unmount) => unmount());
    activeQueryClients.forEach((client) => client.clear());
    activeUnmounts = [];
    activeQueryClients = [];
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(guestAuth);
    mockedGetUserRoleFromSession.mockReturnValue('customer');
    mockedFetchNotifications.mockResolvedValue([]);
    mockedFetchUnreadCount.mockResolvedValue(0);
    mockedMarkNotificationRead.mockResolvedValue(undefined);
    mockedMarkAllNotificationsRead.mockResolvedValue(undefined);
  });

  it('throws when useNotifications is used outside of a NotificationsProvider', () => {
    expect(() => renderHook(() => useNotifications())).toThrow(
      'useNotifications must be used within NotificationsProvider'
    );
  });

  describe('guest (no session)', () => {
    it('does not fetch, reports empty state, and defaults role to customer', () => {
      const { result } = renderWithProviders();

      expect(result.current.loading).toBe(false);
      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.userRole).toBe('customer');
      expect(mockedFetchNotifications).not.toHaveBeenCalled();
      expect(mockedFetchUnreadCount).not.toHaveBeenCalled();
      // Guests never reach the role-derivation branch (session is null).
      expect(mockedGetUserRoleFromSession).not.toHaveBeenCalled();
    });

    it('markAsRead and markAllRead are no-ops without a token', async () => {
      const { result } = renderWithProviders();

      await act(async () => {
        await result.current.markAsRead('n1');
      });
      await act(async () => {
        await result.current.markAllRead();
      });

      expect(mockedMarkNotificationRead).not.toHaveBeenCalled();
      expect(mockedMarkAllNotificationsRead).not.toHaveBeenCalled();
    });
  });

  describe('authenticated', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(authedAuth);
    });

    it('is loading before data resolves, then fetches using the derived role and token', async () => {
      mockedGetUserRoleFromSession.mockReturnValue('vendor');
      mockedFetchNotifications.mockResolvedValue([]);
      mockedFetchUnreadCount.mockResolvedValue(0);

      const { result } = renderWithProviders();

      expect(result.current.loading).toBe(true);

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockedGetUserRoleFromSession).toHaveBeenCalledWith(authedAuth.session);
      expect(result.current.userRole).toBe('vendor');
      expect(mockedFetchNotifications).toHaveBeenCalledWith('tok-abc', {
        limit: 64,
        userType: 'vendor',
      });
      expect(mockedFetchUnreadCount).toHaveBeenCalledWith('tok-abc', { userType: 'vendor' });
    });

    it('filters the fetched list down to notifications relevant to the current role', async () => {
      mockedGetUserRoleFromSession.mockReturnValue('vendor');
      const forCustomer = makeNotification({ id: 'c1', type: 'order_placed' });
      const forVendor = makeNotification({ id: 'v1', type: 'incoming_order' });
      const forAdmin = makeNotification({ id: 'a1', type: 'kyc_queue_update' });
      const forEveryone = makeNotification({ id: 'e1', type: 'promo_campaign' });
      mockedFetchNotifications.mockResolvedValue([forCustomer, forVendor, forAdmin, forEveryone]);
      mockedFetchUnreadCount.mockResolvedValue(9);

      const { result } = renderWithProviders();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const ids = result.current.notifications.map((n) => n.id).sort();
      expect(ids).toEqual(['e1', 'v1']);
      // Server-reported unread count is trusted when the client did not need
      // to drop any rows for this role (clientFiltered stays false only when
      // rawList.length === notifications.length, so here it falls back to
      // the locally computed unread count instead).
      expect(result.current.unreadCount).toBe(2);
    });

    it('uses the server unread count when nothing was filtered out client-side', async () => {
      mockedGetUserRoleFromSession.mockReturnValue('customer');
      const n1 = makeNotification({ id: 'c1', type: 'order_placed', is_read: false });
      const n2 = makeNotification({ id: 'c2', type: 'order_shipped', is_read: true });
      mockedFetchNotifications.mockResolvedValue([n1, n2]);
      mockedFetchUnreadCount.mockResolvedValue(42);

      const { result } = renderWithProviders();
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.notifications).toHaveLength(2);
      // Nothing was filtered out (both notifications matched 'customer'), so
      // the hook trusts the server-reported unread count over the local tally.
      expect(result.current.unreadCount).toBe(42);
    });

    it('markAsRead optimistically flips is_read and decrements unread count', async () => {
      mockedGetUserRoleFromSession.mockReturnValue('customer');
      const n1 = makeNotification({ id: 'c1', type: 'order_placed', is_read: false });
      const n2 = makeNotification({ id: 'c2', type: 'order_shipped', is_read: false });
      mockedFetchNotifications.mockResolvedValue([n1, n2]);
      mockedFetchUnreadCount.mockResolvedValue(2);

      const { result } = renderWithProviders();
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.unreadCount).toBe(2);

      await act(async () => {
        await result.current.markAsRead('c1');
      });

      expect(mockedMarkNotificationRead).toHaveBeenCalledWith('tok-abc', 'c1');
      await waitFor(() =>
        expect(result.current.notifications.find((n) => n.id === 'c1')?.is_read).toBe(true)
      );
      expect(result.current.unreadCount).toBe(1);
    });

    it('markAllRead marks every notification read and zeroes the unread count', async () => {
      mockedGetUserRoleFromSession.mockReturnValue('customer');
      const n1 = makeNotification({ id: 'c1', type: 'order_placed', is_read: false });
      const n2 = makeNotification({ id: 'c2', type: 'order_shipped', is_read: false });
      mockedFetchNotifications.mockResolvedValue([n1, n2]);
      mockedFetchUnreadCount.mockResolvedValue(2);

      const { result } = renderWithProviders();
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.markAllRead();
      });

      expect(mockedMarkAllNotificationsRead).toHaveBeenCalledWith('tok-abc');
      await waitFor(() =>
        expect(result.current.notifications.every((n) => n.is_read)).toBe(true)
      );
      expect(result.current.unreadCount).toBe(0);
    });

    it('falls back to a full refresh when markAsRead fails', async () => {
      mockedGetUserRoleFromSession.mockReturnValue('customer');
      const n1 = makeNotification({ id: 'c1', type: 'order_placed', is_read: false });
      mockedFetchNotifications.mockResolvedValue([n1]);
      mockedFetchUnreadCount.mockResolvedValue(1);
      mockedMarkNotificationRead.mockRejectedValue(new Error('network down'));
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderWithProviders();
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockedFetchNotifications).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.markAsRead('c1');
      });

      // Failure path swallows the error, logs it, and re-fetches from the server
      // instead of leaving the optimistic-update cache in an unknown state.
      await waitFor(() => expect(mockedFetchNotifications).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(mockedFetchUnreadCount).toHaveBeenCalledTimes(2));
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });

    it('falls back to a full refresh when markAllRead fails', async () => {
      mockedGetUserRoleFromSession.mockReturnValue('customer');
      const n1 = makeNotification({ id: 'c1', type: 'order_placed', is_read: false });
      mockedFetchNotifications.mockResolvedValue([n1]);
      mockedFetchUnreadCount.mockResolvedValue(1);
      mockedMarkAllNotificationsRead.mockRejectedValue(new Error('network down'));
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderWithProviders();
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockedFetchNotifications).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.markAllRead();
      });

      await waitFor(() => expect(mockedFetchNotifications).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(mockedFetchUnreadCount).toHaveBeenCalledTimes(2));
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });

    it('refresh() re-fetches both the notification list and the unread count', async () => {
      mockedGetUserRoleFromSession.mockReturnValue('customer');
      mockedFetchNotifications.mockResolvedValue([]);
      mockedFetchUnreadCount.mockResolvedValue(0);

      const { result } = renderWithProviders();
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockedFetchNotifications).toHaveBeenCalledTimes(1);
      expect(mockedFetchUnreadCount).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockedFetchNotifications).toHaveBeenCalledTimes(2);
      expect(mockedFetchUnreadCount).toHaveBeenCalledTimes(2);
    });
  });
});
