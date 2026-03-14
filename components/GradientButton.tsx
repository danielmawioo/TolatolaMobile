import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { Theme } from '@/constants/Theme';

const MIN_TOUCH_HEIGHT = 48;

export type GradientButtonProps = {
  onPress: () => void;
  title: string;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  /** Accessibility label (defaults to title) */
  accessibilityLabel?: string;
};

export function GradientButton({
  onPress,
  title,
  loading,
  disabled,
  style,
  accessibilityLabel = title,
}: GradientButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        style,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Theme.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: Theme.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_HEIGHT,
  },
  pressed: { opacity: 0.9 },
  text: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
