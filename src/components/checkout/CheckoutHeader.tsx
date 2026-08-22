import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';

interface Props {
  total: number;
  paddingTop: number;
  onBack: () => void;
}

export function CheckoutHeader({ total, paddingTop, onBack }: Props) {
  return (
    <View style={[styles.header, { paddingTop }]}>
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
        <FontAwesome name="arrow-left" size={20} color={Theme.text} />
      </Pressable>
      <View>
        <Text style={styles.headerTitle}>Checkout</Text>
        <Text style={styles.headerSub}>Secure checkout</Text>
      </View>
      <View style={styles.totalBadge}>
        <Text style={styles.totalBadgeLabel}>Total</Text>
        <Text style={styles.totalBadgeValue}>TSh {total.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: gap.md, paddingBottom: 14,
    backgroundColor: Theme.background, borderBottomWidth: 1, borderBottomColor: Theme.inputBorder,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Theme.text },
  headerSub: { fontSize: 11, color: Theme.textMuted, fontWeight: '600' },
  totalBadge: {
    backgroundColor: Theme.primary + '10', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Theme.radiusMd, alignItems: 'flex-end',
  },
  totalBadgeLabel: { fontSize: 9, fontWeight: '700', color: Theme.primary, textTransform: 'uppercase' },
  totalBadgeValue: { fontSize: 14, fontWeight: '800', color: Theme.primary },
});
