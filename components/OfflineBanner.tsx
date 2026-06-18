import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';

interface OfflineBannerProps {
  onRetry?: () => void;
}

export function OfflineBanner({ onRetry }: OfflineBannerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <FontAwesome name="exclamation-circle" size={16} color="#ffffff" style={styles.icon} />
        <Text style={styles.text} numberOfLines={1}>
          Offline Mode. Showing cached data.
        </Text>
      </View>
      {onRetry && (
        <Pressable style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]} onPress={onRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ea580c', // Sleek orange for warning/status
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Theme.radiusSm,
  },
  retryBtnPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  retryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
