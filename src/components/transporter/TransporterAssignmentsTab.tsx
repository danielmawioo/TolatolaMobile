import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
  Alert, Modal, TextInput, Linking,
} from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';
import { logger } from '@/src/lib/logger';
import {
  fetchTransporterAssignments,
  requestDeliveryConfirmation,
  updateAssignmentStatus,
  verifyAssignmentPin,
} from '@/src/services/assignments';
import {
  getProductPosition,
  productPositionDescription,
  productPositionLabel,
} from '@/src/lib/navigation';
import type { TransporterAssignment } from '@/src/schemas/assignments';

const TAB_AVAILABLE = 'available';
const TAB_ACCEPTED = 'accepted';
const TAB_IN_TRANSIT = 'in_transit';
const TAB_COMPLETED = 'completed';
type Tab = typeof TAB_AVAILABLE | typeof TAB_ACCEPTED | typeof TAB_IN_TRANSIT | typeof TAB_COMPLETED;

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  assigned: { bg: '#f3f4f6', text: '#4b5563', dot: '#9ca3af' },
  ready_for_pickup: { bg: '#fef3c7', text: '#b45309', dot: '#f59e0b' },
  available: { bg: '#f3f4f6', text: '#4b5563', dot: '#9ca3af' },
  accepted: { bg: '#dbeafe', text: '#1d4ed8', dot: '#2563eb' },
  picked_up: { bg: '#ede9fe', text: '#6d28d9', dot: '#7c3aed' },
  in_transit: { bg: '#ede9fe', text: '#6d28d9', dot: '#7c3aed' },
  delivered: { bg: '#dcfce7', text: '#15803d', dot: '#16a34a' },
  cancelled: { bg: '#fee2e2', text: '#b91c1c', dot: '#ef4444' },
};

interface Props { transporterId: string; accessToken: string; }

export function TransporterAssignmentsTab({ transporterId, accessToken }: Props) {
  const [assignments, setAssignments] = useState<TransporterAssignment[]>([]);
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
      setAssignments(await fetchTransporterAssignments(accessToken));
    } catch (e) { logger.error('Fetch assignments error', e); }
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

  const updateStatus = async (
    id: string,
    newStatus: string,
    isAvailable?: boolean | null,
    orderId?: string | null,
  ) => {
    setUpdatingId(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateAssignmentStatus({
        id,
        newStatus,
        isAvailable: Boolean(isAvailable),
        orderId: orderId ?? undefined,
        accessToken,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await fetchAssignments(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update status');
    }
    setUpdatingId(null);
  };

  const [requestingPush, setRequestingPush] = useState(false);

  const verifyPin = async () => {
    if (!selectedId || !deliveryPin || deliveryPin.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter a valid 4-digit Delivery PIN.');
      return;
    }
    setUpdatingId(selectedId);
    try {
      await verifyAssignmentPin(selectedId, deliveryPin, accessToken);
      setPinModalOpen(false); setSelectedId(null); setDeliveryPin('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Delivery completed and verified!');
      await fetchAssignments(true);
    } catch (e: any) {
      Alert.alert('PIN Error', e.message || 'Failed to verify PIN. Please check and try again.');
    }
    setUpdatingId(null);
  };

  const requestPushConfirmation = async () => {
    if (!selectedId) return;
    setRequestingPush(true);
    try {
      await requestDeliveryConfirmation(selectedId, accessToken);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Request Sent 🚚',
        'We have sent a push notification to the customer to confirm delivery. They can verify this directly on their device.'
      );
    } catch (e: any) {
      Alert.alert('Request Failed', e.message || 'Failed to request delivery confirmation. Please try again.');
    } finally {
      setRequestingPush(false);
    }
  };

  /**
   * Opens the in-app navigator. `auto` lets the navigator pick the right leg
   * from the trip status (pickup first, then drop-off); the explicit targets
   * are used by the per-stop links so a transporter can preview either stop.
   */
  const openNavigation = (a: TransporterAssignment, target: 'pickup' | 'dropoff' | 'auto') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(transporter)/delivery-map',
      params: {
        assignmentId: a.id,
        orderId: a.order_id || '',
        target,
        status: a.status,
        shopLat: a.shops?.latitude || '',
        shopLng: a.shops?.longitude || '',
        shopName: a.shops?.name || 'Shop',
        shopAddress: [a.shops?.address, a.shops?.ward, a.shops?.district, a.shops?.region]
          .filter(Boolean)
          .join(', '),
        shopPhone: a.shops?.phone || '',
        custLat: a.orders?.shipping_address?.latitude || '',
        custLng: a.orders?.shipping_address?.longitude || '',
        custName:
          a.orders?.users?.full_name ||
          a.orders?.shipping_address?.full_name ||
          'Customer',
        custAddress: [
          a.orders?.shipping_address?.street || a.orders?.shipping_address?.address,
          a.orders?.shipping_address?.ward,
          a.orders?.shipping_address?.district,
          a.orders?.shipping_address?.region,
        ]
          .filter(Boolean)
          .join(', '),
        custPhone: a.orders?.users?.phone || '',
      },
    } as any);
  };

  const callPhone = (phone: string) => { Linking.openURL(`tel:${phone}`); };

  const currentData = TABS_DATA.find(t => t.key === activeTab)?.data || [];

  const renderCard = (a: TransporterAssignment) => {
    const isAccepted = ['accepted', 'picked_up', 'in_transit', 'delivered'].includes(a.status) || !!a.accepted_at;
    const isNotAccepted = ['assigned', 'ready_for_pickup', 'available'].includes(a.status) && !a.accepted_at;
    const displayStatus = (a.status === 'assigned' && a.accepted_at) ? 'accepted' : a.status;
    const productPosition = getProductPosition(displayStatus);
    const delivered = displayStatus === 'delivered';
    const sc = STATUS_COLORS[displayStatus] || STATUS_COLORS.assigned;

    return (
      <View key={a.id} style={[st.card, !isAccepted && st.cardUnaccepted]}>
        {/* Card Header */}
        <View style={st.cardHeader}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.orderNum}>Order #{a.orders?.order_number || a.order_id?.slice(0, 8)}</Text>
            <View style={st.cardMetaRow}>
              <FontAwesome name="truck" size={11} color={Theme.primary} />
              <Text style={st.cardMeta}>{a.transport_methods?.name || 'Standard'} • {a.distance_km || '?'} km</Text>
            </View>
          </View>
          <View style={[st.statusBadge, { backgroundColor: sc.bg }]}>
            <View style={[st.statusDot, { backgroundColor: sc.dot }]} />
            <Text style={[st.statusText, { color: sc.text }]}>{displayStatus.replace('_', ' ')}</Text>
          </View>
        </View>

        {/* Visual Route Journey (Pickup to Delivery Stepper) */}
        <View style={st.journeyContainer}>
          <View style={st.journeyTimeline}>
            <View style={st.journeyNodePickup}>
              <View style={st.journeyNodeDotPickup} />
            </View>
            <View style={st.journeyTrack} />
            <View style={st.journeyNodeDropoff}>
              <View style={st.journeyNodeDotDropoff} />
            </View>
          </View>

          <View style={st.journeyContent}>
            {/* Pickup Stop Node */}
            <View style={st.locationBox}>
              <View style={st.locationHeaderRow}>
                <Text style={st.stopTagPickup}>PICKUP STOP</Text>
                {isAccepted && a.shops?.phone && (
                  <Pressable style={st.phonePill} onPress={() => callPhone(a.shops!.phone!)}>
                    <FontAwesome name="phone" size={11} color="#15803d" />
                    <Text style={st.phonePillText}>{a.shops.phone}</Text>
                  </Pressable>
                )}
              </View>
              <Text style={st.locationLabel}>Pickup from: {a.shops?.name || 'Shop'}</Text>
              {(() => {
                const s = a.shops;
                const parts = [s?.address, s?.district, s?.region].filter(
                  p => Boolean(p && String(p).trim() !== '' && String(p).trim() !== ',')
                );
                return parts.length > 0 ? (
                  <Text style={st.locationSub}>{parts.join(', ')}</Text>
                ) : null;
              })()}
              {isAccepted && !delivered && a.shops?.latitude && a.shops?.longitude && (
                <Pressable style={st.mapActionBtnPickup} onPress={() => openNavigation(a, 'pickup')}>
                  <FontAwesome name="location-arrow" size={13} color="#fff" />
                  <Text style={st.mapActionBtnText}>Navigate to pickup</Text>
                </Pressable>
              )}
            </View>

            {/* Drop-off Destination Node */}
            <View style={st.locationBox}>
              <View style={st.locationHeaderRow}>
                <Text style={st.stopTagDropoff}>DROP-OFF DESTINATION</Text>
                {isAccepted && a.orders?.users?.phone && (
                  <Pressable style={st.phonePillDropoff} onPress={() => callPhone(a.orders!.users!.phone!)}>
                    <FontAwesome name="phone" size={11} color="#6d28d9" />
                    <Text style={st.phonePillDropoffText}>{a.orders.users.phone}</Text>
                  </Pressable>
                )}
              </View>
              <Text style={st.locationLabel}>
                Deliver to: {a.orders?.users?.full_name || a.orders?.shipping_address?.full_name || 'Customer'}
              </Text>
              {(() => {
                const addr = a.orders?.shipping_address;
                const parts = [
                  addr?.street || addr?.address,
                  addr?.ward,
                  addr?.district,
                  addr?.region,
                ].filter(p => Boolean(p && String(p).trim() !== '' && String(p).trim() !== ','));
                return parts.length > 0 ? (
                  <Text style={st.locationDetail}>{parts.join(', ')}</Text>
                ) : addr?.latitude ? (
                  <Text style={st.locationSub}>GPS: {Number(addr.latitude).toFixed(4)}, {Number(addr.longitude).toFixed(4)}</Text>
                ) : null;
              })()}
              {isAccepted && !delivered && a.orders?.shipping_address?.latitude && a.orders?.shipping_address?.longitude && (
                <Pressable style={st.mapActionBtnDropoff} onPress={() => openNavigation(a, 'dropoff')}>
                  <FontAwesome name="location-arrow" size={13} color="#fff" />
                  <Text style={st.mapActionBtnText}>Navigate to drop-off</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Product position card */}
        {isAccepted && (
          <View
            style={[
              st.productStatusBox,
              productPosition === 'delivered' && st.productStatusDelivered,
              productPosition === 'with_driver' && st.productStatusWithDriver,
            ]}
          >
            <View
              style={[
                st.productStatusIcon,
                productPosition === 'delivered' && { backgroundColor: '#dcfce7' },
                productPosition === 'with_driver' && { backgroundColor: '#f3e8ff' },
              ]}
            >
              <FontAwesome
                name={
                  productPosition === 'delivered'
                    ? 'check-circle'
                    : productPosition === 'with_driver'
                      ? 'cube'
                      : 'shopping-bag'
                }
                size={14}
                color={
                  productPosition === 'delivered'
                    ? Theme.success
                    : productPosition === 'with_driver'
                      ? '#7c3aed'
                      : '#0284c7'
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.productStatusLabel}>
                Product: {productPositionLabel(productPosition)}
              </Text>
              <Text style={st.productStatusDesc}>
                {productPositionDescription(productPosition)}
              </Text>
            </View>
          </View>
        )}

        {/* Pre-accept notice */}
        {!isAccepted && (
          <View style={st.noticeBanner}>
            <FontAwesome name="info-circle" size={14} color="#b45309" />
            <Text style={st.noticeText}>Exact locations revealed after accepting.</Text>
          </View>
        )}

        {/* Delivery Fee Card */}
        <View style={st.feeRow}>
          <View>
            <Text style={st.feeLabel}>Delivery Fee</Text>
            <Text style={st.feeSub}>Paid into wallet upon completion</Text>
          </View>
          <Text style={st.feeValue}>TSh {Number(a.delivery_fee || 0).toLocaleString()}</Text>
        </View>

        {/* GPS Navigator Action */}
        {isAccepted && ['accepted', 'picked_up', 'in_transit'].includes(a.status) && (
          <Pressable
            style={[st.fullActionBtn, { backgroundColor: '#0284c7' }]}
            onPress={() => openNavigation(a, 'auto')}
          >
            <FontAwesome name="compass" size={16} color="#fff" />
            <Text style={st.fullActionText}>
              {displayStatus === 'accepted'
                ? 'Start pickup navigation'
                : 'Start delivery navigation'}
            </Text>
          </Pressable>
        )}

        {/* Action Buttons */}
        {isNotAccepted && (
          <View style={st.actionRow}>
            {!a.is_available_order && (
              <Pressable style={st.rejectBtn} onPress={() => updateStatus(a.id, 'rejected', a.is_available_order, a.order_id)} disabled={updatingId === a.id}>
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
          <View style={{ gap: 8 }}>
            <Pressable
              style={[st.fullActionBtn, { backgroundColor: '#7c3aed' }]}
              onPress={() => openNavigation(a, 'dropoff')}
            >
              <FontAwesome name="location-arrow" size={14} color="#fff" />
              <Text style={st.fullActionText}>Navigate to customer</Text>
            </Pressable>
            <Pressable
              style={{ alignItems: 'center', paddingVertical: 4 }}
              onPress={() => {
                setSelectedId(a.id);
                setDeliveryPin('');
                setPinModalOpen(true);
              }}
            >
              <Text style={{ fontSize: 11, color: Theme.textSecondary, textDecorationLine: 'underline', fontWeight: '600' }}>
                Complete Delivery
              </Text>
            </Pressable>
          </View>
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
              
              <Pressable 
                style={[st.pushBtn, requestingPush && { opacity: 0.7 }]} 
                onPress={requestPushConfirmation} 
                disabled={requestingPush || updatingId === selectedId}
              >
                {requestingPush ? <ActivityIndicator color={Theme.primary} /> : <Text style={st.pushBtnText}>No PIN? Request Push Confirm</Text>}
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
  subTabRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 6, alignItems: 'center', height: 44 },
  subTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  subTabActive: { backgroundColor: Theme.primary },
  subTabText: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  subTabTextActive: { color: '#fff', fontWeight: '700' },
  countBadge: { backgroundColor: Theme.textMuted, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  countBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  countText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  // List
  list: { padding: 16, gap: 14, paddingBottom: 40 },
  empty: { alignItems: 'center', padding: 48, gap: 12 },
  emptyText: { fontSize: 14, color: Theme.textMuted },

  // Card
  card: {
    backgroundColor: Theme.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    padding: 16,
    gap: 14,
    ...Theme.shadowSm,
  },
  cardUnaccepted: {
    borderColor: Theme.primary + '40',
    backgroundColor: Theme.primary + '06',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  orderNum: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.text,
    letterSpacing: -0.3,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  cardMeta: {
    fontSize: 11,
    color: Theme.textMuted,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  // Journey Stepper
  journeyContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  journeyTimeline: {
    width: 14,
    alignItems: 'center',
    paddingVertical: 8,
  },
  journeyNodePickup: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#dcfce7',
    borderWidth: 1.5,
    borderColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyNodeDotPickup: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#16a34a',
  },
  journeyTrack: {
    flex: 1,
    width: 2,
    backgroundColor: Theme.inputBorder,
    marginVertical: 4,
  },
  journeyNodeDropoff: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ede9fe',
    borderWidth: 1.5,
    borderColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyNodeDotDropoff: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#7c3aed',
  },
  journeyContent: {
    flex: 1,
    gap: 10,
  },

  // Location Nodes
  locationBox: {
    padding: 12,
    backgroundColor: Theme.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    gap: 3,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stopTagPickup: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803d',
    letterSpacing: 0.5,
  },
  stopTagDropoff: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6d28d9',
    letterSpacing: 0.5,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  phonePillText: {
    fontSize: 11,
    color: '#15803d',
    fontWeight: '700',
  },
  phonePillDropoff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  phonePillDropoffText: {
    fontSize: 11,
    color: '#6d28d9',
    fontWeight: '700',
  },
  locationLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.text,
  },
  locationSub: {
    fontSize: 11,
    color: Theme.textMuted,
  },
  locationDetail: {
    fontSize: 11,
    color: Theme.textSecondary,
    marginTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: Theme.inputBorder,
    paddingTop: 4,
  },
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  mapLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.primary,
  },
  mapLinkDropoff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  mapLinkDropoffText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  mapActionBtnPickup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  mapActionBtnDropoff: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7c3aed',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  mapActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  // Product location
  productStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  productStatusWithDriver: {
    backgroundColor: '#faf5ff',
    borderColor: '#e9d5ff',
  },
  productStatusDelivered: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  productStatusIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0f2fe',
  },
  productStatusLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Theme.text,
  },
  productStatusDesc: {
    fontSize: 10,
    color: Theme.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },

  // Notice
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  noticeText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
    flex: 1,
  },

  // Fee
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  feeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
  },
  feeSub: {
    fontSize: 10,
    color: '#166534',
    marginTop: 1,
  },
  feeValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#15803d',
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectBtn: {
    borderWidth: 1.5,
    borderColor: Theme.error,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.error,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Theme.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  fullActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Theme.primary,
    paddingVertical: 14,
    borderRadius: 10,
  },
  fullActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  completedText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.success,
  },

  // PIN Modal
  pinOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pinCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 340,
  },
  pinHeader: {
    backgroundColor: Theme.primary,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  pinTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  pinBody: {
    padding: 24,
    gap: 16,
    alignItems: 'center',
  },
  pinDesc: {
    fontSize: 13,
    color: Theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  pinInput: {
    width: '100%',
    height: 64,
    backgroundColor: Theme.inputBg,
    borderRadius: Theme.radiusMd,
    borderWidth: 2,
    borderColor: Theme.primary,
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 12,
    color: Theme.text,
  },
  pinBtn: {
    width: '100%',
    backgroundColor: Theme.primary,
    paddingVertical: 15,
    borderRadius: Theme.radiusMd,
    alignItems: 'center',
  },
  pinBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  pushBtn: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: Theme.primary,
    paddingVertical: 13,
    borderRadius: Theme.radiusMd,
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
  },
  pushBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.primary,
  },
  pinCancel: {
    fontSize: 14,
    color: Theme.textMuted,
    fontWeight: '600',
    marginTop: 4,
  },
});
