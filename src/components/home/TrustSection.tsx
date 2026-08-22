import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import type { useThemeColors } from '@/src/hooks/useThemeColors';

type ThemeColors = ReturnType<typeof useThemeColors>;

const trustFeatures = [
  {
    title: 'Secure Payments',
    desc: 'Your payments are protected with encrypted escrow and processed securely by licensed PSPs.',
    image: require('../../../assets/images/trust-secure-payments.png'),
    badge: 'Encrypted Escrow',
    badgeBg: '#eff6ff',
    badgeText: '#1d61e7',
    badgeBorder: '#bfdbfe',
  },
  {
    title: 'NIDA Verified',
    desc: 'Every vendor undergoes rigorous NIDA identity and business vetting before listing products.',
    image: require('../../../assets/images/trust-nida-verified.png'),
    badge: 'Verified Merchant',
    badgeBg: '#ecfdf5',
    badgeText: '#047857',
    badgeBorder: '#a7f3d0',
  },
  {
    title: 'Swift Delivery',
    desc: 'Local express logistics partners ensure your orders reach your doorstep in record time.',
    image: require('../../../assets/images/trust-swift-delivery.png'),
    badge: 'Speed Logistics',
    badgeBg: '#fffbeb',
    badgeText: '#b45309',
    badgeBorder: '#fde68a',
  },
];

interface TrustSectionProps {
  theme: ThemeColors;
}

export function TrustSection({ theme }: TrustSectionProps) {
  return (
    <View style={[styles.section, { backgroundColor: theme.trustSectionBg, paddingVertical: 28, marginHorizontal: -16, paddingHorizontal: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.trustSectionBorder }]}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <View style={styles.trustHeaderBadge}>
          <FontAwesome name="shield" size={12} color={Theme.primary} />
          <Text style={styles.trustHeaderBadgeText}>MULTI-LAYER PROTECTION</Text>
        </View>
        <Text style={[styles.sectionTitle, { textAlign: 'center', marginTop: 8, color: theme.text }]}>
          Engineered for <Text style={styles.italicPrimary}>Trust</Text>
        </Text>
        <Text style={[styles.trustDesc, { color: theme.textSecondary }]}>
          We've built a multi-layered security framework to protect both the buyer and the merchant at every step.
        </Text>
      </View>

      <View style={styles.trustCardsContainer}>
        {trustFeatures.map((f, i) => (
          <View key={i} style={[styles.trustCard, { backgroundColor: theme.trustCardBg, borderColor: theme.trustSectionBorder }]}>
            <View style={styles.trustImgBox}>
              <Image source={f.image} style={styles.trustImg} resizeMode="cover" />
              <View style={styles.trustImgOverlay} />
              <View style={[styles.trustBadgePill, { backgroundColor: f.badgeBg, borderColor: f.badgeBorder }]}>
                <Text style={[styles.trustBadgePillText, { color: f.badgeText }]}>{f.badge}</Text>
              </View>
            </View>

            <View style={styles.trustCardBody}>
              <Text style={[styles.trustCardTitle, { color: theme.trustCardTitle }]}>{f.title}</Text>
              <Text style={[styles.trustCardDesc, { color: theme.textSecondary }]}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 32 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: Theme.text },
  italicPrimary: { color: Theme.primary, fontStyle: 'italic' },
  trustHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Theme.primary + '30',
  },
  trustHeaderBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.primary,
    letterSpacing: 1,
  },
  trustDesc: {
    fontSize: 12,
    color: Theme.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  trustCardsContainer: {
    gap: 16,
  },
  trustCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    overflow: 'hidden',
    ...Theme.shadowSm,
  },
  trustImgBox: {
    width: '100%',
    height: 140,
    position: 'relative',
    backgroundColor: '#1c1917',
  },
  trustImg: {
    width: '100%',
    height: '100%',
  },
  trustImgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  trustBadgePill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  trustBadgePillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  trustCardBody: {
    padding: 16,
  },
  trustCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1c1917',
    marginBottom: 4,
  },
  trustCardDesc: {
    fontSize: 12,
    color: Theme.textSecondary,
    lineHeight: 18,
  },
});
