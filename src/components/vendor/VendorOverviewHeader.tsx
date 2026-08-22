import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import type { Order } from '@/src/types';
import type { VendorProduct, VendorShop } from '@/src/hooks/useVendorDashboardData';

interface Props {
  vendorName?: string | null;
  shop: VendorShop | null;
  products: VendorProduct[];
  orders: Order[];
}

function hasShopLocation(shopData: VendorShop | null | undefined) {
  return !!(shopData?.region && shopData?.district);
}

export function VendorOverviewHeader({ vendorName, shop, products, orders }: Props) {
  return (
    <View>
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>Welcome, {vendorName || 'Vendor'}</Text>
        <Text style={styles.welcomeSubtitle}>Manage your shop and products</Text>
      </View>

      {/* Overview Stats */}
      {shop && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#ede9fe' }]}><FontAwesome name="cube" size={16} color="#7c3aed" /></View>
            <Text style={styles.statValue}>{products.length}</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}><FontAwesome name="clock-o" size={16} color="#d97706" /></View>
            <Text style={styles.statValue}>{orders.filter(o => ['pending', 'pending_payment', 'confirmed', 'paid', 'payment_received'].includes(o.status || '')).length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#dcfce7' }]}><FontAwesome name="line-chart" size={16} color="#16a34a" /></View>
            <Text style={styles.statValue}>{orders.filter(o => ['dispatched', 'in_transit', 'delivered', 'shipped', 'completed'].includes(o.status || '')).length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}><FontAwesome name="shopping-bag" size={16} color="#2563eb" /></View>
            <Text style={styles.statValue}>{orders.length}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
        </View>
      )}

      {!shop ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Create Your Shop</Text>
              <Text style={styles.cardDesc}>Set up your shop to start selling products</Text>
            </View>
          </View>
          <Pressable style={[styles.addBtn, { alignSelf: 'flex-start', marginTop: 16 }]} onPress={() => router.push('/(vendor)/shop/create')}>
            <FontAwesome name="bank" size={14} color="#fff" />
            <Text style={styles.addBtnText}>Create Shop</Text>
          </Pressable>
        </View>
      ) : (
        !hasShopLocation(shop) && (
          <View style={styles.locationWarningCard}>
            <View style={styles.locationWarningContent}>
              <FontAwesome name="exclamation-circle" size={24} color="#d97706" />
              <View style={styles.locationWarningTextContainer}>
                <Text style={styles.locationWarningTitle}>Shop Location Required</Text>
                <Text style={styles.locationWarningDesc}>Please add your shop location to enable delivery fee calculations and start adding products.</Text>
              </View>
            </View>
            <Pressable style={styles.locationWarningBtn} onPress={() => router.push('/(vendor)/shop/edit')}>
              <FontAwesome name="edit" size={14} color="#b45309" />
              <Text style={styles.locationWarningBtnText}>Add Location</Text>
            </Pressable>
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  welcomeSection: { marginBottom: 24 },
  welcomeTitle: { fontSize: 24, fontWeight: '700', color: Theme.text, marginBottom: 4 },
  welcomeSubtitle: { fontSize: 14, color: Theme.textSecondary },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: Theme.background, borderRadius: 12, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Theme.inputBorder },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: Theme.text },
  statLabel: { fontSize: 9, fontWeight: '700', color: Theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  card: { backgroundColor: Theme.background, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: Theme.inputBorder, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: Theme.text, marginBottom: 4 },
  cardDesc: { fontSize: 14, color: Theme.textSecondary },
  addBtn: { backgroundColor: Theme.text, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, gap: 8 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  locationWarningCard: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#f59e0b', borderRadius: 12, padding: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locationWarningContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1, paddingRight: 16 },
  locationWarningTextContainer: { flex: 1 },
  locationWarningTitle: { fontSize: 15, fontWeight: '600', color: '#92400e', marginBottom: 4 },
  locationWarningDesc: { fontSize: 13, color: '#b45309', lineHeight: 18 },
  locationWarningBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#f59e0b', borderRadius: 6, backgroundColor: '#fef3c7' },
  locationWarningBtnText: { fontSize: 13, fontWeight: '600', color: '#b45309' },
});
