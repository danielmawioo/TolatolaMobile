import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { scaleByWidth } from '@/constants/layout';

/**
 * Back to home arrow for auth (and other) screens. Navigates to main app (tabs).
 */
export function BackToHomeButton() {
  return (
    <Pressable
      style={styles.wrapper}
      onPress={() => router.replace('/(tabs)')}
      hitSlop={12}
    >
      <FontAwesome name="arrow-left" size={scaleByWidth(22)} color={Theme.text} />
      <Text style={styles.label}>Home</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingVertical: scaleByWidth(10),
    paddingRight: scaleByWidth(16),
    marginBottom: scaleByWidth(16),
    gap: scaleByWidth(8),
  },
  label: {
    fontSize: scaleByWidth(16),
    color: Theme.text,
    fontWeight: '500',
  },
});
