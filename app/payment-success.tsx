import React from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as WebBrowser from 'expo-web-browser';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';
import { useAuth } from '@/src/contexts/AuthContext';
import { logger } from '@/src/lib/logger';
import { usePaymentStatus, TRACKING_STEPS } from '@/src/hooks/usePaymentStatus';

export default function PaymentSuccessScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    orderId?: string; paymentMethod?: string;
    transactionId?: string; controlNumber?: string;
  }>();
  const { session } = useAuth();

  const orderId = params.orderId || '';
  const pmMethod = params.paymentMethod || '';

  const { order, loading, paymentStatus, isCod, isBank, isCard, currentStep } = usePaymentStatus({
    orderId,
    paymentMethod: pmMethod,
    controlNumber: params.controlNumber,
    accessToken: session?.access_token,
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Theme.primary} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 + insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Banner */}
      <View style={styles.heroBanner}>
        <View style={styles.heroIcon}>
          <FontAwesome name="check" size={32} color="#fff" />
        </View>
        <View style={styles.heroTitleRow}>
          <Text style={styles.heroTitle}>Order</Text>
          <Text style={[styles.heroTitle, styles.heroTitleDim]}>Confirmed.</Text>
        </View>
        <Text style={styles.heroSub}>
          {isCod ? "We've received your order. Please prepare cash for delivery."
            : paymentStatus === 'paid' ? 'Your order has been placed and payment is secured.'
            : 'Your order has been placed! Payment is being processed.'}
        </Text>
      </View>

      <View style={styles.body}>
        {/* Payment Status Banner */}
        {paymentStatus === 'processing' && !isCod && (
          <View style={styles.statusBannerWarning}>
            <ActivityIndicator size="small" color="#b45309" />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusBannerTitle}>Payment Processing</Text>
              <Text style={styles.statusBannerSub}>
                {['m-pesa', 'airtel-money', 'halopesa', 'mixx-by-yas', 'ezypesa'].includes(pmMethod)
                  ? 'Please check your phone and approve the USSD prompt.'
                  : isBank ? 'Use the control number to complete payment.'
                  : isCard ? 'Please complete your payment on the secure payment page.'
                  : 'Your payment is being verified.'}
              </Text>
            </View>
          </View>
        )}
        {paymentStatus === 'paid' && !isCod && (
          <View style={styles.statusBannerSuccess}>
            <FontAwesome name="check-circle" size={18} color={Theme.success} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusBannerTitle, { color: '#166534' }]}>Payment Confirmed</Text>
              <Text style={[styles.statusBannerSub, { color: '#15803d' }]}>Payment verified successfully.</Text>
            </View>
          </View>
        )}
        {paymentStatus === 'failed' && (
          <View style={styles.statusBannerError}>
            <FontAwesome name="exclamation-circle" size={18} color={Theme.error} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusBannerTitle, { color: '#991b1b' }]}>Payment Issue</Text>
              <Text style={[styles.statusBannerSub, { color: '#b91c1c' }]}>
                There was an issue with your payment. Please contact support.
              </Text>
            </View>
          </View>
        )}

        {/* Bank Control Number */}
        {paymentStatus !== 'paid' && isBank && (params.controlNumber || order?.clickpesa_transaction_id) && (
          <View style={styles.controlNumberCard}>
            <View style={styles.controlNumberHeader}>
              <FontAwesome name="university" size={16} color={Theme.primary} />
              <Text style={styles.controlNumberTitle}>Complete Bank Payment</Text>
            </View>
            <Text style={styles.controlNumberLabel}>Control Number</Text>
            <Text style={styles.controlNumberValue}>
              {params.controlNumber || order?.clickpesa_transaction_id}
            </Text>
            <View style={styles.controlInstructions}>
              <Text style={styles.controlInstructionsTitle}>Instructions</Text>
              <Text style={styles.controlInstructionsItem}>• Dial *150*03# (CRDB SimBanking)</Text>
              <Text style={styles.controlInstructionsItem}>• Select 'Bill Payment'</Text>
              <Text style={styles.controlInstructionsItem}>• Enter the Control Number above</Text>
              <Text style={styles.controlInstructionsItem}>• Follow prompts to complete</Text>
            </View>
          </View>
        )}

        {/* Card Payment Link */}
        {paymentStatus !== 'paid' && isCard && (() => {
          const paymentUrl = params.controlNumber || order?.stripe_payment_intent_id;
          return paymentUrl && paymentUrl.startsWith('http') ? (
            <View style={styles.controlNumberCard}>
              <View style={styles.controlNumberHeader}>
                <FontAwesome name="credit-card" size={16} color={Theme.primary} />
                <Text style={styles.controlNumberTitle}>Complete Card Payment</Text>
              </View>
              <Text style={styles.cardPaymentDesc}>
                Tap the button below to open the secure payment gateway and complete your card transaction.
              </Text>
              <Pressable
                style={styles.cardPaymentBtn}
                onPress={() => {
                  WebBrowser.openBrowserAsync(paymentUrl).catch((err) => {
                    logger.error('[PAYMENT_SUCCESS] Failed to open card payment browser:', err);
                  });
                }}
              >
                <FontAwesome name="external-link" size={16} color="#fff" />
                <Text style={styles.cardPaymentBtnText}>Pay Securely with Card</Text>
              </Pressable>
            </View>
          ) : null;
        })()}

        {/* Order Tracking Progress */}
        <View style={styles.trackingCard}>
          <Text style={styles.trackingSectionTitle}>Live Order Tracking</Text>
          <View style={styles.trackingSteps}>
            {TRACKING_STEPS.map((step, idx) => {
              const isDone = currentStep > idx;
              const isCurrent = currentStep === idx;
              return (
                <View key={step.id} style={styles.trackingStep}>
                  <View style={styles.trackingDotCol}>
                    <View style={[
                      styles.trackingDot,
                      isDone && styles.trackingDotDone,
                      isCurrent && styles.trackingDotCurrent,
                    ]}>
                      {isDone ? (
                        <FontAwesome name="check" size={10} color="#fff" />
                      ) : (
                        <View style={styles.trackingDotInner} />
                      )}
                    </View>
                    {idx < TRACKING_STEPS.length - 1 && (
                      <View style={[styles.trackingLine, isDone && styles.trackingLineDone]} />
                    )}
                  </View>
                  <View style={styles.trackingTextCol}>
                    <Text style={[
                      styles.trackingLabel,
                      isDone && styles.trackingLabelDone,
                      isCurrent && styles.trackingLabelCurrent,
                    ]}>
                      {step.label}
                    </Text>
                    {isCurrent && <Text style={styles.trackingSubtext}>Currently in progress...</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Order Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Number</Text>
            <Text style={styles.infoValue}>{order?.order_number || `TOLA-${orderId?.slice(-8)}`}</Text>
          </View>
          {order?.tracking_code && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tracking Code</Text>
              <Text style={styles.infoValue}>{order.tracking_code}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estimated Delivery</Text>
            <Text style={styles.infoValue}>1-3 Business Days</Text>
          </View>
          {order?.total_amount && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Amount</Text>
              <Text style={styles.infoValueBold}>TSh {Number(order.total_amount).toLocaleString()}</Text>
            </View>
          )}
        </View>

        {/* Shipping Address */}
        {order?.shipping_address && (
          <View style={styles.infoCard}>
            <Text style={styles.infoSectionTitle}>Shipping To</Text>
            <View style={styles.addressRow}>
              <FontAwesome name="user" size={14} color={Theme.textMuted} />
              <Text style={styles.addressText}>{order.shipping_address.full_name || 'Guest'}</Text>
            </View>
            <View style={styles.addressRow}>
              <FontAwesome name="phone" size={14} color={Theme.textMuted} />
              <Text style={styles.addressText}>{order.shipping_address.phone || 'N/A'}</Text>
            </View>
            <View style={styles.addressRow}>
              <FontAwesome name="map-marker" size={14} color={Theme.textMuted} />
              <Text style={styles.addressText}>
                {[order.shipping_address.street, order.shipping_address.ward, order.shipping_address.district, order.shipping_address.region].filter(Boolean).join(', ')}
              </Text>
            </View>
          </View>
        )}

        {/* Buyer Protection */}
        <View style={styles.protectionCard}>
          <View style={styles.protectionIcon}>
            <FontAwesome name="shield" size={20} color={Theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.protectionTitle}>Purchase Shield Active</Text>
            <Text style={styles.protectionSub}>Your order is protected by TOLA's buyer protection.</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <Pressable
            style={styles.primaryAction}
            onPress={() => router.push({ pathname: '/(guest)/track/status', params: { id: orderId } })}
          >
            <FontAwesome name="search" size={16} color="#fff" />
            <Text style={styles.primaryActionText}>Track Order</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryAction}
            onPress={() => router.replace('/(tabs)/shop')}
          >
            <Text style={styles.secondaryActionText}>Continue Shopping</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: Theme.textMuted },
  // Hero
  heroBanner: { backgroundColor: Theme.primary, paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center', gap: 16 },
  heroIcon: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  heroTitleDim: { opacity: 0.8 },
  heroSub: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 22, maxWidth: 300 },
  // Body
  body: { paddingHorizontal: gap.md, paddingTop: 20, gap: 16 },
  // Status banners
  statusBannerWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16,
    backgroundColor: '#fffbeb', borderRadius: Theme.radiusMd, borderWidth: 1, borderColor: '#fde68a',
  },
  statusBannerSuccess: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16,
    backgroundColor: '#f0fdf4', borderRadius: Theme.radiusMd, borderWidth: 1, borderColor: '#bbf7d0',
  },
  statusBannerError: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16,
    backgroundColor: '#fef2f2', borderRadius: Theme.radiusMd, borderWidth: 1, borderColor: '#fecaca',
  },
  statusBannerTitle: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  statusBannerSub: { fontSize: 11, color: '#a16207', marginTop: 2, lineHeight: 16 },
  // Control number
  controlNumberCard: {
    backgroundColor: Theme.primary + '08', borderRadius: Theme.radiusLg,
    borderWidth: 2, borderColor: Theme.primary + '20', borderStyle: 'dashed',
    padding: 20, gap: 12,
  },
  controlNumberHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  controlNumberTitle: { fontSize: 14, fontWeight: '800', color: Theme.text },
  controlNumberLabel: { fontSize: 9, fontWeight: '800', color: Theme.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  controlNumberValue: { fontSize: 28, fontWeight: '900', color: Theme.primary, letterSpacing: 2 },
  controlInstructions: {
    backgroundColor: '#fff', borderRadius: Theme.radiusMd, padding: 14,
    borderWidth: 1, borderColor: Theme.inputBorder, gap: 4,
  },
  controlInstructionsTitle: { fontSize: 10, fontWeight: '700', color: Theme.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  controlInstructionsItem: { fontSize: 12, color: Theme.textSecondary, lineHeight: 18 },
  // Tracking
  trackingCard: {
    backgroundColor: Theme.background, borderRadius: Theme.radiusLg, padding: 20,
    ...Theme.shadowMd,
  },
  trackingSectionTitle: { fontSize: 10, fontWeight: '800', color: Theme.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center', marginBottom: 20 },
  trackingSteps: { gap: 0 },
  trackingStep: { flexDirection: 'row', minHeight: 48 },
  trackingDotCol: { width: 24, alignItems: 'center' },
  trackingDot: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: Theme.inputBorder,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
  trackingDotDone: { backgroundColor: Theme.success },
  trackingDotCurrent: { backgroundColor: Theme.primary },
  trackingDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  trackingLine: { width: 2, flex: 1, backgroundColor: Theme.inputBorder, marginVertical: -2 },
  trackingLineDone: { backgroundColor: Theme.success },
  trackingTextCol: { flex: 1, paddingLeft: 12, paddingBottom: 12 },
  trackingLabel: { fontSize: 13, fontWeight: '700', color: Theme.textMuted },
  trackingLabelDone: { color: Theme.text },
  trackingLabelCurrent: { color: Theme.primary },
  trackingSubtext: { fontSize: 11, color: Theme.textMuted, marginTop: 2 },
  // Info card
  infoCard: {
    backgroundColor: Theme.background, borderRadius: Theme.radiusLg, padding: 18,
    gap: 14, ...Theme.shadowSm,
  },
  infoSectionTitle: { fontSize: 10, fontWeight: '800', color: Theme.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  infoRow: { gap: 2 },
  infoLabel: { fontSize: 9, fontWeight: '700', color: Theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 15, fontWeight: '800', color: Theme.text },
  infoValueBold: { fontSize: 18, fontWeight: '900', color: Theme.text },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  addressText: { flex: 1, fontSize: 14, fontWeight: '600', color: Theme.text, lineHeight: 20 },
  // Protection
  protectionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18,
    backgroundColor: Theme.text, borderRadius: Theme.radiusLg,
  },
  protectionIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  protectionTitle: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 },
  protectionSub: { fontSize: 13, fontWeight: '700', color: '#fff', lineHeight: 18, marginTop: 2 },
  // Actions
  actionsRow: { gap: 10 },
  primaryAction: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Theme.primary, paddingVertical: 16, borderRadius: Theme.radiusMd,
    ...Theme.shadowMd,
  },
  primaryActionText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  secondaryAction: {
    alignItems: 'center', paddingVertical: 14, borderRadius: Theme.radiusMd,
    borderWidth: 2, borderColor: Theme.inputBorder, backgroundColor: Theme.background,
  },
  secondaryActionText: { fontSize: 15, fontWeight: '700', color: Theme.text },
  // Card payment
  cardPaymentDesc: { fontSize: 12, color: Theme.textMuted, lineHeight: 18 },
  cardPaymentBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Theme.primary, paddingVertical: 16, borderRadius: Theme.radiusMd,
    ...Theme.shadowMd,
  },
  cardPaymentBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
