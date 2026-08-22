import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import {
  TIMELINE_STEPS,
  type TrackingOrder,
  type TrackingTimelineEntry,
  type TrackingTransporter,
} from '@/src/hooks/useTrackingStatusData';

interface Props {
  order: TrackingOrder;
  timeline: TrackingTimelineEntry[];
  transporter?: TrackingTransporter | null;
  currentIndex: number;
  progressPercent: number;
}

/** Order header, progress timeline, and delivery details card for the guest tracking screen. */
export function OrderTimelineCard({ order, timeline, transporter, currentIndex, progressPercent }: Props) {
  return (
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
            const timeItem = timeline.find((t) => t.status === step.id);

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
  );
}

const styles = StyleSheet.create({
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
});
