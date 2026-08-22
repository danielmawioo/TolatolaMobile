import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import type { useThemeColors } from '@/src/hooks/useThemeColors';
import type { SupplyChainNotification } from '@/src/hooks/useHomeScreenData';

type ThemeColors = ReturnType<typeof useThemeColors>;

interface SupplyChainBannerProps {
  theme: ThemeColors;
  notification: SupplyChainNotification;
}

export function SupplyChainBanner({ theme, notification }: SupplyChainBannerProps) {
  return (
    <Pressable
      style={[styles.scNotificationBanner, { backgroundColor: theme.cardBackground, borderColor: theme.primary + '30' }]}
      onPress={() => {
        const pid = notification.data?.product_id || notification.data?.productId;
        if (pid) {
          router.push(`/(guest)/product/${pid}`);
        } else {
          router.push('/(tabs)/shop');
        }
      }}
    >
      <View style={styles.scNotifLeft}>
        <View style={styles.scNotifIconBg}>
          <FontAwesome
            name={
              notification.type === 'price_change'
                ? 'tag'
                : notification.type === 'stock_update'
                ? 'archive'
                : 'star'
            }
            size={14}
            color="#fff"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.scNotifTitle, { color: theme.text }]} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={[styles.scNotifMessage, { color: theme.textSecondary }]} numberOfLines={1}>
            {notification.message}
          </Text>
        </View>
      </View>
      <FontAwesome name="chevron-right" size={12} color={theme.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scNotificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: Theme.primary + '30',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    ...Theme.shadowSm,
  },
  scNotifLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  scNotifIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scNotifTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.text,
  },
  scNotifMessage: {
    fontSize: 11,
    color: Theme.textSecondary,
    marginTop: 1,
  },
});
