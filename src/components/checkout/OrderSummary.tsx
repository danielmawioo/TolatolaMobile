import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '@/constants/Theme';
import { OptimizedImage } from '@/components/OptimizedImage';
import type { CartItem } from '@/src/contexts/CartContext';

interface Props {
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  insuranceFee: number;
  total: number;
}

export function OrderSummary({ items, subtotal, deliveryFee, insuranceFee, total }: Props) {
  return (
    <View style={[styles.summaryCard, Theme.shadowMd]}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryHeaderText}>Order Summary</Text>
        <Text style={styles.summaryItemCount}>{items.length} item(s)</Text>
      </View>

      {/* Items preview */}
      <View style={styles.summaryItems}>
        {items.slice(0, 3).map((item) => (
          <View key={item.id} style={styles.summaryItem}>
            <OptimizedImage source={item.image_url} width={44} height={44} style={styles.summaryItemImg} />
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryItemName} numberOfLines={1}>{item.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Text style={styles.summaryItemQty}>Qty: {item.quantity}</Text>
                {item.selected_color && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f4', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, gap: 3 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.selected_color.name.toLowerCase() }} />
                    <Text style={{ fontSize: 8, fontWeight: '700', color: '#78716c' }}>{item.selected_color.name}</Text>
                  </View>
                )}
                {item.selected_size && (
                  <View style={{ backgroundColor: '#f5f5f4', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 8, fontWeight: '700', color: '#78716c' }}>{item.selected_size}</Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.summaryItemPrice}>
              TSh {(item.price * item.quantity).toLocaleString()}
            </Text>
          </View>
        ))}
        {items.length > 3 && (
          <Text style={styles.moreItems}>+{items.length - 3} more item(s)</Text>
        )}
      </View>

      <View style={styles.summaryDivider} />

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal</Text>
        <Text style={styles.summaryValue}>TSh {subtotal.toLocaleString()}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Delivery</Text>
        <Text style={styles.summaryValue}>
          {deliveryFee > 0 ? `TSh ${deliveryFee.toLocaleString()}` : 'Pending location'}
        </Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Buyer Protection (1.5%)</Text>
        <Text style={styles.summaryValue}>TSh {insuranceFee.toLocaleString()}</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryTotalRow}>
        <Text style={styles.summaryTotalLabel}>Total</Text>
        <Text style={styles.summaryTotalValue}>TSh {total.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: { backgroundColor: Theme.background, borderRadius: 24, overflow: 'hidden', ...Theme.shadowLg },
  summaryHeader: {
    backgroundColor: Theme.success, paddingHorizontal: 20, paddingVertical: 18,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  summaryHeaderText: { fontSize: 19, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  summaryItemCount: { fontSize: 12, fontWeight: '600', color: '#ffffffcc' },
  summaryItems: { padding: 16, gap: 12 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryItemImg: { borderRadius: 8, backgroundColor: Theme.backgroundSecondary },
  summaryItemName: { fontSize: 13, fontWeight: '700', color: Theme.text },
  summaryItemQty: { fontSize: 10, fontWeight: '600', color: Theme.textMuted },
  summaryItemPrice: { fontSize: 13, fontWeight: '800', color: Theme.text },
  moreItems: { fontSize: 12, color: Theme.textMuted, fontWeight: '600', textAlign: 'center' },
  summaryDivider: { height: 1, backgroundColor: Theme.inputBorder, marginHorizontal: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 8 },
  summaryLabel: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  summaryValue: { fontSize: 13, fontWeight: '700', color: Theme.text },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  summaryTotalLabel: { fontSize: 12, fontWeight: '800', color: Theme.primary, textTransform: 'uppercase' },
  summaryTotalValue: { fontSize: 20, fontWeight: '900', color: Theme.text },
});
