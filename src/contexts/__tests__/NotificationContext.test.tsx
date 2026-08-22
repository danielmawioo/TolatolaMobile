import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { AppState, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { NotificationProvider, useNotifications } from '@/src/contexts/NotificationContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { registerForPushNotifications, setBadgeCount } from '@/src/services/pushNotifications';
import { apiGet } from '@/src/services/api';

jest.mock('@/src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/src/services/pushNotifications', () => ({
  registerForPushNotifications: jest.fn(),
  setBadgeCount: jest.fn(),
}));

jest.mock('@/src/services/api');

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedRegister = registerForPushNotifications as jest.Mock;
const mockedSetBadgeCount = setBadgeCount as jest.Mock;
const mockedApiGet = apiGet as jest.Mock;
const mockedAddReceivedListener = Notifications.addNotificationReceivedListener as jest.Mock;
const mockedAddResponseListener = Notifications.addNotificationResponseReceivedListener as jest.Mock;
const mockedGetLastResponse = Notifications.getLastNotificationResponseAsync as jest.Mock;
const mockedRouterPush = router.push as jest.Mock;

function mockAuth(accessToken: string | null) {
  mockedUseAuth.mockReturnValue({
    session: accessToken ? { access_token: accessToken, user: { id: 'u1' } } : null,
    isLoading: false,
    isAuthenticated: !!accessToken,
    accessToken,
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
    setSession: jest.fn(),
    switchRole: jest.fn(),
  });
}

describe('NotificationContext', () => {
  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
    // React Native's own jest mock defines `AppState.currentState` as a bare
    // jest.fn() rather than a string, which breaks the provider's
    // `appState.current.match(...)` foreground-detection logic. Give it a
    // real starting value, matching what the native runtime provides.
    (AppState as any).currentState = 'active';
    mockedRegister.mockResolvedValue(null);
    mockedSetBadgeCount.mockResolvedValue(undefined);
    mockedApiGet.mockResolvedValue({ data: [] });
    mockedGetLastResponse.mockResolvedValue(null);
    mockedAddReceivedListener.mockReturnValue({ remove: jest.fn() });
    mockedAddResponseListener.mockReturnValue({ remove: jest.fn() });
    mockAuth(null);
  });

  afterEach(() => {
    Platform.OS = originalPlatformOS;
    jest.restoreAllMocks();
  });

  describe('push token registration', () => {
    it('registers for push notifications on mount using the access token', async () => {
      mockAuth('tok-123');
      mockedRegister.mockResolvedValue('ExponentPushToken[abc]');

      const { result } = renderHook(() => useNotifications(), { wrapper: NotificationProvider });

      await waitFor(() => expect(result.current.expoPushToken).toBe('ExponentPushToken[abc]'));
      expect(mockedRegister).toHaveBeenCalledWith('tok-123');
    });

    it('registers as a guest (undefined token) when there is no session', async () => {
      mockAuth(null);

      renderHook(() => useNotifications(), { wrapper: NotificationProvider });

      await waitFor(() => expect(mockedRegister).toHaveBeenCalledWith(undefined));
    });

    it('leaves expoPushToken null when registration resolves to null', async () => {
      mockAuth('tok-123');
      mockedRegister.mockResolvedValue(null);

      const { result } = renderHook(() => useNotifications(), { wrapper: NotificationProvider });

      await waitFor(() => expect(mockedRegister).toHaveBeenCalled());
      expect(result.current.expoPushToken).toBeNull();
    });

    it('does not throw when registration rejects', async () => {
      mockAuth('tok-123');
      mockedRegister.mockRejectedValue(new Error('permission denied'));

      const { result } = renderHook(() => useNotifications(), { wrapper: NotificationProvider });

      await waitFor(() => expect(mockedRegister).toHaveBeenCalled());
      expect(result.current.expoPushToken).toBeNull();
    });

    it('skips push registration entirely on web', async () => {
      Platform.OS = 'web';
      mockAuth('tok-123');

      const { result } = renderHook(() => useNotifications(), { wrapper: NotificationProvider });

      // Allow any pending microtasks to flush.
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockedRegister).not.toHaveBeenCalled();
      expect(mockedAddReceivedListener).not.toHaveBeenCalled();
      expect(mockedAddResponseListener).not.toHaveBeenCalled();
      expect(result.current.expoPushToken).toBeNull();
    });
  });

  describe('refreshUnreadCount', () => {
    it('resets unread count to 0 and skips the API call when unauthenticated', async () => {
      mockAuth(null);

      const { result } = renderHook(() => useNotifications(), { wrapper: NotificationProvider });

      await waitFor(() => expect(result.current.unreadCount).toBe(0));
      expect(mockedApiGet).not.toHaveBeenCalled();
    });

    it('fetches unread notifications and derives the unread count', async () => {
      mockAuth('tok-123');
      mockedApiGet.mockResolvedValue({
        data: [
          { id: 1, is_read: false },
          { id: 2, is_read: true },
          { id: 3, is_read: false },
        ],
      });

      const { result } = renderHook(() => useNotifications(), { wrapper: NotificationProvider });

      await waitFor(() => expect(result.current.unreadCount).toBe(2));
      expect(mockedApiGet).toHaveBeenCalledWith('/notifications?limit=100', 'tok-123');
      expect(mockedSetBadgeCount).toHaveBeenCalledWith(2);
    });

    it('silently swallows API errors and leaves the count unchanged', async () => {
      mockAuth('tok-123');
      mockedApiGet.mockRejectedValue(new Error('network down'));

      const { result } = renderHook(() => useNotifications(), { wrapper: NotificationProvider });

      await waitFor(() => expect(mockedApiGet).toHaveBeenCalled());
      expect(result.current.unreadCount).toBe(0);
    });

    it('exposes refreshUnreadCount so callers can trigger a manual refetch', async () => {
      mockAuth('tok-123');
      mockedApiGet.mockResolvedValue({ data: [{ id: 1, is_read: false }] });

      const { result } = renderHook(() => useNotifications(), { wrapper: NotificationProvider });
      await waitFor(() => expect(result.current.unreadCount).toBe(1));

      mockedApiGet.mockResolvedValue({ data: [] });
      await act(async () => {
        await result.current.refreshUnreadCount();
      });

      expect(result.current.unreadCount).toBe(0);
      expect(mockedApiGet).toHaveBeenCalledTimes(2);
    });
  });

  describe('foreground notification handling', () => {
    it('increments the unread count and badge when a notification arrives in the foreground', async () => {
      mockAuth('tok-123');

      const { result } = renderHook(() => useNotifications(), { wrapper: NotificationProvider });
      await waitFor(() => expect(mockedAddReceivedListener).toHaveBeenCalled());

      const receivedCallback = mockedAddReceivedListener.mock.calls[0][0];
      act(() => {
        receivedCallback({ request: { content: { title: 'New order' } } });
      });

      expect(result.current.unreadCount).toBe(1);
      expect(mockedSetBadgeCount).toHaveBeenCalledWith(1);
    });

    it('does not register foreground listeners on web', async () => {
      Platform.OS = 'web';
      mockAuth('tok-123');

      renderHook(() => useNotifications(), { wrapper: NotificationProvider });
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockedAddReceivedListener).not.toHaveBeenCalled();
    });

    it('removes the notification listeners on unmount', async () => {
      const removeReceived = jest.fn();
      const removeResponse = jest.fn();
      mockedAddReceivedListener.mockReturnValue({ remove: removeReceived });
      mockedAddResponseListener.mockReturnValue({ remove: removeResponse });
      mockAuth('tok-123');

      const { unmount } = renderHook(() => useNotifications(), { wrapper: NotificationProvider });
      await waitFor(() => expect(mockedAddReceivedListener).toHaveBeenCalled());

      unmount();

      expect(removeReceived).toHaveBeenCalled();
      expect(removeResponse).toHaveBeenCalled();
    });
  });

  describe('notification tap navigation', () => {
    async function renderAndGetResponseCallback() {
      mockAuth('tok-123');
      renderHook(() => useNotifications(), { wrapper: NotificationProvider });
      await waitFor(() => expect(mockedAddResponseListener).toHaveBeenCalled());
      return mockedAddResponseListener.mock.calls[0][0];
    }

    it('maps an assignments screen to the transporter deliveries dashboard', async () => {
      const onResponse = await renderAndGetResponseCallback();

      act(() => {
        onResponse({ notification: { request: { content: { data: { screen: 'assignments' } } } } });
      });

      expect(mockedRouterPush).toHaveBeenCalledWith('/(transporter)/dashboard?tab=Deliveries');
    });

    it('maps a vendor orders screen to the vendor orders dashboard', async () => {
      const onResponse = await renderAndGetResponseCallback();

      act(() => {
        onResponse({
          notification: { request: { content: { data: { screen: '/(tabs)/orders', for_role: 'vendor' } } } },
        });
      });

      expect(mockedRouterPush).toHaveBeenCalledWith('/(vendor)/dashboard?tab=Orders');
    });

    it('navigates straight to an explicit screen when no special mapping applies', async () => {
      const onResponse = await renderAndGetResponseCallback();

      act(() => {
        onResponse({ notification: { request: { content: { data: { screen: '/(tabs)/wallet' } } } } });
      });

      expect(mockedRouterPush).toHaveBeenCalledWith('/(tabs)/wallet');
    });

    it('routes to the transporter dashboard for order notifications addressed to a transporter', async () => {
      const onResponse = await renderAndGetResponseCallback();

      act(() => {
        onResponse({
          notification: { request: { content: { data: { order_id: '5', for_role: 'transporter' } } } },
        });
      });

      expect(mockedRouterPush).toHaveBeenCalledWith('/(transporter)/dashboard?tab=Deliveries');
    });

    it('routes to the vendor dashboard for order notifications addressed to a vendor', async () => {
      const onResponse = await renderAndGetResponseCallback();

      act(() => {
        onResponse({
          notification: { request: { content: { data: { orderId: '5', for_role: 'vendor' } } } },
        });
      });

      expect(mockedRouterPush).toHaveBeenCalledWith('/(vendor)/dashboard?tab=Orders');
    });

    it('routes to the customer orders tab for order notifications with no explicit role', async () => {
      const onResponse = await renderAndGetResponseCallback();

      act(() => {
        onResponse({ notification: { request: { content: { data: { order_id: '5' } } } } });
      });

      expect(mockedRouterPush).toHaveBeenCalledWith('/(tabs)/orders');
    });

    it('falls back to the notifications tab when the payload has no screen or order info', async () => {
      const onResponse = await renderAndGetResponseCallback();

      act(() => {
        onResponse({ notification: { request: { content: { data: { some: 'thing' } } } } });
      });

      expect(mockedRouterPush).toHaveBeenCalledWith('/(tabs)/notifications');
    });

    it('does nothing when the notification payload has no data', async () => {
      const onResponse = await renderAndGetResponseCallback();

      act(() => {
        onResponse({ notification: { request: { content: { data: null } } } });
      });

      expect(mockedRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('cold start navigation', () => {
    it('navigates after a delay when the app was opened from a notification', async () => {
      mockedGetLastResponse.mockResolvedValue({
        notification: { request: { content: { data: { order_id: '9', for_role: 'customer' } } } },
      });
      mockAuth('tok-123');

      renderHook(() => useNotifications(), { wrapper: NotificationProvider });

      await waitFor(() => expect(mockedGetLastResponse).toHaveBeenCalled());
      // The handler is scheduled ~500ms after the cold-start response resolves.
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });

      expect(mockedRouterPush).toHaveBeenCalledWith('/(tabs)/orders');
    }, 10000);

    it('does not navigate when the app was not opened from a notification', async () => {
      mockedGetLastResponse.mockResolvedValue(null);
      mockAuth('tok-123');

      renderHook(() => useNotifications(), { wrapper: NotificationProvider });

      await waitFor(() => expect(mockedGetLastResponse).toHaveBeenCalled());
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });

      expect(mockedRouterPush).not.toHaveBeenCalled();
    }, 10000);

    it('does not check for a cold-start notification on web', async () => {
      Platform.OS = 'web';
      mockAuth('tok-123');

      renderHook(() => useNotifications(), { wrapper: NotificationProvider });
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockedGetLastResponse).not.toHaveBeenCalled();
    });
  });

  describe('app foreground re-sync', () => {
    it('refreshes the unread count and re-registers the push token when returning to the foreground', async () => {
      const removeSubscription = jest.fn();
      const addEventListenerSpy = jest
        .spyOn(AppState, 'addEventListener')
        .mockReturnValue({ remove: removeSubscription } as any);
      mockAuth('tok-123');

      const { unmount } = renderHook(() => useNotifications(), { wrapper: NotificationProvider });
      await waitFor(() => expect(mockedApiGet).toHaveBeenCalledTimes(1));

      const changeHandler = addEventListenerSpy.mock.calls.find(call => call[0] === 'change')?.[1];
      expect(changeHandler).toBeDefined();

      mockedApiGet.mockClear();
      mockedRegister.mockClear();

      // Go to background, then back to active — this is the transition the
      // provider listens for.
      act(() => {
        changeHandler!('background');
      });
      act(() => {
        changeHandler!('active');
      });

      await waitFor(() => expect(mockedApiGet).toHaveBeenCalledTimes(1));
      expect(mockedRegister).toHaveBeenCalledWith('tok-123');

      unmount();
      expect(removeSubscription).toHaveBeenCalled();
    });

    it('does not refetch when the app was already active', async () => {
      const addEventListenerSpy = jest
        .spyOn(AppState, 'addEventListener')
        .mockReturnValue({ remove: jest.fn() } as any);
      mockAuth('tok-123');

      renderHook(() => useNotifications(), { wrapper: NotificationProvider });
      await waitFor(() => expect(mockedApiGet).toHaveBeenCalledTimes(1));

      const changeHandler = addEventListenerSpy.mock.calls.find(call => call[0] === 'change')?.[1];
      mockedApiGet.mockClear();

      // active -> active is not a background-to-foreground transition.
      act(() => {
        changeHandler!('active');
      });

      expect(mockedApiGet).not.toHaveBeenCalled();
    });
  });
});
