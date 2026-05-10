import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';
import { apiGet, apiPatch } from '@/src/services/api';

const TAB_NEW = 'new';
const TAB_PREPARING = 'preparing';
const TAB_READY = 'ready';
const TAB_COMPLETED = 'completed';
const TAB_EARNINGS = 'earnings';
type OrderTab = typeof TAB_NEW | typeof TAB_PREPARING | typeof TAB_READY | typeof TAB_COMPLETED | typeof TAB_EARNINGS;

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', pending_payment: 'Awaiting Payment', paid: 'Paid',
  confirmed: 'Confirmed', processing: 'Preparing', preparing: 'Preparing',
  ready_for_pickup: 'Ready for Pickup', dispatched: 'Dispatched',
  in_transit: 'In Transit', shipped: 'Shipped', delivered: 'Delivered',
  completed: 'Completed', cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#eab308', pending_payment: '#f97316', paid: '#3b82f6',
  confirmed: '#2563eb', processing: '#7c3aed', preparing: '#7c3aed',
  ready_for_pickup: '#16a34a', dispatched: '#6366f1',
  in_transit: '#6366f1', shipped: '#6366f1', delivered: '#22c55e',
  completed: '#22c55e', cancelled: '#ef4444',
};

interface Props { shopId: string; accessToken: string; onOrdersLoaded?: (orders: any[]) => void; }

export function VendorOrdersTab({ shopId, accessToken, onOrdersLoaded }: Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderTab>(TAB_NEW);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiGet<any>(`/shops/${shopId}/orders`, accessToken);
      const list = res?.orders || (Array.isArray(res) ? res : []);
      setOrders(list);
      onOrdersLoaded?.(list);
    } catch (e) { console.error('Failed to load orders', e); }
    setLoading(false);
  }, [shopId, accessToken]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Auto-refresh every 15s
  useEffect(() => {
    const i = setInterval(() => fetchOrders(true), 15000);
    return () => clearInterval(i);
  }, [fetchOrders]);

  const toggleExpand = (id: string) => {
    const s = new Set(expandedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpandedIds(s);
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await apiPatch(`/vendors/orders/${orderId}/status`, { status: newStatus }, accessToken);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Updated', `Order moved to "${STATUS_LABELS[newStatus] || newStatus}"`);
      await fetchOrders(true);
      // Auto-switch tab
      const destTab = newStatus === 'confirmed' ? TAB_NEW : newStatus === 'processing' ? TAB_PREPARING : newStatus === 'ready_for_pickup' ? TAB_READY : undefined;
      if (destTab) setActiveTab(destTab);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update order');
    }
    setUpdatingId(null);
  };

  const formatTimeAgo = (d: string) => {
    const ms = Date.now() - new Date(d).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const getTotal = (o: any) =>
    (o.items || []).reduce((s: number, i: any) => s + Number(i.total_price ?? ((i.unit_price ?? i.price ?? 0) * (i.quantity ?? 0))) + Number(i.delivery_fee || 0), 0);

  const getCustomer = (o: any) =>
    o.users?.full_name || o.shipping_address?.full_name || o.users?.email || o.shipping_address?.phone || 'Guest';

  const newOrders = orders.filter(o => ['pending', 'pending_payment', 'confirmed', 'paid', 'payment_received'].includes(o.status));
  const preparingOrders = orders.filter(o => ['processing', 'preparing'].includes(o.status));
  const readyOrders = orders.filter(o => o.status === 'ready_for_pickup');
  const completedOrders = orders.filter(o => ['dispatched', 'in_transit', 'delivered', 'shipped', 'completed'].includes(o.status));
  const totalEarnings = completedOrders.reduce((s, o) => s + getTotal(o), 0);

  const TABS_DATA = [
    { key: TAB_NEW, label: 'New', count: newOrders.length, data: newOrders },
    { key: TAB_PREPARING, label: 'Preparing', count: preparingOrders.length, data: preparingOrders },
    { key: TAB_READY, label: 'Ready', count: readyOrders.length, data: readyOrders },
    { key: TAB_COMPLETED, label: 'Completed', count: completedOrders.length, data: completedOrders },
    { key: TAB_EARNINGS, label: 'Earnings', count: 0, data: [] },
  ];

  const currentTabData = TABS_DATA.find(t => t.key === activeTab);

  const renderActionButton = (order: any) => {
    const status = order.status;
    if (status === 'pending' || status === 'paid') {
      return (
        <Pressable style={[s.actionBtn, { backgroundColor: '#2563eb' }]} onPress={() => updateStatus(order.id, 'confirmed')} disabled={updatingId === order.id}>
          {updatingId === order.id ? <ActivityIndicator color="#fff" size="small" /> : <><FontAwesome name="check-circle" size={14} color="#fff" /><Text style={s.actionText}>Confirm</Text></>}
        </Pressable>
      );
    }
    if (status === 'confirmed') {
      return (
        <Pressable style={[s.actionBtn, { backgroundColor: '#7c3aed' }]} onPress={() => updateStatus(order.id, 'processing')} disabled={updatingId === order.id}>
          {updatingId === order.id ? <ActivityIndicator color="#fff" size="small" /> : <><FontAwesome name="cube" size={14} color="#fff" /><Text style={s.actionText}>Start Processing</Text></>}
        </Pressable>
      );
    }
    if (status === 'processing' || status === 'preparing') {
      return (
        <Pressable style={[s.actionBtn, { backgroundColor: '#16a34a' }]} onPress={() => updateStatus(order.id, 'ready_for_pickup')} disabled={updatingId === order.id}>
          {updatingId === order.id ? <ActivityIndicator color="#fff" size="small" /> : <><FontAwesome name="truck" size={14} color="#fff" /><Text style={s.actionText}>Mark Ready</Text></>}
        </Pressable>
      );
    }
    if (status === 'ready_for_pickup') {
      const ta = order.transporter_assignment;
      const label = !ta ? 'Searching Transporter...'
        : ta.status === 'delivered' || ta.status === 'completed' ? 'Delivered'
        : ta.status === 'in_transit' ? 'In Transit'
        : ta.status === 'picked_up' ? 'Picked Up'
        : ta.accepted_at ? 'Transporter Accepted'
        : 'Awaiting Transporter';
      return (
        <View style={s.waitingBadge}>
          <FontAwesome name="clock-o" size={14} color="#b45309" />
          <Text style={s.waitingText}>{label}</Text>
        </View>
      );
    }
    if (['shipped', 'delivered', 'completed'].includes(status)) {
      return (
        <View style={[s.waitingBadge, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
          <FontAwesome name="check-circle" size={14} color="#16a34a" />
          <Text style={[s.waitingText, { color: '#16a34a' }]}>Completed</Text>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={Theme.primary} /><Text style={s.loadingText}>Loading orders...</Text></View>;
  }

  return (
    <View style={s.container}>
      {/* Sub-tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.subTabScroll} contentContainerStyle={s.subTabRow}>
        {TABS_DATA.map(t => (
          <Pressable key={t.key} style={[s.subTab, activeTab === t.key && s.subTabActive]} onPress={() => setActiveTab(t.key as OrderTab)}>
            <Text style={[s.subTabText, activeTab === t.key && s.subTabTextActive]}>{t.label}</Text>
            {t.count > 0 && (
              <View style={[s.countBadge, activeTab === t.key && s.countBadgeActive, t.key === TAB_NEW && t.count > 0 && { backgroundColor: Theme.error }]}>
                <Text style={s.countText}>{t.count}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {/* Earnings tab */}
      {activeTab === TAB_EARNINGS ? (
        <View style={s.earningsCard}>
          <View style={s.earningsIcon}><FontAwesome name="line-chart" size={28} color={Theme.primary} /></View>
          <Text style={s.earningsLabel}>Total Earnings</Text>
          <Text style={s.earningsValue}>TSh {totalEarnings.toLocaleString()}</Text>
          <Text style={s.earningsSub}>{completedOrders.length} completed orders</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.ordersList}>
          {(currentTabData?.data || []).length === 0 ? (
            <View style={s.emptyState}>
              <FontAwesome name="inbox" size={48} color={Theme.textMuted} />
              <Text style={s.emptyText}>No orders in this tab</Text>
            </View>
          ) : (
            (currentTabData?.data || []).map(order => {
              const isExpanded = expandedIds.has(order.id);
              const total = getTotal(order);
              return (
                <View key={order.id} style={s.orderCard}>
                  {/* Header */}
                  <Pressable style={s.orderHeader} onPress={() => toggleExpand(order.id)}>
                    <View style={s.orderHeaderLeft}>
                      <Text style={s.orderTime}>{formatTimeAgo(order.created_at)}</Text>
                      <View style={s.orderNumRow}>
                        <Text style={s.orderNum}>{order.order_number || `#${order.id.slice(0, 8)}`}</Text>
                        <View style={[s.statusBadge, { backgroundColor: (STATUS_COLORS[order.status] || '#6b7280') + '18' }]}>
                          <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[order.status] || '#6b7280' }]} />
                          <Text style={[s.statusText, { color: STATUS_COLORS[order.status] || '#6b7280' }]}>{STATUS_LABELS[order.status] || order.status}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={s.orderHeaderRight}>
                      <Text style={s.orderTotal}>TSh {total.toLocaleString()}</Text>
                      <Text style={s.orderItemCount}>{(order.items || []).length} item(s)</Text>
                      <FontAwesome name={isExpanded ? 'chevron-up' : 'chevron-down'} size={12} color={Theme.textMuted} />
                    </View>
                  </Pressable>

                  {/* Expanded content */}
                  {isExpanded && (
                    <View style={s.expandedContent}>
                      {/* Customer */}
                      <View style={s.detailSection}>
                        <Text style={s.detailLabel}>Customer</Text>
                        <Text style={s.detailValue}>{getCustomer(order)}</Text>
                      </View>

                      {/* Items */}
                      <View style={s.detailSection}>
                        <Text style={s.detailLabel}>Items ({(order.items || []).length})</Text>
                        <View style={s.itemsList}>
                          {(order.items || []).map((item: any) => (
                            <View key={item.id} style={s.itemRow}>
                              <Text style={s.itemName} numberOfLines={1}>{item.products?.name || 'Item'} × {item.quantity}</Text>
                              <View style={s.itemPriceCol}>
                                <Text style={s.itemPrice}>TSh {(Number(item.unit_price || item.price || 0) * item.quantity).toLocaleString()}</Text>
                                {Number(item.delivery_fee) > 0 && <Text style={s.itemDelivery}>+Delivery: TSh {Number(item.delivery_fee).toLocaleString()}</Text>}
                              </View>
                            </View>
                          ))}
                          <View style={s.itemTotalRow}>
                            <Text style={s.itemTotalLabel}>Total</Text>
                            <Text style={s.itemTotalValue}>TSh {total.toLocaleString()}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Shipping */}
                      {order.shipping_address && (
                        <View style={s.detailSection}>
                          <Text style={s.detailLabel}>Shipping Address</Text>
                          <View style={s.addressCard}>
                            <Text style={s.addressName}>{order.shipping_address.full_name}</Text>
                            <Text style={s.addressLine}>{order.shipping_address.phone}</Text>
                            <Text style={s.addressLine}>{order.shipping_address.address || order.shipping_address.street}</Text>
                            <Text style={s.addressLine}>{order.shipping_address.ward}, {order.shipping_address.region}</Text>
                          </View>
                        </View>
                      )}

                      {/* Transporter */}
                      {order.transporter_assignment && (
                        <View style={s.detailSection}>
                          <Text style={s.detailLabel}>Logistics</Text>
                          <View style={[s.addressCard, { borderColor: Theme.primary + '20', backgroundColor: Theme.primary + '05' }]}>
                            <Text style={[s.addressName, { color: Theme.primary }]}>
                              {order.transporter_assignment.transporters?.business_name || order.transporter_assignment.transporters?.users?.full_name || 'Assigned Transporter'}
                            </Text>
                            <Text style={s.addressLine}>
                              {order.transporter_assignment.transporters?.vehicle_type} • {order.transporter_assignment.transporters?.vehicle_registration || '—'}
                            </Text>
                            {order.transporter_assignment.transporters?.users?.phone && (
                              <Text style={s.addressLine}>{order.transporter_assignment.transporters.users.phone}</Text>
                            )}
                          </View>
                        </View>
                      )}

                      {/* Action Button */}
                      <View style={s.actionRow}>{renderActionButton(order)}</View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 8, color: Theme.textMuted },
  // Sub-tabs
  subTabScroll: { maxHeight: 44, backgroundColor: Theme.background, borderBottomWidth: 1, borderBottomColor: Theme.inputBorder },
  subTabRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 4, alignItems: 'center', height: 44 },
  subTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  subTabActive: { backgroundColor: Theme.primary },
  subTabText: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  subTabTextActive: { color: '#fff' },
  countBadge: { backgroundColor: Theme.textMuted, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  countBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  countText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  // Orders
  ordersList: { padding: 16, gap: 12 },
  orderCard: { backgroundColor: Theme.background, borderRadius: Theme.radiusMd, borderWidth: 1, borderColor: Theme.inputBorder, overflow: 'hidden' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  orderHeaderLeft: { flex: 1, gap: 4 },
  orderTime: { fontSize: 10, color: Theme.textMuted, fontWeight: '600' },
  orderNumRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  orderNum: { fontSize: 15, fontWeight: '700', color: Theme.text },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  orderHeaderRight: { alignItems: 'flex-end', gap: 2 },
  orderTotal: { fontSize: 14, fontWeight: '700', color: Theme.text },
  orderItemCount: { fontSize: 10, color: Theme.textMuted },
  // Expanded
  expandedContent: { borderTopWidth: 1, borderTopColor: Theme.inputBorder, padding: 14, gap: 14 },
  detailSection: { gap: 6 },
  detailLabel: { fontSize: 10, fontWeight: '700', color: Theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 14, fontWeight: '600', color: Theme.text },
  itemsList: { backgroundColor: Theme.backgroundSecondary, borderRadius: Theme.radiusSm, padding: 12, gap: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemName: { flex: 1, fontSize: 13, fontWeight: '600', color: Theme.text, marginRight: 8 },
  itemPriceCol: { alignItems: 'flex-end' },
  itemPrice: { fontSize: 13, fontWeight: '700', color: Theme.text },
  itemDelivery: { fontSize: 9, fontWeight: '700', color: Theme.success },
  itemTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Theme.inputBorder, paddingTop: 8 },
  itemTotalLabel: { fontSize: 10, fontWeight: '700', color: Theme.textMuted, textTransform: 'uppercase' },
  itemTotalValue: { fontSize: 15, fontWeight: '800', color: Theme.primary },
  addressCard: { backgroundColor: Theme.backgroundSecondary, borderRadius: Theme.radiusSm, padding: 12, gap: 4, borderWidth: 1, borderColor: Theme.inputBorder },
  addressName: { fontSize: 14, fontWeight: '700', color: Theme.text },
  addressLine: { fontSize: 12, color: Theme.textSecondary },
  // Actions
  actionRow: { paddingTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: Theme.radiusSm },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  waitingBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: Theme.radiusSm, backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a' },
  waitingText: { fontSize: 12, fontWeight: '700', color: '#b45309' },
  // Empty + Earnings
  emptyState: { alignItems: 'center', padding: 48, gap: 12 },
  emptyText: { fontSize: 14, color: Theme.textMuted },
  earningsCard: { alignItems: 'center', padding: 40, gap: 8 },
  earningsIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: Theme.primary + '10', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  earningsLabel: { fontSize: 10, fontWeight: '700', color: Theme.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  earningsValue: { fontSize: 32, fontWeight: '900', color: Theme.text },
  earningsSub: { fontSize: 12, color: Theme.textMuted },
});
