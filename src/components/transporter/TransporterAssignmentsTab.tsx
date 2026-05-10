import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
  Alert, Modal, TextInput, Linking,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';
import { apiGet, apiPatch, apiPost } from '@/src/services/api';

const TAB_AVAILABLE = 'available';
const TAB_ACCEPTED = 'accepted';
const TAB_IN_TRANSIT = 'in_transit';
const TAB_COMPLETED = 'completed';
type Tab = typeof TAB_AVAILABLE | typeof TAB_ACCEPTED | typeof TAB_IN_TRANSIT | typeof TAB_COMPLETED;

const STATUS_COLORS: Record<string, string> = {
  assigned: '#6b7280', ready_for_pickup: '#6b7280', available: '#6b7280',
  accepted: '#2563eb', picked_up: '#7c3aed', in_transit: '#7c3aed',
  delivered: '#16a34a', cancelled: '#ef4444',
};

interface Props { transporterId: string; accessToken: string; }

export function TransporterAssignmentsTab({ transporterId, accessToken }: Props) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(TAB_AVAILABLE);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Delivery PIN
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deliveryPin, setDeliveryPin] = useState('');

  const fetchAssignments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiGet<any>('/transporter/jobs', accessToken);
      setAssignments(Array.isArray(res) ? res : res?.assignments || res?.data || []);
    } catch (e) { console.error('Fetch assignments error', e); }
    setLoading(false);
  }, [accessToken]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);
  useEffect(() => { const i = setInterval(() => fetchAssignments(true), 15000); return () => clearInterval(i); }, [fetchAssignments]);

  const availableTrips = assignments.filter(a => a.is_available_order || (['assigned', 'ready_for_pickup'].includes(a.status) && !a.accepted_at));
  const acceptedTrips = assignments.filter(a => !a.is_available_order && (a.status === 'accepted' || (a.status === 'assigned' && !!a.accepted_at)));
  const inTransitTrips = assignments.filter(a => !a.is_available_order && ['picked_up', 'in_transit'].includes(a.status));
  const completedTrips = assignments.filter(a => !a.is_available_order && a.status === 'delivered');

  const TABS_DATA = [
    { key: TAB_AVAILABLE, label: 'Available', count: availableTrips.length, data: availableTrips },
    { key: TAB_ACCEPTED, label: 'Accepted', count: acceptedTrips.length, data: acceptedTrips },
    { key: TAB_IN_TRANSIT, label: 'In Transit', count: inTransitTrips.length, data: inTransitTrips },
    { key: TAB_COMPLETED, label: 'Done', count: completedTrips.length, data: completedTrips },
  ];

  const updateStatus = async (id: string, newStatus: string, isAvailable?: boolean, orderId?: string) => {
    setUpdatingId(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (isAvailable && newStatus === 'accepted' && orderId) {
        await apiPost(`/assignments/accept/${orderId}`, {}, accessToken);
      } else {
        const data: any = { status: newStatus };
        if (newStatus === 'picked_up') data.picked_up_at = new Date().toISOString();
        if (newStatus === 'delivered') data.delivered_at = new Date().toISOString();
        await apiPatch(`/assignments/${id}`, data, accessToken);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await fetchAssignments(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update status');
    }
    setUpdatingId(null);
  };

  const verifyPin = async () => {
    if (!selectedId || !deliveryPin || deliveryPin.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter a valid 4-digit Delivery PIN.');
      return;
    }
    setUpdatingId(selectedId);
    try {
      await apiPost(`/assignments/${selectedId}/verify-pin`, { pin: deliveryPin }, accessToken);
      setPinModalOpen(false); setSelectedId(null); setDeliveryPin('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Delivery completed and verified!');
      await fetchAssignments(true);
    } catch (e: any) {
      Alert.alert('PIN Error', e.message || 'Failed to verify PIN. Please check and try again.');
    }
    setUpdatingId(null);
  };

  const openMap = (lat: number, lng: number) => {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
  };

  const callPhone = (phone: string) => { Linking.openURL(`tel:${phone}`); };

  const currentData = TABS_DATA.find(t => t.key === activeTab)?.data || [];

  const renderCard = (a: any) => {
    const isAccepted = ['accepted', 'picked_up', 'in_transit', 'delivered'].includes(a.status) || !!a.accepted_at;
    const isNotAccepted = ['assigned', 'ready_for_pickup', 'available'].includes(a.status) && !a.accepted_at;
    const displayStatus = (a.status === 'assigned' && a.accepted_at) ? 'accepted' : a.status;

    return (
      <View key={a.id} style={[st.card, !isAccepted && { borderColor: Theme.primary + '30', backgroundColor: Theme.primary + '05' }]}>
        {/* Header */}
        <View style={st.cardHeader}>
          <View>
            <Text style={st.orderNum}>Order #{a.orders?.order_number || a.order_id?.slice(0, 8)}</Text>
            <Text style={st.cardMeta}>{a.transport_methods?.name || 'Standard'} • {a.distance_km || '?'} km</Text>
          </View>
          <View style={[st.statusBadge, { backgroundColor: (STATUS_COLORS[displayStatus] || '#6b7280') + '18' }]}>
            <View style={[st.statusDot, { backgroundColor: STATUS_COLORS[displayStatus] || '#6b7280' }]} />
            <Text style={[st.statusText, { color: STATUS_COLORS[displayStatus] || '#6b7280' }]}>{displayStatus.replace('_', ' ')}</Text>
          </View>
        </View>

        {/* Pickup Info */}
        <View style={st.locationBox}>
          <FontAwesome name="cube" size={16} color={Theme.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={st.locationLabel}>Pickup from: {a.shops?.name || 'Shop'}</Text>
            <Text style={st.locationSub}>{a.shops?.district}, {a.shops?.region}</Text>
            {isAccepted && a.shops?.address && <Text style={st.locationDetail}>{a.shops.address}</Text>}
            {isAccepted && a.shops?.latitude && a.shops?.longitude && (
              <Pressable style={st.mapLink} onPress={() => openMap(a.shops.latitude, a.shops.longitude)}>
                <FontAwesome name="map-marker" size={12} color={Theme.primary} />
                <Text style={st.mapLinkText}>View Pickup Location</Text>
              </Pressable>
            )}
            {isAccepted && a.shops?.phone && (
              <Pressable style={st.phoneLink} onPress={() => callPhone(a.shops.phone)}>
                <FontAwesome name="phone" size={12} color="#2563eb" />
                <Text style={st.phoneLinkText}>{a.shops.phone}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Delivery Info */}
        <View style={st.locationBox}>
          <FontAwesome name="map-marker" size={16} color={Theme.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={st.locationLabel}>
              Deliver to: {a.orders?.users?.full_name || a.orders?.shipping_address?.full_name || 'Customer'}
            </Text>
            <Text style={st.locationSub}>{a.orders?.shipping_address?.district}, {a.orders?.shipping_address?.region}</Text>
            {isAccepted && a.orders?.shipping_address && (
              <>
                <Text style={st.locationDetail}>{a.orders.shipping_address.street || a.orders.shipping_address.address}, {a.orders.shipping_address.ward}</Text>
                {a.orders.shipping_address.latitude && a.orders.shipping_address.longitude && (
                  <Pressable style={st.mapLink} onPress={() => openMap(a.orders.shipping_address.latitude, a.orders.shipping_address.longitude)}>
                    <FontAwesome name="map-marker" size={12} color={Theme.primary} />
                    <Text style={st.mapLinkText}>View Delivery Location</Text>
                  </Pressable>
                )}
              </>
            )}
            {isAccepted && a.orders?.users?.phone && (
              <Pressable style={st.phoneLink} onPress={() => callPhone(a.orders.users.phone)}>
                <FontAwesome name="phone" size={12} color="#2563eb" />
                <Text style={st.phoneLinkText}>{a.orders.users.phone}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Pre-accept notice */}
        {!isAccepted && (
          <View style={st.noticeBanner}>
            <FontAwesome name="info-circle" size={14} color="#b45309" />
            <Text style={st.noticeText}>Exact locations revealed after accepting.</Text>
          </View>
        )}

        {/* Delivery Fee */}
        <View style={st.feeRow}>
          <Text style={st.feeLabel}>Delivery Fee</Text>
          <Text style={st.feeValue}>TSh {Number(a.delivery_fee || 0).toLocaleString()}</Text>
        </View>

        {/* Action Buttons */}
        {isNotAccepted && (
          <View style={st.actionRow}>
            {!a.is_available_order && (
              <Pressable style={[st.rejectBtn]} onPress={() => updateStatus(a.id, 'rejected', a.is_available_order, a.order_id)} disabled={updatingId === a.id}>
                <Text style={st.rejectBtnText}>Reject</Text>
              </Pressable>
            )}
            <Pressable style={[st.acceptBtn, { flex: 1 }]} onPress={() => updateStatus(a.id, 'accepted', a.is_available_order, a.order_id)} disabled={updatingId === a.id}>
              {updatingId === a.id ? <ActivityIndicator color="#fff" size="small" /> : <><FontAwesome name="check-circle" size={14} color="#fff" /><Text style={st.acceptBtnText}>Accept Cargo</Text></>}
            </Pressable>
          </View>
        )}

        {(displayStatus === 'accepted') && isAccepted && (
          <Pressable style={st.fullActionBtn} onPress={() => updateStatus(a.id, 'picked_up')} disabled={updatingId === a.id}>
            {updatingId === a.id ? <ActivityIndicator color="#fff" /> : <><FontAwesome name="cube" size={14} color="#fff" /><Text style={st.fullActionText}>Mark as Picked Up</Text></>}
          </Pressable>
        )}

        {a.status === 'picked_up' && (
          <Pressable style={[st.fullActionBtn, { backgroundColor: '#7c3aed' }]} onPress={() => updateStatus(a.id, 'in_transit')} disabled={updatingId === a.id}>
            {updatingId === a.id ? <ActivityIndicator color="#fff" /> : <><FontAwesome name="truck" size={14} color="#fff" /><Text style={st.fullActionText}>Start Delivery</Text></>}
          </Pressable>
        )}

        {a.status === 'in_transit' && (
          <Pressable style={[st.fullActionBtn, { backgroundColor: Theme.success }]} onPress={() => { setSelectedId(a.id); setDeliveryPin(''); setPinModalOpen(true); }} disabled={updatingId === a.id}>
            <FontAwesome name="check-circle" size={14} color="#fff" />
            <Text style={st.fullActionText}>Complete Delivery</Text>
          </Pressable>
        )}

        {a.status === 'delivered' && a.delivered_at && (
          <View style={st.completedBadge}>
            <FontAwesome name="check-circle" size={16} color={Theme.success} />
            <Text style={st.completedText}>Completed • {new Date(a.delivered_at).toLocaleDateString()}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) return <View style={st.center}><ActivityIndicator color={Theme.primary} /><Text style={st.loadingText}>Loading assignments...</Text></View>;

  return (
    <View style={st.container}>
      {/* Delivery PIN Modal */}
      <Modal visible={pinModalOpen} transparent animationType="fade">
        <View style={st.pinOverlay}>
          <View style={st.pinCard}>
            <View style={st.pinHeader}>
              <FontAwesome name="lock" size={24} color="#fff" />
              <Text style={st.pinTitle}>Verify Delivery 📦</Text>
            </View>
            <View style={st.pinBody}>
              <Text style={st.pinDesc}>Enter the 4-digit Delivery PIN sent to the customer's phone to complete this delivery and release your escrow funds.</Text>
              <TextInput
                style={st.pinInput}
                value={deliveryPin}
                onChangeText={(t) => setDeliveryPin(t.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234"
                placeholderTextColor={Theme.textMuted}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
              />
              <Pressable style={[st.pinBtn, deliveryPin.length !== 4 && { opacity: 0.5 }]} onPress={verifyPin} disabled={updatingId === selectedId || deliveryPin.length !== 4}>
                {updatingId === selectedId ? <ActivityIndicator color="#fff" /> : <Text style={st.pinBtnText}>Verify & Complete</Text>}
              </Pressable>
              <Pressable onPress={() => { setPinModalOpen(false); setDeliveryPin(''); }}>
                <Text style={st.pinCancel}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sub-tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.subTabScroll} contentContainerStyle={st.subTabRow}>
        {TABS_DATA.map(t => (
          <Pressable key={t.key} style={[st.subTab, activeTab === t.key && st.subTabActive]} onPress={() => setActiveTab(t.key as Tab)}>
            <Text style={[st.subTabText, activeTab === t.key && st.subTabTextActive]}>{t.label}</Text>
            {t.count > 0 && (
              <View style={[st.countBadge, activeTab === t.key && st.countBadgeActive, t.key === TAB_AVAILABLE && { backgroundColor: Theme.error }]}>
                <Text style={st.countText}>{t.count}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.list}>
        {currentData.length === 0 ? (
          <View style={st.empty}><FontAwesome name="truck" size={48} color={Theme.textMuted} /><Text style={st.emptyText}>No trips in this tab</Text></View>
        ) : (
          currentData.map(renderCard)
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
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
  // List
  list: { padding: 16, gap: 14, paddingBottom: 40 },
  empty: { alignItems: 'center', padding: 48, gap: 12 },
  emptyText: { fontSize: 14, color: Theme.textMuted },
  // Card
  card: { backgroundColor: Theme.background, borderRadius: Theme.radiusLg, borderWidth: 1, borderColor: Theme.inputBorder, padding: 16, gap: 12, ...Theme.shadowSm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderNum: { fontSize: 16, fontWeight: '700', color: Theme.text },
  cardMeta: { fontSize: 11, color: Theme.textMuted, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  // Location
  locationBox: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: Theme.backgroundSecondary, borderRadius: Theme.radiusSm },
  locationLabel: { fontSize: 13, fontWeight: '600', color: Theme.text },
  locationSub: { fontSize: 11, color: Theme.textMuted, marginTop: 2 },
  locationDetail: { fontSize: 11, color: Theme.textSecondary, marginTop: 4, borderTopWidth: 0.5, borderTopColor: Theme.inputBorder, paddingTop: 4 },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  mapLinkText: { fontSize: 11, fontWeight: '600', color: Theme.primary },
  phoneLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  phoneLinkText: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  // Notice
  noticeBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#fef3c7', borderRadius: Theme.radiusSm, borderWidth: 1, borderColor: '#fde68a' },
  noticeText: { fontSize: 12, color: '#92400e', fontWeight: '600' },
  // Fee
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#f0fdf4', borderRadius: Theme.radiusSm, borderWidth: 1, borderColor: '#bbf7d0' },
  feeLabel: { fontSize: 13, fontWeight: '600', color: Theme.text },
  feeValue: { fontSize: 16, fontWeight: '800', color: '#15803d' },
  // Actions
  actionRow: { flexDirection: 'row', gap: 10 },
  rejectBtn: { borderWidth: 2, borderColor: Theme.error, paddingVertical: 10, paddingHorizontal: 16, borderRadius: Theme.radiusSm, alignItems: 'center' },
  rejectBtnText: { fontSize: 13, fontWeight: '700', color: Theme.error },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Theme.primary, paddingVertical: 12, borderRadius: Theme.radiusSm },
  acceptBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  fullActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Theme.primary, paddingVertical: 14, borderRadius: Theme.radiusSm },
  fullActionText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  completedText: { fontSize: 13, fontWeight: '600', color: Theme.success },
  // PIN Modal
  pinOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  pinCard: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', width: '100%', maxWidth: 340 },
  pinHeader: { backgroundColor: Theme.primary, padding: 28, alignItems: 'center', gap: 12 },
  pinTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  pinBody: { padding: 24, gap: 16, alignItems: 'center' },
  pinDesc: { fontSize: 13, color: Theme.textSecondary, textAlign: 'center', lineHeight: 20 },
  pinInput: { width: '100%', height: 64, backgroundColor: Theme.inputBg, borderRadius: Theme.radiusMd, borderWidth: 2, borderColor: Theme.primary, fontSize: 32, fontWeight: '900', textAlign: 'center', letterSpacing: 12, color: Theme.text },
  pinBtn: { width: '100%', backgroundColor: Theme.primary, paddingVertical: 16, borderRadius: Theme.radiusMd, alignItems: 'center' },
  pinBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  pinCancel: { fontSize: 14, color: Theme.textMuted, fontWeight: '600', marginTop: 4 },
});
