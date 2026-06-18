import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';

interface OfflineMessageProps {
  type: 'categories' | 'products' | 'general';
  onRetry: () => void;
}

export function OfflineMessage({ type, onRetry }: OfflineMessageProps) {
  const title = type === 'categories' ? 'No Categories Available' : type === 'products' ? 'No Products Available' : 'Connection Error';
  const description = type === 'categories' 
    ? 'Please connect to the internet to see categories.'
    : type === 'products'
    ? 'Please connect to the internet to see products.'
    : 'Please check your internet connection and try again.';

  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <FontAwesome name="wifi" size={36} color={Theme.primary} />
        <View style={styles.offlineSlash}>
          <FontAwesome name="ban" size={42} color={Theme.error} style={styles.banIcon} />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} onPress={onRetry}>
        <FontAwesome name="refresh" size={14} color="#ffffff" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>Try Again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: Theme.radiusLg,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 24,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    ...Theme.shadowMd,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Theme.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  offlineSlash: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  banIcon: {
    opacity: 0.7,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: Theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: Theme.radiusMd,
    ...Theme.shadowSm,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
