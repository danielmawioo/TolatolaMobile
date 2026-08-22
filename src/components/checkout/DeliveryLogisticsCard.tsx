import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Theme } from '@/constants/Theme';
import type { ShopDeliveryInfo } from '@/src/hooks/useDeliveryLogistics';

interface Props {
  isCalculating: boolean;
  shopDeliveries: Record<string, ShopDeliveryInfo>;
  shopFees: Record<string, number>;
  selectedMethodName: string;
}

export function DeliveryLogisticsCard({ isCalculating, shopDeliveries, shopFees, selectedMethodName }: Props) {
  const entries = Object.entries(shopDeliveries);

  return (
    <>
      {isCalculating && (
        <View style={styles.calculatingBox}>
          <ActivityIndicator size="small" color={Theme.primary} />
          <Text style={styles.calculatingText}>Calculating delivery fee...</Text>
        </View>
      )}

      {entries.length > 0 && (
        <View style={styles.logisticsContainer}>
          <Text style={styles.logisticsTitle}>DELIVERY LOGISTICS BREAKDOWN</Text>
          {entries.map(([shopId, info]) => (
            <View key={shopId} style={styles.logisticsCard}>
              <View style={styles.logisticsHeader}>
                <View>
                  <Text style={styles.logisticsShopLabel}>FROM SHOP</Text>
                  <Text style={styles.logisticsShopName}>TOLA Verified Vendor</Text>
                </View>
                <View style={styles.logisticsMethodBadge}>
                  <Text style={styles.logisticsMethodText}>{selectedMethodName}</Text>
                </View>
              </View>
              <View style={styles.logisticsStats}>
                <View style={styles.logisticsStatBox}>
                  <Text style={styles.logisticsStatLabel}>DISTANCE</Text>
                  <Text style={styles.logisticsStatValue}>{info.distanceKm} KM</Text>
                </View>
                <View style={styles.logisticsStatBox}>
                  <Text style={styles.logisticsStatLabel}>STATUS</Text>
                  <Text style={styles.logisticsStatValue}>{info.duration}</Text>
                </View>
                <View style={[styles.logisticsStatBox, styles.logisticsFeeBox]}>
                  <Text style={[styles.logisticsStatLabel, { color: Theme.primary }]}>FEE</Text>
                  <Text style={[styles.logisticsStatValue, { color: Theme.primary }]}>
                    TSh {shopFees[shopId]?.toLocaleString() || 0}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  calculatingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    backgroundColor: Theme.backgroundSecondary, borderRadius: Theme.radiusMd,
    marginTop: 8,
  },
  calculatingText: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  logisticsContainer: { marginTop: 8, gap: 12 },
  logisticsTitle: { fontSize: 10, fontWeight: '800', color: Theme.textMuted, letterSpacing: 1 },
  logisticsCard: {
    backgroundColor: Theme.backgroundSecondary, borderRadius: 16, padding: 16, gap: 16,
    borderWidth: 1, borderColor: Theme.inputBorder,
  },
  logisticsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logisticsShopLabel: { fontSize: 9, fontWeight: '800', color: Theme.primary, letterSpacing: 1, marginBottom: 2 },
  logisticsShopName: { fontSize: 13, fontWeight: '800', color: Theme.text },
  logisticsMethodBadge: {
    backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1, borderColor: Theme.inputBorder,
  },
  logisticsMethodText: { fontSize: 9, fontWeight: '800', color: Theme.textSecondary, textTransform: 'uppercase' },
  logisticsStats: { flexDirection: 'row', gap: 8 },
  logisticsStatBox: {
    flex: 1, backgroundColor: '#fff', padding: 10, borderRadius: 12,
    borderWidth: 1, borderColor: Theme.inputBorder, gap: 4,
  },
  logisticsFeeBox: { backgroundColor: Theme.primary + '08', borderColor: Theme.primary + '20' },
  logisticsStatLabel: { fontSize: 8, fontWeight: '800', color: Theme.textMuted, letterSpacing: 1 },
  logisticsStatValue: { fontSize: 12, fontWeight: '800', color: Theme.text },
});
