import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { apiGet } from '@/src/services/api';
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

  useEffect(() => {
    if (!token) {
      setError('Missing tracking session. Please start from the track order page.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res: any = await apiGet(`/tracking/status?token=${encodeURIComponent(token)}`);
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
    })();
  }, [token]);

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
});
