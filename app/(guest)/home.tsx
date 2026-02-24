import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';

/**
 * Guest landing: promotions carousel, categories, featured products.
 * CTA: Shop, Become a Vendor, Become a Transporter.
 * (Logged-in users are redirected from index by role.)
 */
export default function GuestHomeScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 16,
          paddingBottom: 48 + insets.bottom,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>TolaTola</Text>
        <Text style={styles.tagline}>Secure marketplace. Track every order.</Text>
      </View>

      <View style={styles.promo}>
        <Text style={styles.promoTitle}>Promotions</Text>
        <View style={styles.promoCard}>
          <Text style={styles.promoPlaceholder}>Promotions carousel</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.categoryRow}>
          <Pressable style={styles.categoryChip} onPress={() => router.push('/(guest)/shop')}>
            <Text style={styles.categoryChipText}>Fresh</Text>
          </Pressable>
          <Pressable style={styles.categoryChip} onPress={() => router.push('/(guest)/shop')}>
            <Text style={styles.categoryChipText}>Handmade</Text>
          </Pressable>
          <Pressable style={styles.categoryChip} onPress={() => router.push('/(guest)/shop')}>
            <Text style={styles.categoryChipText}>All</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.ctaSection}>
        <Pressable
          style={styles.ctaPrimary}
          onPress={() => router.push('/(guest)/shop')}
        >
          <Text style={styles.ctaPrimaryText}>Shop</Text>
        </Pressable>
        <Pressable
          style={styles.ctaSecondary}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={styles.ctaSecondaryText}>Become a Vendor</Text>
        </Pressable>
        <Pressable
          style={styles.ctaSecondary}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={styles.ctaSecondaryText}>Become a Transporter</Text>
        </Pressable>
        <Pressable
          style={styles.linkBtn}
          onPress={() => router.push('/(guest)/track')}
        >
          <Text style={styles.linkBtnText}>Track order</Text>
        </Pressable>
      </View>

      <View style={styles.authLinks}>
        <Pressable onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.authLinkText}>Log in</Text>
        </Pressable>
        <Text style={styles.authLinkDivider}>·</Text>
        <Pressable onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.authLinkText}>Sign up</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  content: { paddingBottom: 24 },
  header: { marginBottom: 24 },
  logo: { fontSize: 28, fontWeight: '700', color: Theme.primary },
  tagline: { fontSize: 15, color: Theme.textSecondary, marginTop: 4 },
  promo: { marginBottom: 24 },
  promoTitle: { fontSize: 18, fontWeight: '600', color: Theme.text, marginBottom: 12 },
  promoCard: {
    height: 160,
    backgroundColor: Theme.background,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  promoPlaceholder: { color: Theme.textMuted },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Theme.text, marginBottom: 12 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Theme.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  categoryChipText: { fontSize: 14, color: Theme.text },
  ctaSection: { gap: 12, marginTop: 8 },
  ctaPrimary: {
    backgroundColor: Theme.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  ctaSecondary: {
    backgroundColor: Theme.background,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  ctaSecondaryText: { fontSize: 15, color: Theme.text },
  linkBtn: { alignItems: 'center', paddingVertical: 12 },
  linkBtnText: { fontSize: 15, color: Theme.link },
  authLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    gap: 8,
  },
  authLinkText: { fontSize: 15, color: Theme.link },
  authLinkDivider: { color: Theme.textMuted },
});
