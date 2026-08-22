import React from 'react';
import { Pressable } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { NotificationsFeed } from '@/components/NotificationsFeed';
import { Theme } from '@/constants/Theme';

export default function AdminNotificationsScreen() {
  return (
    <NotificationsFeed
      leadingAccessory={
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Go back">
          <FontAwesome name="chevron-left" size={20} color={Theme.link} />
        </Pressable>
      }
    />
  );
}
