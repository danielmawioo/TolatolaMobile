import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { apiGet, apiPost } from '@/src/services/api';
import { Theme } from '@/constants/Theme';

const TIMELINE_STEPS = [
  { id: 'ORDER_RECEIVED', label: 'Order Received' },
  { id: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed' },
  { id: 'PROCESSING', label: 'Processing' },
  { id: 'DISPATCHED', label: 'Dispatched' },
  { id: 'IN_TRANSIT', label: 'In Transit' },
  { id: 'DELIVERED', label: 'Delivered' },
];

const STATUS_INDEX_MAP: Record<string, number> = {
  ORDER_RECEIVED: 0,
  pending: 0,
  pending_payment: 0,
  PAYMENT_CONFIRMED: 1,
  confirmed: 1,
  paid: 1,
  PROCESSING: 2,
  processing: 2,
  preparing: 2,
  DISPATCHED: 3,
  dispatched: 3,
  ready_for_pickup: 3,
  picked_up: 3,
  IN_TRANSIT: 4,
  in_transit: 4,
  shipped: 4,
  DELIVERED: 5,
  delivered: 5,
  completed: 5,
};

export default function TrackStatusScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ token: string }>();
  const token = params.token;
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const fetchStatus = async () => {
    try {
      const res: any = await apiGet(`/tracking/status?token=${encodeURIComponent(token!)}`);
      const normalized = res?.data || res;
      const order = normalized?.order || normalized;
      if (!order) {
        throw new Error('Order status data not found.');
      }
      setData({ ...normalized, order });
    } catch (e: any) {
      setError(e?.message || 'Failed to load order status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setError('Missing tracking session. Please start from the track order page.');
      setLoading(false);
      return;
    }
    fetchStatus();
  }, [token]);

  const handleConfirmDelivery = async () => {
    if (!data?.order?.id) return;
    setConfirming(true);
    try {
      await apiPost(`/orders/${data.order.id}/confirm-delivery`, {});
      Alert.alert(
        'Delivery Confirmed! 🎉',
        'Thank you for confirming your delivery. Escrow funds have been successfully released to the vendor and transporter.'
      );
      await fetchStatus();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to confirm delivery. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Theme.primary} />
        <Text style={styles.loadingText}>Loading order status…</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <View style={styles.errorCard}>
          <FontAwesome name="exclamation-circle" size={24} color={Theme.error} style={{ marginBottom: 12 }} />
          <Text style={styles.errorTitle}>{error || 'Order not found.'}</Text>
          <Pressable style={styles.outlineButton} onPress={() => router.replace('/(guest)/track')}>
            <Text style={styles.outlineButtonText}>Track another order</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const { order, timeline = [], transporter } = data;
  const currentIndex = STATUS_INDEX_MAP[String(order.status)] ?? TIMELINE_STEPS.findIndex(s => s.id === order.status);
  const progressPercent = currentIndex >= 0 ? ((currentIndex + 1) / TIMELINE_STEPS.length) * 100 : 0;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40, paddingHorizontal: 16 }}
    >
      <Pressable style={styles.backButton} onPress={() => router.replace('/(tabs)')}>
        <FontAwesome name="arrow-left" size={14} color={Theme.textMuted} />
        <Text style={styles.backText}>Back to home</Text>
      </Pressable>

      {/* Alternative Delivery Confirmation Banner */}
      {order.delivery_confirmation_requested && order.status !== 'delivered' && order.status !== 'completed' && (
        <View style={styles.confirmBanner}>
          <View style={styles.confirmIconBg}>
            <FontAwesome name="truck" size={22} color={Theme.primary} />
          </View>
          <Text style={styles.confirmTitle}>Have you received your product? 📦</Text>
          <Text style={styles.confirmDesc}>
            Your transporter requests confirmation to complete this delivery. Please confirm only if you have received the items.
          </Text>
          <View style={styles.confirmActionRow}>
            <Pressable 
              style={[styles.confirmBtn, confirming && { opacity: 0.7 }]} 
              onPress={handleConfirmDelivery}
              disabled={confirming}
            >
              {confirming ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <FontAwesome name="check" size={13} color="#fff" />
                  <Text style={styles.confirmBtnText}>Confirm Delivery</Text>
                </>
              )}
            </Pressable>
            <Pressable 
              style={styles.reportBtn} 
              onPress={() => router.push({
                pathname: '/(guest)/track/complaint',
                params: { token: token!, orderId: order.id }
              })}
            >
              <FontAwesome name="exclamation-circle" size={13} color={Theme.error} />
              <Text style={styles.reportBtnText}>Report Issue</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderNumberTitle}>Order {order.order_number}</Text>
            <Text style={styles.trackingCode}>{order.tracking_code}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{(order.status || '').replace(/_/g, ' ')}</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          {/* Timeline */}
          <Text style={styles.sectionTitle}>ORDER TIMELINE</Text>
          
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          <View style={styles.timelineList}>
            {TIMELINE_STEPS.map((step, idx) => {
              const done = currentIndex > idx || (currentIndex === idx && order.status === 'DELIVERED');
              const current = currentIndex === idx && order.status !== 'DELIVERED';
              const timeItem = timeline.find((t: any) => t.status === step.id);

              return (
                <View key={step.id} style={styles.timelineRow}>
                  <View style={styles.timelineIconBox}>
                    {done ? (
                      <FontAwesome name="check-circle" size={20} color="#16a34a" />
                    ) : current ? (
                      <View style={styles.currentIconInner} />
                    ) : (
                      <View style={styles.pendingIconOuter} />
                    )}
                  </View>
                  <Text style={[
                    styles.timelineStepText, 
                    done ? styles.stepTextDone : current ? styles.stepTextCurrent : styles.stepTextPending
                  ]}>
                    {step.label}
                  </Text>
                  {timeItem?.completed_at && (
                    <Text style={styles.timelineTime}>
                      {new Date(timeItem.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Delivery Details */}
          {transporter && (
            <View style={styles.deliveryBox}>
              <Text style={styles.sectionTitle}>DELIVERY DETAILS</Text>
              
              <View style={styles.deliveryRow}>
                <FontAwesome name="truck" size={16} color={Theme.textMuted} />
                <Text style={styles.deliveryText}>{transporter.name}</Text>
              </View>

              {transporter.phone_masked && (
                <View style={styles.deliveryRow}>
                  <FontAwesome name="phone" size={16} color={Theme.textMuted} />
                  <Text style={[styles.deliveryText, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                    {transporter.phone_masked}
                  </Text>
                </View>
              )}

              {order.estimated_arrival && (
                <View style={styles.deliveryRow}>
                  <FontAwesome name="clock-o" size={16} color={Theme.textMuted} />
                  <Text style={styles.deliveryText}>
                    ETA: {new Date(order.estimated_arrival).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Fund Status Widget */}
      {data.fund_status && (
        <View style={styles.fundStatusCard}>
          <View style={styles.fundStatusHeader}>
            <FontAwesome name="shield" size={16} color={Theme.primary} />
            <Text style={styles.sectionTitle}>REAL-TIME FUND STATUS</Text>
            <View style={styles.fundStatusBadge}>
              <Text style={styles.fundStatusBadgeText}>
                {(data.fund_status.status || '').replace(/_/g, ' ').toLowerCase()}
              </Text>
            </View>
          </View>

          <View style={styles.fundTimeline}>
            {(data.fund_status.timeline || []).map((step: any, idx: number) => {
              const isCompleted = step.status === 'completed';
              const isLast = idx === data.fund_status.timeline.length - 1;
              const iconName = {
                payment_received: 'money',
                protected: 'lock',
                pending_settlement: 'clock-o',
                vendor_paid: 'credit-card',
                transporter_paid: 'truck',
                settlement_completed: 'check-circle',
              }[step.key as string] || 'circle-o';

              return (
                <View key={step.key} style={styles.fundTimelineRow}>
                  {/* Vertical connector line */}
                  {!isLast && (
                    <View style={[
                      styles.fundTimelineConnector,
                      isCompleted ? styles.fundConnectorDone : styles.fundConnectorPending
                    ]} />
                  )}
                  {/* Icon circle */}
                  <View style={[
                    styles.fundTimelineIcon,
                    isCompleted ? styles.fundIconDone : styles.fundIconPending
                  ]}>
                    <FontAwesome 
                      name={iconName as any} 
                      size={12} 
                      color={isCompleted ? '#16a34a' : Theme.textMuted} 
                    />
                  </View>
                  {/* Text */}
                  <View style={styles.fundTimelineContent}>
                    <Text style={[
                      styles.fundStepLabel,
                      isCompleted ? styles.fundStepLabelDone : styles.fundStepLabelPending
                    ]}>
                      {step.label}
                    </Text>
                    <Text style={styles.fundStepDesc}>{step.description}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.fundDisclaimer}>
            <FontAwesome name="info-circle" size={12} color={Theme.textMuted} style={{ marginTop: 2 }} />
            <Text style={styles.fundDisclaimerText}>
              TOLA does not hold customer funds or operate a wallet; it only displays the real-time fund status provided by our payment and escrow partners.
            </Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsGrid}>
        <Pressable 
          style={[styles.actionBtn, styles.actionBtnOutline]}
          onPress={() => router.push('/(guest)/contact')}
        >
          <FontAwesome name="comments-o" size={16} color={Theme.text} />
          <Text style={styles.actionBtnOutlineText}>Contact Support</Text>
        </Pressable>

        <Pressable 
          style={[styles.actionBtn, styles.actionBtnSecondary]}
          onPress={() => router.push({
            pathname: '/(guest)/track/complaint',
            params: { token: token!, orderId: order.id }
          })}
        >
          <FontAwesome name="exclamation-triangle" size={16} color={Theme.text} />
          <Text style={styles.actionBtnSecondaryText}>Raise Complaint</Text>
        </Pressable>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.backgroundSecondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.backgroundSecondary,
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Theme.textMuted,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 14,
    color: Theme.textMuted,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.error + '40',
    alignItems: 'center',
    width: '100%',
    ...Theme.shadowSm,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.error,
    marginBottom: 20,
    textAlign: 'center',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.text,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Theme.shadowSm,
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardHeader: {
    backgroundColor: Theme.backgroundTertiary,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumberTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Theme.text,
    marginBottom: 4,
  },
  trackingCode: {
    fontSize: 13,
    color: Theme.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  badge: {
    backgroundColor: Theme.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.textSecondary,
    textTransform: 'uppercase',
  },
  cardContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Theme.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Theme.inputBg,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Theme.primary,
  },
  timelineList: {
    gap: 16,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timelineIconBox: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentIconInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: Theme.primary,
  },
  pendingIconOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Theme.inputBorder,
  },
  timelineStepText: {
    fontSize: 15,
  },
  stepTextDone: {
    color: Theme.text,
    fontWeight: '500',
  },
  stepTextCurrent: {
    color: Theme.primary,
    fontWeight: '700',
  },
  stepTextPending: {
    color: Theme.textMuted,
  },
  timelineTime: {
    fontSize: 12,
    color: Theme.textMuted,
    marginLeft: 'auto',
  },
  deliveryBox: {
    marginTop: 32,
    padding: 16,
    backgroundColor: Theme.backgroundTertiary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  deliveryText: {
    fontSize: 14,
    color: Theme.text,
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    backgroundColor: '#fff',
  },
  actionBtnOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.text,
  },
  actionBtnSecondary: {
    backgroundColor: Theme.backgroundTertiary,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  actionBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.text,
  },
  confirmBanner: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Theme.primary + '25',
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  confirmIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Theme.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  confirmDesc: {
    fontSize: 13,
    color: Theme.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  confirmActionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: Theme.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  reportBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: Theme.error + '10',
    borderWidth: 1,
    borderColor: Theme.error + '25',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reportBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.error,
  },
  // Fund Status Widget styles
  fundStatusCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Theme.shadowSm,
    marginBottom: 20,
    padding: 20,
  },
  fundStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  fundStatusBadge: {
    marginLeft: 'auto',
    backgroundColor: Theme.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.primary + '20',
  },
  fundStatusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.primary,
    textTransform: 'capitalize',
  },
  fundTimeline: {
    gap: 0,
  },
  fundTimelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 20,
    position: 'relative',
  },
  fundTimelineConnector: {
    position: 'absolute',
    left: 15,
    top: 30,
    width: 2,
    height: '100%',
  },
  fundConnectorDone: {
    backgroundColor: '#16a34a40',
  },
  fundConnectorPending: {
    backgroundColor: Theme.inputBorder,
  },
  fundTimelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    zIndex: 1,
  },
  fundIconDone: {
    borderColor: '#16a34a',
  },
  fundIconPending: {
    borderColor: Theme.inputBorder,
  },
  fundTimelineContent: {
    flex: 1,
    paddingTop: 4,
  },
  fundStepLabel: {
    fontSize: 14,
  },
  fundStepLabelDone: {
    fontWeight: '700',
    color: Theme.text,
  },
  fundStepLabelPending: {
    fontWeight: '500',
    color: Theme.textMuted,
  },
  fundStepDesc: {
    fontSize: 12,
    color: Theme.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  fundDisclaimer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Theme.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    padding: 12,
    marginTop: 4,
  },
  fundDisclaimerText: {
    flex: 1,
    fontSize: 11,
    color: Theme.textMuted,
    lineHeight: 16,
  },
});
