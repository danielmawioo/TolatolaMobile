import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { GradientButton } from '@/components/GradientButton';
import { BackToHomeButton } from '@/components/BackToHomeButton';
import { ScreenSafeLayout } from '@/components/ScreenSafeLayout';
import { Theme } from '@/constants/Theme';
import { scaleByHeight, scaleByWidth } from '@/constants/layout';

export default function WelcomeScreen() {
  return (
    <ScreenSafeLayout style={styles.safeWrapper}>
      <View style={styles.container}>
        <BackToHomeButton />
      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <Text style={styles.logo}>TOLA</Text>
        </View>
        <Text style={styles.title}>Welcome to{'\n'}TOLA</Text>
        <Text style={styles.tagline}>
          Digital Trade & Supply Chain Ecosystem.{'\n'}Registered with TRA, BRELA & TCRA.
        </Text>
      </View>
      <View style={styles.dots}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
      <View style={styles.actions}>
        <GradientButton
          title="Get started"
          onPress={() => router.push('/(auth)/signup')}
        />
        <Pressable
          style={styles.loginLink}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.loginLinkText}>
            I have an account — <Text style={styles.loginLinkHighlight}>Log in</Text>
          </Text>
        </Pressable>
      </View>
    </View>
    </ScreenSafeLayout>
  );
}

const styles = StyleSheet.create({
  safeWrapper: { width: '100%' },
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: Theme.background,
    paddingTop: scaleByHeight(24),
    paddingBottom: scaleByHeight(48),
    justifyContent: 'space-between',
  },
  content: { flex: 1, justifyContent: 'center' },
  logoWrap: { marginBottom: scaleByWidth(24) },
  logo: {
    fontSize: scaleByWidth(28),
    fontWeight: '700',
    color: Theme.primary,
  },
  title: {
    fontSize: scaleByWidth(28),
    fontWeight: '700',
    color: Theme.text,
    lineHeight: scaleByWidth(36),
    marginBottom: scaleByWidth(12),
  },
  tagline: {
    fontSize: scaleByWidth(16),
    color: Theme.textSecondary,
    lineHeight: scaleByWidth(24),
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scaleByWidth(8),
    marginBottom: scaleByHeight(32),
  },
  dot: {
    width: scaleByWidth(8),
    height: scaleByWidth(8),
    borderRadius: scaleByWidth(4),
    backgroundColor: Theme.inputBorder,
  },
  dotActive: { backgroundColor: Theme.primary, width: scaleByWidth(24) },
  actions: { gap: scaleByHeight(20), alignItems: 'center' },
  loginLink: { paddingVertical: scaleByWidth(8) },
  loginLinkText: { fontSize: scaleByWidth(15), color: Theme.textSecondary },
  loginLinkHighlight: { color: Theme.link, fontWeight: '600' },
});
