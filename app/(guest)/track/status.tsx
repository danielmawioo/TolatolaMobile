import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { useTrackingStatusData } from '@/src/hooks/useTrackingStatusData';
import { DeliveryConfirmationBanner } from '@/src/components/tracking/DeliveryConfirmationBanner';
import { OrderTimelineCard } from '@/src/components/tracking/OrderTimelineCard';
import { FundStatusCard } from '@/src/components/tracking/FundStatusCard';

export default function TrackStatusScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ token: string }>();
  const token = params.token;

  const {
    data,
    loading,
    error,
    confirming,
    handleConfirmDelivery,
    currentIndex,
    progressPercent,
  } = useTrackingStatusData(token);

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

  const { order, timeline = [], transporter, fund_status } = data;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40, paddingHorizontal: 16 }}
    >
      <Pressable style={styles.backButton} onPress={() => router.replace('/(tabs)')}>
        <FontAwesome name="arrow-left" size={14} color={Theme.textMuted} />
        <Text style={styles.backText}>Back to home</Text>
      </Pressable>

      <DeliveryConfirmationBanner
        order={order}
        token={token!}
        confirming={confirming}
        onConfirmDelivery={handleConfirmDelivery}
      />

      <OrderTimelineCard
        order={order}
        timeline={timeline}
        transporter={transporter}
        currentIndex={currentIndex}
        progressPercent={progressPercent}
      />

      {fund_status && <FundStatusCard fundStatus={fund_status} />}

      {/* Action Buttons */}
      <View style={styles.actionsGrid}>
        <Pressable
          style={[styles.actionBtn, styles.actionBtnOutline]}
          onPress={() => router.push('/(guest)/contact' as any)}
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
