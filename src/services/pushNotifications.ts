import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiPost } from './api';

// Configure how notifications appear when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and return the Expo push token.
 * Sends the token to the backend so it can send push notifications.
 */
export async function registerForPushNotifications(accessToken?: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[PUSH] Must use physical device for push notifications');
    return null;
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[PUSH] Failed to get push token — permission denied');
    return null;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'TOLA Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Orders',
      description: 'Order status updates',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('delivery', {
      name: 'Delivery',
      description: 'Delivery and assignment updates',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });
    const token = tokenData.data;
    console.log('[PUSH] Expo push token:', token);

    // Send token to backend
    if (token) {
      try {
        if (accessToken) {
          await apiPost('/profile/fcm-token', { token, platform: Platform.OS }, accessToken);
          console.log('[PUSH] Token registered with backend (authenticated)');
        } else {
          await apiPost('/notifications/register-guest-token', { token, platform: Platform.OS });
          console.log('[PUSH] Token registered with backend (guest)');
        }
      } catch (e) {
        console.error('[PUSH] Failed to register token with backend:', e);
      }
    }

    return token;
  } catch (error) {
    console.error('[PUSH] Error getting push token:', error);
    return null;
  }
}

/**
 * Schedule a local notification (for testing or local reminders)
 */
export async function sendLocalNotification(title: string, body: string, data?: Record<string, unknown>) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: 'default',
    },
    trigger: null, // immediately
  });
}

/**
 * Get the badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set the badge count
 */
export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}
