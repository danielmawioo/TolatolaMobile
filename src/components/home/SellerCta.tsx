import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Theme } from '@/constants/Theme';

export function SellerCta() {
  return (
    <View style={styles.ctaSection}>
      <View style={styles.ctaBadge}>
        <Text style={styles.ctaBadgeText}>OPEN FOR ENROLLMENT</Text>
      </View>
      <Text style={styles.ctaTitle}>Grow Your Brand{"\n"}Across <Text style={{ color: 'rgba(255,255,255,0.4)' }}>Tanzania</Text></Text>
      <Text style={styles.ctaDesc}>Join 500+ verified merchants. Secure mobile money payouts, managed logistics, and payment protection for every sale.</Text>

      <Pressable style={styles.ctaBtn} onPress={() => router.push('/(auth)/signup')}>
        <Text style={styles.ctaBtnText}>Become a seller</Text>
      </Pressable>
      <Pressable style={styles.ctaBtnOutline} onPress={() => router.push('/(tabs)/shop')}>
        <Text style={styles.ctaBtnOutlineText}>Contact Sales</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  ctaSection: {
    backgroundColor: Theme.primary, borderRadius: 24, marginHorizontal: 16, marginTop: 40,
    padding: 32, overflow: 'hidden',
  },
  ctaBadge: { alignSelf: 'flex-start', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  ctaBadgeText: { color: Theme.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  ctaTitle: { color: '#fff', fontSize: 28, fontWeight: '900', lineHeight: 32, marginBottom: 16 },
  ctaDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 32, lineHeight: 22 },
  ctaBtn: { backgroundColor: '#1c1917', paddingVertical: 18, borderRadius: 14, alignItems: 'center', marginBottom: 12 },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  ctaBtnOutline: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  ctaBtnOutlineText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
