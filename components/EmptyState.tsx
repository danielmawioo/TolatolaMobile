import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';

type IconName = React.ComponentProps<typeof FontAwesome>['name'];

interface EmptyStateProps {
  /** FontAwesome icon name (e.g. 'inbox', 'heart-o') */
  icon: IconName;
  title: string;
  message: string;
  /** Optional primary CTA */
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.wrapper, style]}>
      <FontAwesome
        name={icon}
        size={48}
        color={Theme.textMuted}
        style={styles.icon}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel != null && onAction != null && (
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onAction}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Theme.background,
    borderRadius: Theme.radiusLg,
    padding: 32,
    alignItems: 'center',
    ...Theme.shadowSm,
  },
  icon: { marginBottom: 16 },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: Theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    backgroundColor: Theme.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: Theme.radiusMd,
    ...Theme.shadowSm,
  },
  buttonPressed: { opacity: 0.9 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
