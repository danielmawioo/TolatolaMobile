import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import type { TrackingOrder } from '@/src/hooks/useTrackingStatusData';

interface Props {
  order: TrackingOrder;
  token: string;
  confirming: boolean;
  onConfirmDelivery: () => void;
}

/** Banner prompting the guest to confirm receipt when the transporter has requested it. */
export function DeliveryConfirmationBanner({ order, token, confirming, onConfirmDelivery }: Props) {
  if (!order.delivery_confirmation_requested || order.status === 'delivered' || order.status === 'completed') {
    return null;
  }

  return (
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
          onPress={onConfirmDelivery}
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
            params: { token, orderId: order.id },
          })}
        >
          <FontAwesome name="exclamation-circle" size={13} color={Theme.error} />
          <Text style={styles.reportBtnText}>Report Issue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
