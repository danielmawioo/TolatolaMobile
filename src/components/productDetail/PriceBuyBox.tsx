import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import type { Product } from '@/src/types';

interface PriceBuyBoxProps {
  product: Product;
  resolvedPrice: number;
  quantity: number;
  onChangeQuantity: (quantity: number) => void;
  isSoldOut: boolean;
}

/**
 * Price card (price, quantity stepper, Tola Protect notice) plus the sold-out
 * banner and the logistics/return policy grid below it.
 */
export function PriceBuyBox({ product, resolvedPrice, quantity, onChangeQuantity, isSoldOut }: PriceBuyBoxProps) {
  const minQuantity = product.moq ? Number(product.moq) : 1;
  const maxQuantity = Number(product.stock_quantity) || 99;

  return (
    <>
      {isSoldOut && (
        <View style={styles.soldOutBox}>
          <View style={styles.soldOutIcon}>
            <FontAwesome name="shopping-bag" size={20} color="#dc2626" />
          </View>
          <View>
            <Text style={styles.soldOutTitle}>SOLD OUT PROFILE</Text>
            <Text style={styles.soldOutSub}>This item is currently unavailable.</Text>
          </View>
        </View>
      )}

      <View style={styles.priceCard}>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{resolvedPrice?.toLocaleString() || '0'}</Text>
          <Text style={styles.currency}>{(product.currency || 'TZS') + (product.weight_unit ? ` / ${product.weight_unit}` : '')}</Text>
        </View>

        <View style={styles.quantitySection}>
          <View style={styles.quantityBox}>
            <Text style={styles.quantityLabel}>ORDER QUANTITY</Text>
            <View style={styles.quantityControls}>
              <Pressable style={styles.qBtn} onPress={() => onChangeQuantity(Math.max(minQuantity, quantity - 1))}>
                <FontAwesome name="minus" size={14} color={Theme.text} />
              </Pressable>
              <Text style={styles.qText}>{quantity}</Text>
              <Pressable style={styles.qBtn} onPress={() => onChangeQuantity(Math.min(maxQuantity, quantity + 1))}>
                <FontAwesome name="plus" size={14} color={Theme.text} />
              </Pressable>
            </View>
          </View>
          <View style={styles.stockInfo}>
            <Text style={styles.stockText}>Min Order: {product.moq || 1} {product.weight_unit || product.unit || 'Units'}</Text>
            <Text style={styles.stockText}>{product.stock_quantity || 0} {product.weight_unit || product.unit || 'Units'} in inventory</Text>
          </View>
        </View>

        <View style={styles.protectRow}>
          <FontAwesome name="shield" size={20} color={Theme.primary} />
          <View style={styles.protectInfo}>
            <Text style={styles.protectTitle}>TOLA PROTECT ENABLED</Text>
            <Text style={styles.protectSub}>100% Payment Protection Guaranteed.</Text>
          </View>
        </View>
      </View>

      <View style={styles.policyGrid}>
        <View style={styles.policyCard}>
          <FontAwesome name="truck" size={20} color={Theme.primary} style={{ marginBottom: 12 }} />
          <Text style={styles.policyLabel}>LOGISTICS</Text>
          <Text style={styles.policyValue}>
            {product.delivery_available !== false ? 'Door-to-Door Delivery Available' : 'Self-Collection Only'}
          </Text>
        </View>
        <View style={styles.policyCard}>
          <FontAwesome name="refresh" size={20} color={Theme.primary} style={{ marginBottom: 12 }} />
          <Text style={styles.policyLabel}>RETURN POLICY</Text>
          <Text style={styles.policyValue}>7-Day Verification</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  soldOutBox: { backgroundColor: '#fef2f2', borderColor: '#fee2e2', borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  soldOutIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  soldOutTitle: { fontSize: 10, fontWeight: '900', color: '#b91c1c', letterSpacing: 1.5 },
  soldOutSub: { fontSize: 12, fontWeight: '700', color: 'rgba(220,38,38,0.6)' },

  priceCard: { backgroundColor: '#ffffff', borderColor: '#f1f5f9', borderWidth: 1, borderRadius: 24, padding: 20, gap: 20, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.03, shadowRadius: 16, elevation: 3 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  price: { fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  currency: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.5 },

  quantitySection: { gap: 12 },
  quantityBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 16, borderColor: '#e2e8f0', borderWidth: 1 },
  quantityLabel: { fontSize: 9, fontWeight: '800', color: '#64748b', letterSpacing: 1 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  qBtn: { width: 34, height: 34, backgroundColor: '#ffffff', borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cbd5e1', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  qText: { fontSize: 16, fontWeight: '800', minWidth: 20, textAlign: 'center', color: '#0f172a' },
  stockInfo: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  stockText: { fontSize: 9, fontWeight: '700', color: '#64748b', fontStyle: 'italic' },

  protectRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  protectInfo: { flex: 1 },
  protectTitle: { fontSize: 9, fontWeight: '900', color: '#0f172a', letterSpacing: 0.5 },
  protectSub: { fontSize: 9, color: '#64748b', fontWeight: '500', marginTop: 1 },

  policyGrid: { flexDirection: 'row', gap: 10 },
  policyCard: { flex: 1, backgroundColor: '#f8fafc', padding: 16, borderRadius: 20, borderColor: '#e2e8f0', borderWidth: 1 },
  policyLabel: { fontSize: 8, fontWeight: '900', color: '#64748b', letterSpacing: 1 },
  policyValue: { fontSize: 11, fontWeight: '700', color: '#0f172a', marginTop: 3 },
});
