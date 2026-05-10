import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { apiGet } from '@/src/services/api';
import { OptimizedImage } from '@/components/OptimizedImage';
import { router } from 'expo-router';

const STATUS_COLORS: Record<string, string> = {
  delivered: '#16a34a', completed: '#16a34a', shipped: '#2563eb',
  processing: '#eab308', preparing: '#eab308', pending: '#6b7280',
  confirmed: '#7c3aed', paid: '#7c3aed', cancelled: '#ef4444',
};

interface Props { accessToken: string; }

export function OrderHistorySection({ accessToken }: Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<any>('/orders/my', accessToken);
        setOrders(Array.isArray(res) ? res : res?.orders || []);
      } catch (e) { console.error('Orders load error', e); }
      setLoading(false);
    })();
  }, [accessToken]);

  if (loading) return <View style={s.center}><ActivityIndicator color={Theme.primary} /></View>;

  if (orders.length === 0) return (
    <View style={s.empty}>
      <FontAwesome name="shopping-bag" size={48} color={Theme.textMuted} />
      <Text style={s.emptyTitle}>No orders yet</Text>
      <Text style={s.emptyText}>Start exploring TOLA to find amazing products.</Text>
      <Pressable style={s.shopBtn} onPress={() => router.push('/(tabs)')}>
        <Text style={s.shopBtnText}>Start Shopping</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={s.list}>
      {orders.map(order => {
        const color = STATUS_COLORS[order.status] || '#6b7280';
        return (
          <View key={order.id} style={s.card}>
            <View style={s.cardHeader}>
              <View>
                <Text style={s.orderNum}>#{order.order_number}</Text>
                <Text style={s.orderDate}>Placed {new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View style={[s.badge, { backgroundColor: color + '18' }]}>
                  <Text style={[s.badgeText, { color }]}>{order.status}</Text>
                </View>
                <Text style={s.totalAmount}>TSh {Number(order.total_amount || 0).toLocaleString()}</Text>
              </View>
            </View>
            {order.order_items?.slice(0, 2).map((item: any) => (
              <View key={item.id} style={s.itemRow}>
                {item.product?.images?.[0] ? (
                  <OptimizedImage source={item.product.images[0]} width={48} height={48} style={s.itemImg} />
                ) : (
                  <View style={[s.itemImg, s.itemImgPlaceholder]}><FontAwesome name="cube" size={18} color={Theme.textMuted} /></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName} numberOfLines={1}>{item.product?.name || 'Product'}</Text>
                  <Text style={s.itemMeta}>Qty: {item.quantity} × TSh {Number(item.product?.price || 0).toLocaleString()}</Text>
                </View>
                <Text style={s.itemTotal}>TSh {Number(item.total_price || 0).toLocaleString()}</Text>
              </View>
            ))}
            {(order.order_items?.length || 0) > 2 && (
              <Text style={s.moreItems}>+{order.order_items.length - 2} more items</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  center: { padding: 40, alignItems: 'center' },
  empty: { alignItems: 'center', padding: 40, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Theme.text },
  emptyText: { fontSize: 13, color: Theme.textMuted, textAlign: 'center' },
  shopBtn: { backgroundColor: Theme.primary, paddingVertical: 12, paddingHorizontal: 28, borderRadius: Theme.radiusMd, marginTop: 8 },
  shopBtnText: { color: '#fff', fontWeight: '700' },
  list: { gap: 12 },
  card: { backgroundColor: Theme.background, borderRadius: Theme.radiusLg, borderWidth: 1, borderColor: Theme.inputBorder, overflow: 'hidden', ...Theme.shadowSm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, backgroundColor: Theme.backgroundSecondary, borderBottomWidth: 1, borderBottomColor: Theme.inputBorder },
  orderNum: { fontSize: 15, fontWeight: '700', color: Theme.text },
  orderDate: { fontSize: 11, color: Theme.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  totalAmount: { fontSize: 15, fontWeight: '800', color: Theme.text },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Theme.inputBorder },
  itemImg: { width: 48, height: 48, borderRadius: 8 },
  itemImgPlaceholder: { backgroundColor: Theme.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 13, fontWeight: '600', color: Theme.text },
  itemMeta: { fontSize: 11, color: Theme.textMuted, marginTop: 2 },
  itemTotal: { fontSize: 13, fontWeight: '700', color: Theme.text },
  moreItems: { fontSize: 11, color: Theme.textMuted, fontStyle: 'italic', paddingHorizontal: 14, paddingVertical: 8 },
});
