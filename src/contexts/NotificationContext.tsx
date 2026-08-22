import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { AppState, Platform } from 'react-native';
import { useAuth } from './AuthContext';
import { registerForPushNotifications, setBadgeCount } from '@/src/services/pushNotifications';
import { apiGet } from '@/src/services/api';
import { logger } from '@/src/lib/logger';

type NotificationContextValue = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  expoPushToken: string | null;
};

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
  expoPushToken: null,
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const appState = useRef(AppState.currentState);

  // Fetch unread notification count from the backend
  const refreshUnreadCount = useCallback(async () => {
    if (!session?.access_token) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await apiGet<any>('/notifications?limit=100', session.access_token);
      const notifications = res?.data || [];
      const count = notifications.filter((n: any) => !n.is_read).length;
      setUnreadCount(count);
      setBadgeCount(count).catch((err) => logger.warn('[NotificationContext] badge count sync failed', err));
    } catch {
      // Silently fail
    }
  }, [session?.access_token]);

  // Register push token on login / app start / guest mode
  useEffect(() => {
    if (Platform.OS === 'web') {
      setExpoPushToken(null);
      return;
    }

    registerForPushNotifications(session?.access_token)
      .then(token => {
        if (token) {
          setExpoPushToken(token);
          logger.info('[NOTIFICATIONS] Push token registered:', token);
        }
      })
      .catch(e => logger.warn('[NOTIFICATIONS] Token registration failed:', e));
  }, [session?.access_token]);

  // Set up notification listeners
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Listener for when a notification is received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      logger.info('[NOTIFICATIONS] Received in foreground:', notification.request.content.title);
      // Increment badge count immediately
      setUnreadCount(prev => {
        const newCount = prev + 1;
        setBadgeCount(newCount).catch((err) => logger.warn('[NotificationContext] badge count sync failed', err));
        return newCount;
      });
    });

    // Listener for when user taps a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      logger.info('[NOTIFICATIONS] Tapped notification data:', data);
      handleNotificationNavigation(data);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Re-fetch unread count when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground — refresh unread count and re-register token
        refreshUnreadCount();
        if (Platform.OS !== 'web') {
          registerForPushNotifications(session?.access_token).catch((err) => logger.warn('[NotificationContext] push re-registration failed', err));
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [refreshUnreadCount, session?.access_token]);

  // Initial unread count fetch
  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Check if app was opened from a notification (cold start)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        const data = response.notification.request.content.data;
        logger.info('[NOTIFICATIONS] Cold start from notification:', data);
        // Small delay to let navigation mount
        setTimeout(() => handleNotificationNavigation(data), 500);
      }
    }).catch((err) => logger.warn('[NotificationContext] cold-start notification lookup failed', err));
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount, expoPushToken }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

/**
 * Navigate to the appropriate screen based on notification data.
 */
function handleNotificationNavigation(data: any) {
  if (!data) return;

  try {
    // Direct screen navigation (sent from backend as `screen` field)
    let targetScreen = data.screen;
    if (targetScreen === '/(tabs)/assignments' || targetScreen === 'assignments' || targetScreen?.includes('assignments')) {
      targetScreen = '/(transporter)/dashboard?tab=Deliveries';
    } else if (targetScreen === '/(tabs)/orders' && data.for_role === 'vendor') {
      targetScreen = '/(vendor)/dashboard?tab=Orders';
    }

    if (targetScreen) {
      router.push(targetScreen as any);
      return;
    }

    // Role-based routing
    const role = data.for_role;

    if (data.order_id || data.orderId) {
      if (role === 'vendor') {
        router.push('/(vendor)/dashboard?tab=Orders' as any);
      } else if (role === 'transporter') {
        router.push('/(transporter)/dashboard?tab=Deliveries' as any);
      } else {
        // Customer
        router.push('/(tabs)/orders' as any);
      }
      return;
    }

    // Fallback: go to notifications tab
    router.push('/(tabs)/notifications' as any);
  } catch (e) {
    logger.error('[NOTIFICATIONS] Navigation error:', e);
  }
}
