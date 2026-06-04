import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';
import { apiGet, apiPost } from '@/src/services/api';
import { PaymentMethodPicker } from '@/src/components/checkout/PaymentMethodPicker';

interface Props { vendorId: string; accessToken: string; }

export function VendorSubscriptionTab({ vendorId, accessToken }: Props) {
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Upgrade modal
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('airtel-money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });
  const [upgrading, setUpgrading] = useState(false);
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const [controlNumber, setControlNumber] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { loadData(); return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, [vendorId]);

  const loadData = async () => {
    try {
      const [vendorRes, plansRes] = await Promise.all([
        apiGet<any>(`/vendors/${vendorId}/subscription`, accessToken),
        apiGet<any>('/subscriptions/plans', accessToken),
      ]);
      setCurrentSub(vendorRes?.vendor?.current_subscription || null);
      setPlans(plansRes?.plans || []);
    } catch (e) { console.error('Sub load error', e); }
    setLoading(false);
  };

  const pollStatus = (subId: string) => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await apiGet<any>(`/subscriptions/status/${subId}?type=vendor`, accessToken);
        const st = res?.data?.status;
        if (st === 'active') {
          clearInterval(pollRef.current!);
          setAwaitingPayment(false); setShowModal(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Activated!', `You are now on the ${selectedPlan?.name} plan!`);
          loadData();
        } else if (st === 'rejected' || st === 'failed') {
          clearInterval(pollRef.current!);
          setAwaitingPayment(false);
          Alert.alert('Failed', res?.data?.click_pesa_error || 'Transaction unsuccessful.');
        }
      } catch {}
      if (attempts >= 40) { clearInterval(pollRef.current!); setAwaitingPayment(false); Alert.alert('Timeout', 'No confirmation yet. Check status later.'); }
    }, 3000);
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) return;
    setUpgrading(true);
    setAwaitingPayment(true);
    setStatusMsg('Initiating payment...');
    try {
      const isMobile = ['airtel-money', 'mixx-by-yas', 'halopesa', 'ezypesa', 'm-pesa', 'tigo-pesa'].includes(paymentMethod);
      const isCard = ['visa', 'mastercard', 'unionpay'].includes(paymentMethod);
      const res = await apiPost<any>('/subscriptions', {
        planId: selectedPlan.id, vendorId, paymentMethod,
        paymentDetails: {
          phoneNumber: isMobile ? phoneNumber : undefined,
          cardNumber: isCard ? cardDetails.number : undefined,
          expiryDate: isCard ? cardDetails.expiry : undefined,
          cvv: isCard ? cardDetails.cvv : undefined,
        },
      }, accessToken);

      if (res.success) {
        if (res.controlNumber) {
          setControlNumber(res.controlNumber);
          setStatusMsg('Control number generated. Complete the bank transfer.');
        } else {
          setStatusMsg('Please confirm on your device. Auto-checking...');
        }
        pollStatus(res.subscription?.id);
      } else {
        throw new Error(res.message || 'Payment initiation failed');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to initiate payment');
      setAwaitingPayment(false);
    }
    setUpgrading(false);
  };

  const getPlanColor = (name: string) => {
    switch (name.toLowerCase()) {
      case 'free': return { bg: Theme.backgroundSecondary, text: Theme.text };
      case 'basic': return { bg: '#dbeafe', text: '#1e40af' };
      case 'premium': return { bg: '#f3e8ff', text: '#7c3aed' };
      case 'pro': return { bg: '#fef3c7', text: '#b45309' };
      default: return { bg: Theme.backgroundSecondary, text: Theme.text };
    }
  };

  const getPlanIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'free': return 'flash';
      case 'basic': return 'check';
      case 'premium': return 'star';
      case 'pro': return 'trophy';
      default: return 'bookmark';
    }
  };

  if (loading) return <View style={st.center}><ActivityIndicator color={Theme.primary} /></View>;

  return (
    <ScrollView style={st.container} contentContainerStyle={st.content}>
      {/* Payment Processing Modal */}
      <Modal visible={awaitingPayment} transparent animationType="fade">
        <View style={st.overlayBg}>
          <View style={st.overlayCard}>
            <View style={st.overlayHeader}>
              {controlNumber ? <FontAwesome name="university" size={28} color="#fff" /> : <ActivityIndicator size="large" color="#fff" />}
              <Text style={st.overlayTitle}>{controlNumber ? 'Bank Settlement' : 'Confirming Payment'}</Text>
            </View>
            <View style={st.overlayBody}>
              <Text style={st.overlayText}>{statusMsg}</Text>
              {controlNumber ? (
                <View style={st.controlCard}>
                  <Text style={st.controlLabel}>Control Number</Text>
                  <Text style={st.controlValue}>{controlNumber}</Text>
                  <View style={st.controlInstr}>
                    <Text style={st.controlInstrTitle}>Instructions</Text>
                    <Text style={st.controlInstrItem}>• Dial *150*03# (CRDB SimBanking)</Text>
                    <Text style={st.controlInstrItem}>• Select 'Bill Payment'</Text>
                    <Text style={st.controlInstrItem}>• Enter the Control Number</Text>
                    <Text style={st.controlInstrItem}>• Follow prompts to complete</Text>
                  </View>
                  <Pressable style={st.doneBtn} onPress={() => { setAwaitingPayment(false); setShowModal(false); loadData(); }}>
                    <Text style={st.doneBtnText}>I have completed payment</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={st.secureBadge}>
                  <FontAwesome name="shield" size={14} color={Theme.success} />
                  <Text style={st.secureText}>Encrypted secure transaction</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Current Plan */}
      {currentSub && (
        <View style={[st.currentPlanCard, { backgroundColor: getPlanColor(currentSub.plan?.name).bg }]}>
          <View style={st.currentPlanRow}>
            <View style={st.currentPlanIcon}><FontAwesome name={getPlanIcon(currentSub.plan?.name) as any} size={20} color={getPlanColor(currentSub.plan?.name).text} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[st.currentPlanName, { color: getPlanColor(currentSub.plan?.name).text }]}>Current: {currentSub.plan?.name}</Text>
              <Text style={st.currentPlanPrice}>
                {currentSub.plan?.price === 0 ? 'Free forever' : `TSh ${currentSub.plan?.price?.toLocaleString()}/month`}
              </Text>
            </View>
            {currentSub.plan?.has_verification_badge && (
              <View style={st.verifiedBadge}><FontAwesome name="check" size={10} color={Theme.success} /><Text style={st.verifiedText}>Verified</Text></View>
            )}
          </View>
          {currentSub.expires_at && <Text style={st.expiry}>Expires: {new Date(currentSub.expires_at).toLocaleDateString()}</Text>}
        </View>
      )}

      {/* Available Plans */}
      <Text style={st.sectionTitle}>Available Plans</Text>
      {plans.map(plan => {
        const features = plan.features || {};
        const isCurrent = currentSub?.plan?.id === plan.id;
        const color = getPlanColor(plan.name);
        return (
          <View key={plan.id} style={[st.planCard, isCurrent && { borderColor: Theme.primary, borderWidth: 2 }]}>
            {isCurrent && <View style={st.currentBadge}><Text style={st.currentBadgeText}>Current</Text></View>}
            <View style={st.planHeader}>
              <FontAwesome name={getPlanIcon(plan.name) as any} size={18} color={color.text} />
              <Text style={st.planName}>{plan.name}</Text>
            </View>
            <Text style={st.planPrice}>
              {plan.price === 0 ? 'Free' : <>TSh {plan.price?.toLocaleString()}<Text style={st.planPriceSub}>/month</Text></>}
            </Text>
            <Text style={st.planDesc}>{features.description}</Text>
            <View style={st.featuresList}>
              <FeatureItem text={plan.product_limit ? `Up to ${plan.product_limit} products` : 'Unlimited products'} />
              {plan.has_verification_badge && <FeatureItem text="Verification badge" />}
              {plan.has_analytics && <FeatureItem text={`${plan.analytics_level} analytics`} />}
              {plan.has_promotions && <FeatureItem text="Promotions & discounts" />}
              {plan.has_consultation && <FeatureItem text="Business consultation" />}
              <FeatureItem text={`${plan.support_level} support`} />
            </View>
            {!isCurrent && plan.price > 0 && (
              <Pressable style={st.upgradeBtn} onPress={() => { setSelectedPlan(plan); setShowModal(true); setControlNumber(''); }}>
                <Text style={st.upgradeBtnText}>Upgrade to {plan.name}</Text>
                <FontAwesome name="arrow-right" size={14} color="#fff" />
              </Pressable>
            )}
          </View>
        );
      })}

      {/* Upgrade Payment Modal */}
      <Modal visible={showModal && !awaitingPayment} transparent animationType="slide">
        <View style={st.modalBg}>
          <View style={st.modalCard}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Upgrade to {selectedPlan?.name}</Text>
              <Text style={st.modalSub}>Choose your payment method</Text>
            </View>
            <ScrollView style={st.modalBody} contentContainerStyle={{ gap: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              <View style={st.modalPlanBox}>
                <Text style={st.modalPlanName}>{selectedPlan?.name} Plan</Text>
                <Text style={st.modalPlanPrice}>TSh {selectedPlan?.price?.toLocaleString()}</Text>
                <Text style={st.modalPlanBilling}>Billed monthly</Text>
              </View>

              <PaymentMethodPicker
                paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
                phoneNumber={phoneNumber} setPhoneNumber={setPhoneNumber}
                cardDetails={cardDetails} setCardDetails={setCardDetails}
              />
            </ScrollView>
            <View style={st.modalFooter}>
              <Pressable style={[st.payBtn, upgrading && { opacity: 0.5 }]} onPress={handleUpgrade} disabled={upgrading}>
                {upgrading ? <ActivityIndicator color="#fff" /> : <Text style={st.payBtnText}>Pay TSh {selectedPlan?.price?.toLocaleString()}</Text>}
              </Pressable>
              <Pressable style={st.cancelBtn} onPress={() => setShowModal(false)} disabled={upgrading}>
                <Text style={st.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={st.featureRow}>
      <FontAwesome name="check" size={12} color={Theme.success} />
      <Text style={st.featureText}>{text}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Current plan
  currentPlanCard: { borderRadius: Theme.radiusLg, padding: 18, gap: 10 },
  currentPlanRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  currentPlanIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  currentPlanName: { fontSize: 16, fontWeight: '800' },
  currentPlanPrice: { fontSize: 12, color: Theme.textSecondary },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  verifiedText: { fontSize: 10, fontWeight: '700', color: Theme.success },
  expiry: { fontSize: 11, color: Theme.textSecondary },
  // Plans
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Theme.text },
  planCard: { backgroundColor: Theme.background, borderRadius: Theme.radiusLg, padding: 18, gap: 10, borderWidth: 1, borderColor: Theme.inputBorder, ...Theme.shadowSm },
  currentBadge: { position: 'absolute', top: -10, alignSelf: 'center', backgroundColor: Theme.primary, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 10 },
  currentBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planName: { fontSize: 16, fontWeight: '700', color: Theme.text },
  planPrice: { fontSize: 26, fontWeight: '900', color: Theme.text },
  planPriceSub: { fontSize: 13, fontWeight: '400', color: Theme.textSecondary },
  planDesc: { fontSize: 12, color: Theme.textSecondary, lineHeight: 18 },
  featuresList: { gap: 6, marginTop: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 13, color: Theme.text },
  upgradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Theme.primary, paddingVertical: 14, borderRadius: Theme.radiusMd, marginTop: 6 },
  upgradeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { backgroundColor: Theme.primary, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  modalSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  modalBody: { padding: 16, maxHeight: 400 },
  modalPlanBox: { backgroundColor: Theme.backgroundSecondary, borderRadius: Theme.radiusMd, padding: 16, alignItems: 'center' },
  modalPlanName: { fontSize: 14, fontWeight: '700', color: Theme.text },
  modalPlanPrice: { fontSize: 24, fontWeight: '900', color: Theme.primary },
  modalPlanBilling: { fontSize: 9, fontWeight: '700', color: Theme.textMuted, textTransform: 'uppercase' },
  field: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', color: Theme.textSecondary, textTransform: 'uppercase' },
  input: { height: 48, backgroundColor: Theme.inputBg, borderRadius: Theme.radiusMd, borderWidth: 1, borderColor: Theme.inputBorder, paddingHorizontal: 14, fontSize: 15, color: Theme.text },
  modalFooter: { padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: Theme.inputBorder },
  payBtn: { backgroundColor: Theme.primary, paddingVertical: 16, borderRadius: Theme.radiusMd, alignItems: 'center' },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cancelBtn: { borderWidth: 2, borderColor: Theme.inputBorder, paddingVertical: 12, borderRadius: Theme.radiusMd, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: Theme.textSecondary },
  // Overlay
  overlayBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  overlayCard: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', width: '100%', maxWidth: 360 },
  overlayHeader: { backgroundColor: Theme.primary, padding: 32, alignItems: 'center', gap: 16 },
  overlayTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  overlayBody: { padding: 24, gap: 16, alignItems: 'center' },
  overlayText: { fontSize: 14, color: Theme.textSecondary, textAlign: 'center', lineHeight: 22 },
  controlCard: { width: '100%', gap: 12 },
  controlLabel: { fontSize: 9, fontWeight: '800', color: Theme.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  controlValue: { fontSize: 28, fontWeight: '900', color: Theme.primary, letterSpacing: 2, textAlign: 'center' },
  controlInstr: { backgroundColor: Theme.backgroundSecondary, borderRadius: Theme.radiusMd, padding: 14, gap: 4 },
  controlInstrTitle: { fontSize: 10, fontWeight: '700', color: Theme.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  controlInstrItem: { fontSize: 12, color: Theme.textSecondary, lineHeight: 18 },
  doneBtn: { backgroundColor: Theme.text, paddingVertical: 14, borderRadius: Theme.radiusMd, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Theme.backgroundSecondary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Theme.radiusMd },
  secureText: { fontSize: 11, fontWeight: '700', color: Theme.textSecondary, textTransform: 'uppercase' },
});
