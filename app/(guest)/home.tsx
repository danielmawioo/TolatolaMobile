import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';
import { COPY } from '@/constants/copy';

/**
 * Guest landing — tolatola.co content: TOLA Tanzania, TOLA Pay, Shop by Category,
 * Verified Vendors, Grow Your Brand. Digital Trade & Supply Chain Ecosystem.
 */
const CATEGORIES = [
  { id: 'fmcg', label: 'FMCG' },
  { id: 'agriculture', label: 'Agriculture' },
  { id: 'construction', label: 'Construction' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'food', label: 'Food & Beverages' },
  { id: 'health', label: 'Health & Beauty' },
  { id: 'services', label: 'Services' },
];

export default function GuestHomeScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 20,
          paddingBottom: 48 + insets.bottom,
          paddingHorizontal: gap.md,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>TOLA Tanzania</Text>
        <Text style={styles.tagline}>{COPY.tagline}</Text>
      </View>

      {/* TOLA Pay — tolatola.co */}
      <Pressable
        style={[styles.promoCard, Theme.shadowMd]}
        onPress={() => router.push('/(guest)/shop')}
      >
        <View style={styles.promoInner}>
          <Text style={styles.promoLabel}>Special Offer</Text>
          <Text style={styles.promoTitle}>TOLA Pay</Text>
          <Text style={styles.promoSub}>Turn Products into Deals. Deals into Deliveries.</Text>
          <Text style={styles.promoCta}>Trade Beyond Expectations →</Text>
        </View>
        <View style={styles.promoIconWrap}>
          <FontAwesome name="credit-card" size={40} color="rgba(255,255,255,0.9)" />
        </View>
      </Pressable>

      {/* Verified Vendors — tolatola.co */}
      <View style={[styles.trustStrip, Theme.shadowSm]}>
        <FontAwesome name="check-circle" size={20} color={Theme.verified} />
        <Text style={styles.trustText}>Verified Vendors. Guaranteed Quality.</Text>
      </View>

      {/* Shop by Category */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shop by Category</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.id}
              style={({ pressed }) => [styles.categoryChip, pressed && { opacity: 0.8 }]}
              onPress={() => router.push('/(guest)/shop')}
            >
              <Text style={styles.categoryChipText}>{c.label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => router.push('/(guest)/shop')} style={styles.viewCatalog}>
          <Text style={styles.viewCatalogText}>View entire catalog</Text>
          <FontAwesome name="angle-right" size={14} color={Theme.primary} />
        </Pressable>
      </View>

      {/* Engineered for Trust — tolatola.co */}
      <View style={[styles.trustSection, Theme.shadowSm]}>
        <Text style={styles.trustSectionTitle}>Engineered for Trust</Text>
        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <FontAwesome name="lock" size={18} color={Theme.primary} />
            <Text style={styles.trustItemLabel}>Secure Payments</Text>
          </View>
          <View style={styles.trustItem}>
            <FontAwesome name="id-card" size={18} color={Theme.primary} />
            <Text style={styles.trustItemLabel}>NIDA Verified</Text>
          </View>
          <View style={styles.trustItem}>
            <FontAwesome name="truck" size={18} color={Theme.primary} />
            <Text style={styles.trustItemLabel}>Swift Delivery</Text>
          </View>
        </View>
      </View>

      {/* Grow Your Brand — tolatola.co */}
      <View style={[styles.vendorCard, Theme.shadowMd]}>
        <Text style={styles.vendorCardTitle}>Grow Your Brand Across Tanzania</Text>
        <Text style={styles.vendorCardSub}>Join 500+ verified merchants. Secure payouts, managed logistics, payment protection.</Text>
        <Pressable
          style={styles.vendorCta}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={styles.vendorCtaText}>Become a seller</Text>
        </Pressable>
      </View>

      <View style={styles.ctaSection}>
        <Pressable style={styles.ctaPrimary} onPress={() => router.push('/(guest)/shop')}>
          <Text style={styles.ctaPrimaryText}>Shop now</Text>
        </Pressable>
        <Pressable style={styles.ctaSecondary} onPress={() => router.push('/(guest)/track')}>
          <FontAwesome name="map-marker" size={16} color={Theme.primary} style={{ marginRight: 8 }} />
          <Text style={styles.ctaSecondaryText}>Track order</Text>
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
  logo: { fontSize: 26, fontWeight: '800', color: Theme.text, letterSpacing: 0.5 },
  tagline: { fontSize: 15, color: Theme.textSecondary, marginTop: 6, lineHeight: 22 },
  promoCard: {
    flexDirection: 'row',
    backgroundColor: Theme.primary,
    borderRadius: Theme.radiusLg,
    padding: gap.lg,
    minHeight: 140,
    marginBottom: gap.lg,
    alignItems: 'center',
  },
  promoInner: { flex: 1 },
  promoLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: 4 },
  promoTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 6 },
  promoSub: { fontSize: 14, color: 'rgba(255,255,255,0.95)', marginBottom: 10 },
  promoCta: { fontSize: 14, fontWeight: '600', color: '#fff' },
  promoIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  trustStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.background,
    borderRadius: Theme.radiusMd,
    padding: gap.md,
    marginBottom: gap.lg,
    gap: gap.sm,
  },
  trustText: { flex: 1, fontSize: 14, fontWeight: '600', color: Theme.text },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Theme.text, marginBottom: 12 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Theme.background,
    borderRadius: 20,
    ...Theme.shadowSm,
  },
  categoryChipText: { fontSize: 14, color: Theme.text, fontWeight: '500' },
  viewCatalog: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 },
  viewCatalogText: { fontSize: 14, fontWeight: '600', color: Theme.primary },
  trustSection: {
    backgroundColor: Theme.background,
    borderRadius: Theme.radiusMd,
    padding: gap.lg,
    marginBottom: gap.lg,
  },
  trustSectionTitle: { fontSize: 16, fontWeight: '700', color: Theme.text, marginBottom: 14 },
  trustRow: { flexDirection: 'row', justifyContent: 'space-between' },
  trustItem: { alignItems: 'center', flex: 1 },
  trustItemLabel: { fontSize: 12, fontWeight: '600', color: Theme.textSecondary, marginTop: 6 },
  vendorCard: {
    backgroundColor: Theme.background,
    borderRadius: Theme.radiusLg,
    padding: gap.lg,
    marginBottom: gap.lg,
  },
  vendorCardTitle: { fontSize: 18, fontWeight: '700', color: Theme.text, marginBottom: 8 },
  vendorCardSub: { fontSize: 14, color: Theme.textSecondary, lineHeight: 20, marginBottom: 16 },
  vendorCta: { backgroundColor: Theme.primary, paddingVertical: 14, borderRadius: Theme.radiusMd, alignItems: 'center' },
  vendorCtaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  ctaSection: { gap: 12 },
  ctaPrimary: {
    backgroundColor: Theme.primary,
    paddingVertical: 16,
    borderRadius: Theme.radiusLg,
    alignItems: 'center',
  },
  ctaPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.background,
    paddingVertical: 14,
    borderRadius: Theme.radiusLg,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  ctaSecondaryText: { fontSize: 15, color: Theme.text, fontWeight: '600' },
  authLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    gap: 8,
  },
  authLinkText: { fontSize: 15, color: Theme.link, fontWeight: '600' },
  authLinkDivider: { color: Theme.textMuted },
});
