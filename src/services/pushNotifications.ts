import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiPost } from './api';
import { logger } from '@/src/lib/logger';
import { PushTokenInputSchema } from '@/src/schemas/support';

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
  if (!Device.isDevice && Platform.OS === 'ios') {
    logger.info('[PUSH] Must use physical device for iOS push notifications');
    return null;
  }

  if (!Device.isDevice) {
    logger.info('[PUSH] Simulator/Emulator detected. Proceeding with Android push registration...');
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    logger.info('[PUSH] Failed to get push token — permission denied');
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
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || 'e2e4ea34-64fc-4698-9baf-329e34255023';
    logger.info('[PUSH] Retrieving Expo push token with projectId:', projectId);
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenData.data;
    logger.info('[PUSH] Expo push token retrieved successfully:', token);

    // Send token to backend
    if (token) {
      try {
        const body = PushTokenInputSchema.parse({ token, platform: Platform.OS });
        if (accessToken) {
          logger.info('[PUSH] Attempting to register authenticated token with backend...');
          const result = await apiPost('/profile/fcm-token', body, accessToken);
          logger.info('[PUSH] Authenticated token registered successfully:', result);
        } else {
          logger.info('[PUSH] Attempting to register guest token with backend...');
          const result = await apiPost('/notifications/register-guest-token', body);
          logger.info('[PUSH] Guest token registered successfully:', result);
        }
      } catch (e: any) {
        logger.error('[PUSH] Failed to register token with backend. Error details:', e.message || e);
      }
    }

    return token;
  } catch (error: any) {
    logger.error('[PUSH] Error getting push token:', error.message || error);
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
