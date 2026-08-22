import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';

/**
 * "Merchant spotlight" card shown on the guest product detail screen. Seller
 * identity is intentionally withheld pre-order, so this card carries no
 * per-product data — it's purely informational/trust copy.
 */
export function MerchantCard() {
  return (
    <View style={styles.merchantCard}>
      <View style={styles.merchantHeader}>
        <View style={styles.merchantIconBox}>
          <FontAwesome name="lock" size={24} color={Theme.primary} />
        </View>
        <View>
          <Text style={styles.merchantLabel}>VERIFIED MERCHANT</Text>
          <Text style={styles.merchantName}>XXXXXX XXXXXX</Text>
        </View>
      </View>
      <View style={styles.merchantStatus}>
        <Text style={styles.merchantStatusLabel}>IDENTITY STATUS</Text>
        <Text style={styles.merchantStatusValue}>VERIFIED BY TOLA</Text>
      </View>
      <Text style={styles.merchantDisclaimer}>
        Seller details are hidden to prevent off-platform deals and ensure secure trade. Identity will be revealed after order placement.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  merchantCard: { backgroundColor: '#0f172a', padding: 20, borderRadius: 24, gap: 16, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 4 },
  merchantHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  merchantIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  merchantLabel: { fontSize: 8, fontWeight: '900', color: Theme.primary, letterSpacing: 1 },
  merchantName: { fontSize: 16, fontWeight: '800', color: '#ffffff', letterSpacing: 3, opacity: 0.6 },
  merchantStatus: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1e293b' },
  merchantStatusLabel: { fontSize: 8, fontWeight: '900', color: '#475569', letterSpacing: 1.5 },
  merchantStatusValue: { fontSize: 8, fontWeight: '900', color: Theme.primary, letterSpacing: 1 },
  merchantDisclaimer: { backgroundColor: 'rgba(30,41,59,0.5)', padding: 12, borderRadius: 12, fontSize: 9, color: '#94a3b8', fontStyle: 'italic', lineHeight: 14, borderWidth: 1, borderColor: '#1e293b' },
});
