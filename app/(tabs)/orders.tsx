import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { apiGet } from '@/src/services/api';
import { Skeleton } from '@/components/Skeleton';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { session, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!isAuthenticated || !session?.access_token) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiGet<{ orders: any[] }>('/orders', session.access_token);
      setOrders(data.orders || (Array.isArray(data) ? data : []));
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, session?.access_token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16, paddingHorizontal: 20 }]}>
        <Text style={styles.title}>Orders</Text>
        <View style={styles.empty}>
          <FontAwesome name="lock" size={48} color={Theme.textMuted} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Please log in</Text>
          <Text style={styles.emptyText}>You need to be logged in to view your order history.</Text>
          <Pressable style={styles.demoBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.demoBtnText}>Log in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const renderOrderItem = ({ item }: { item: any }) => (
    <Pressable style={styles.orderCard} onPress={() => router.push(`/(guest)/track/status?id=${item.id}`)}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Order #{item.order_number || item.id.slice(0, 8)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status || 'Pending'}</Text>
        </View>
      </View>
      
      <View style={styles.orderBody}>
        <Text style={styles.orderDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
        <Text style={styles.orderTotal}>TSh {item.total_amount?.toLocaleString() || '0'}</Text>
      </View>
      
      <View style={styles.orderFooter}>
        <Text style={styles.itemCount}>{item.items_count || 1} item(s)</Text>
        <FontAwesome name="chevron-right" size={12} color={Theme.textMuted} />
      </View>
    </Pressable>
  );

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return Theme.success;
      case 'shipped': return Theme.primary;
      case 'cancelled': return Theme.error;
      default: return '#f39c12';
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Orders</Text>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 20 }}>
          {[1, 2, 3].map(i => (
            <View key={i} style={styles.skeletonCard}>
              <Skeleton width="40%" height={16} style={{ marginBottom: 12 }} />
              <Skeleton width="100%" height={60} borderRadius={8} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
          renderItem={renderOrderItem}
          ListEmptyComponent={
            <View style={styles.empty}>
              <FontAwesome name="inbox" size={48} color={Theme.textMuted} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptyText}>Once you make a purchase, your orders will appear here.</Text>
              <Pressable style={styles.demoBtn} onPress={() => router.push('/(tabs)')}>
                <Text style={styles.demoBtnText}>Shop now</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  header: { paddingHorizontal: 20, backgroundColor: Theme.background, paddingBottom: 16, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: Theme.text },
  listContent: { paddingHorizontal: 20 },
  orderCard: {
    backgroundColor: Theme.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { fontSize: 15, fontWeight: '600', color: Theme.text },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '700' },
  orderBody: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  orderDate: { fontSize: 14, color: Theme.textSecondary },
  orderTotal: { fontSize: 16, fontWeight: '700', color: Theme.text },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Theme.inputBorder, paddingTop: 12 },
  itemCount: { fontSize: 13, color: Theme.textMuted },
  empty: {
    backgroundColor: Theme.background,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Theme.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Theme.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  demoBtn: { backgroundColor: Theme.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  demoBtnText: { color: '#fff', fontWeight: '600' },
  skeletonCard: { backgroundColor: Theme.background, borderRadius: 12, padding: 16, marginBottom: 12 },
});
