import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';
import { scaleByWidth } from '@/constants/layout';

type Props = {
  /** Shown under the logo (e.g. "Loading…" or "Signing you in…") */
  message?: string;
};

/**
 * Lightweight startup / routing loader — pulsing logo + animated dots (no extra deps).
 */
export function BrandedBootScreen({ message = 'Loading…' }: Props) {
  const insets = useSafeAreaInsets();
  const logoScale = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0.85)).current;
  const textOpacity = useRef(new Animated.Value(0.6)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(logoScale, {
            toValue: 1.06,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 0.88,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();

    const textBreath = Animated.loop(
      Animated.sequence([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 0.55,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    textBreath.start();

    const stagger = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.25,
            duration: 320,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(200),
        ])
      );

    const d1 = stagger(dot1, 0);
    const d2 = stagger(dot2, 150);
    const d3 = stagger(dot3, 300);
    d1.start();
    d2.start();
    d3.start();

    return () => {
      pulse.stop();
      textBreath.stop();
      d1.stop();
      d2.stop();
      d3.stop();
    };
  }, [logoScale, logoOpacity, textOpacity, dot1, dot2, dot3]);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View style={{ transform: [{ scale: logoScale }], opacity: logoOpacity }}>
        <Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
      </Animated.View>
      <Animated.Text style={[styles.brand, { opacity: textOpacity }]}>TOLA</Animated.Text>
      <Animated.Text style={[styles.message, { opacity: textOpacity }]}>{message}</Animated.Text>
      <View style={styles.dots}>
        <Animated.View style={[styles.dot, { opacity: dot1 }]} />
        <Animated.View style={[styles.dot, { opacity: dot2 }]} />
        <Animated.View style={[styles.dot, { opacity: dot3 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Theme.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: scaleByWidth(88),
    height: scaleByWidth(88),
    borderRadius: scaleByWidth(18),
    marginBottom: scaleByWidth(16),
  },
  brand: {
    fontSize: scaleByWidth(22),
    fontWeight: '800',
    color: Theme.primary,
    letterSpacing: 1,
    marginBottom: scaleByWidth(8),
  },
  message: {
    fontSize: scaleByWidth(14),
    color: Theme.textSecondary,
    marginBottom: scaleByWidth(20),
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleByWidth(10),
  },
  dot: {
    width: scaleByWidth(8),
    height: scaleByWidth(8),
    borderRadius: scaleByWidth(4),
    backgroundColor: Theme.primary,
  },
});
