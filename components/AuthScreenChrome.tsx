import React from 'react';
import { View, Text, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { BackToHomeButton } from '@/components/BackToHomeButton';
import { Theme } from '@/constants/Theme';
import { gap, scaleByWidth } from '@/constants/layout';

type AuthScreenChromeProps = {
  headline: string;
  subtitle: string;
  /** Short label above headline (e.g. brand line). */
  eyebrow?: string;
  logoSource?: ImageSourcePropType;
  children: React.ReactNode;
};

export function AuthScreenChrome({
  headline,
  subtitle,
  eyebrow = 'TOLA',
  logoSource = require('@/assets/images/icon.png'),
  children,
}: AuthScreenChromeProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <BackToHomeButton tone="default" />
        <View style={styles.brandRow}>
          <View style={styles.logoRing}>
            <Image source={logoSource} style={styles.logo} />
          </View>
          {eyebrow ? <Text style={styles.brandText}>{eyebrow}</Text> : null}
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  hero: {
    backgroundColor: 'transparent',
    paddingHorizontal: gap.md,
    paddingTop: 4,
    paddingBottom: scaleByWidth(10),
  },
  brandRow: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  logoRing: {
    width: scaleByWidth(54),
    height: scaleByWidth(54),
    borderRadius: 8,
    backgroundColor: Theme.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  logo: {
    width: scaleByWidth(34),
    height: scaleByWidth(34),
    borderRadius: 6,
  },
  brandText: {
    fontSize: scaleByWidth(28),
    fontWeight: '600',
    color: Theme.textMuted,
  },
  headline: {
    fontSize: scaleByWidth(24),
    fontWeight: '800',
    color: Theme.text,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: scaleByWidth(15),
    lineHeight: scaleByWidth(22),
    color: Theme.textSecondary,
    marginBottom: scaleByWidth(22),
  },
  card: {
    marginHorizontal: gap.md,
    backgroundColor: Theme.background,
    borderRadius: 16,
    paddingHorizontal: gap.md,
    paddingTop: scaleByWidth(22),
    paddingBottom: scaleByWidth(22),
    ...Theme.shadowSm,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
});
