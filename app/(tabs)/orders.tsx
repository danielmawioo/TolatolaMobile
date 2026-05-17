import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';
import { useAuth } from '@/src/contexts/AuthContext';
import { useOrders } from '@/src/hooks/useOrders';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { Order } from '@/src/types';
import { COPY } from '@/constants/copy';

function getStatusColor(status?: string) {
  switch (status?.toLowerCase()) {
    case 'delivered': return Theme.success;
    case 'shipped': return Theme.primary;
    case 'cancelled': return Theme.error;
    default: return '#f39c12';
  }
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { orders, loading, error, refetch } = useOrders();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16, paddingHorizontal: gap.md }]}>
        <Text style={styles.title}>Orders</Text>
        <EmptyState
          icon="lock"
          title={COPY.empty.ordersLoginTitle}
          message={COPY.empty.ordersLoginMessage}
          actionLabel={COPY.auth.login}
          onAction={() => router.push('/(auth)/login')}
        />
      </View>
    );
  }

  const renderOrderItem = ({ item }: { item: Order }) => (
    <Pressable style={styles.orderCard} onPress={() => router.push(`/(guest)/track/status?id=${item.id}`)}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Order #{item.order_number || item.id.slice(0, 8)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status || 'Pending'}</Text>
        </View>
      </View>
      <View style={styles.orderBody}>
        <Text style={styles.orderDate}>{item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}</Text>
        <Text style={styles.orderTotal}>TSh {item.total_amount?.toLocaleString() || '0'}</Text>
      </View>
      <View style={styles.orderFooter}>
        <Text style={styles.itemCount}>{item.items_count ?? 1} item(s)</Text>
        <FontAwesome name="chevron-right" size={12} color={Theme.textMuted} />
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Orders</Text>
      </View>

      {error != null && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error.message}</Text>
          <Pressable onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={styles.skeletonWrap}>
          {[1, 2, 3].map((i) => (
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
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="inbox"
                title={COPY.empty.ordersTitle}
                message={COPY.empty.ordersMessage}
                actionLabel={COPY.empty.ordersAction}
                onAction={() => router.push('/(tabs)/shop')}
              />
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  header: { paddingHorizontal: gap.md, backgroundColor: Theme.background, paddingBottom: 16, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: Theme.text },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.error + '15',
    paddingHorizontal: gap.md,
    paddingVertical: 10,
    marginHorizontal: gap.md,
    marginBottom: 12,
    borderRadius: Theme.radiusMd,
  },
  errorText: { fontSize: 14, color: Theme.error, flex: 1 },
  retryBtn: { paddingVertical: 4, paddingHorizontal: 12 },
  retryText: { fontSize: 14, fontWeight: '600', color: Theme.primary },
  skeletonWrap: { paddingHorizontal: gap.md },
  listContent: { paddingHorizontal: gap.md },
  orderCard: {
    backgroundColor: Theme.background,
    borderRadius: Theme.radiusMd,
    padding: 16,
    marginBottom: 12,
    ...Theme.shadowSm,
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
  emptyWrap: { marginTop: 40 },
  skeletonCard: { backgroundColor: Theme.background, borderRadius: Theme.radiusMd, padding: 16, marginBottom: 12, ...Theme.shadowSm },
});
