import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { useThemeColors } from '@/src/hooks/useThemeColors';

type ThemeColors = ReturnType<typeof useThemeColors>;

export function BenefitsStrip({ theme }: { theme: ThemeColors }) {
  return (
    <View style={styles.benefitsStrip}>
      <View style={styles.benefitItem}>
        <FontAwesome name="shield" size={18} color={theme.primary} />
        <Text style={styles.benefitText}>SECURE PAYMENTS</Text>
      </View>
      <View style={styles.benefitItem}>
        <FontAwesome name="users" size={18} color={theme.primary} />
        <Text style={styles.benefitText}>VERIFIED VENDORS</Text>
      </View>
      <View style={styles.benefitItem}>
        <FontAwesome name="globe" size={18} color={theme.primary} />
        <Text style={styles.benefitText}>PAN-TANZANIA REACH</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  benefitsStrip: {
    flexDirection: 'row', backgroundColor: '#1c1917', paddingVertical: 24, marginTop: 32,
    justifyContent: 'space-evenly', flexWrap: 'wrap', gap: 16,
  },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  benefitText: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});
