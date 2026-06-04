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

interface Props { transporterId: string; accessToken: string; }

export function TransporterSubscriptionTab({ transporterId, accessToken }: Props) {
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { loadData(); return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, [transporterId]);

  const loadData = async () => {
    try {
      const [plansRes, transRes] = await Promise.all([
        apiGet<any>('/subscriptions/plans?type=transporter', accessToken),
        apiGet<any>('/transporters/me', accessToken),
      ]);
      setPlans(plansRes?.plans || []);
      setCurrentSub(transRes?.transporter?.current_subscription || null);
    } catch (e) { console.error('Sub load error', e); }
    setLoading(false);
  };

  const pollStatus = (subId: string) => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await apiGet<any>(`/subscriptions/status/${subId}?type=transporter`, accessToken);
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
      if (attempts >= 40) { clearInterval(pollRef.current!); setAwaitingPayment(false); Alert.alert('Timeout', 'Check status later.'); }
    }, 3000);
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) return;
    setUpgrading(true); setAwaitingPayment(true); setStatusMsg('Initiating payment...');
    try {
      const isMobile = ['airtel-money', 'mixx-by-yas', 'halopesa', 'ezypesa', 'm-pesa', 'tigo-pesa'].includes(paymentMethod);
      const isCard = ['visa', 'mastercard', 'unionpay'].includes(paymentMethod);
      const res = await apiPost<any>('/subscriptions/transporters', {
        planId: selectedPlan.id, transporterId, paymentMethod,
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
        } else { setStatusMsg('Please confirm on your device. Auto-checking...'); }
        pollStatus(res.subscription?.id);
      } else { throw new Error(res.message || 'Payment failed'); }
    } catch (e: any) { Alert.alert('Error', e.message || 'Payment failed'); setAwaitingPayment(false); }
    setUpgrading(false);
  };

  const getPlanIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'free': return 'truck'; case 'basic': return 'flash';
      case 'pro': return 'star'; case 'elite': return 'trophy';
      default: return 'bookmark';
    }
  };
  const getPlanColor = (name: string) => {
    switch (name.toLowerCase()) {
      case 'free': return { bg: Theme.backgroundSecondary, text: Theme.text };
      case 'basic': return { bg: '#dbeafe', text: '#1e40af' };
      case 'pro': return { bg: '#f3e8ff', text: '#7c3aed' };
      case 'elite': return { bg: '#fef3c7', text: '#b45309' };
      default: return { bg: Theme.backgroundSecondary, text: Theme.text };
    }
  };

  const getPlanFeatures = (plan: any) => {
    const n = plan.name?.toLowerCase();
    return [
      { icon: 'truck', text: n === 'free' ? '1 Active Delivery' : n === 'elite' ? 'Unlimited Deliveries' : 'Multi-Delivery (3 Active)' },
      { icon: 'users', text: n === 'free' ? 'Normal Priority' : n === 'elite' ? 'Immediate Pickup' : 'High Job Priority' },
      { icon: 'percent', text: n === 'free' ? '7.5% Service Fee' : '4% Service Fee' },
      ...(plan.has_verification_badge ? [{ icon: 'shield', text: 'Verified Elite Badge' }] : []),
    ];
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={Theme.primary} /></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Payment Overlay */}
      <Modal visible={awaitingPayment} transparent animationType="fade">
        <View style={s.overlayBg}>
          <View style={s.overlayCard}>
            <View style={s.overlayHeader}>
              {controlNumber ? <FontAwesome name="university" size={28} color="#fff" /> : <ActivityIndicator size="large" color="#fff" />}
              <Text style={s.overlayTitle}>{controlNumber ? 'Bank Settlement' : 'Confirming Payment'}</Text>
            </View>
            <View style={s.overlayBody}>
              <Text style={s.overlayText}>{statusMsg}</Text>
              {controlNumber ? (
                <View style={s.controlCard}>
                  <Text style={s.controlLabel}>Control Number</Text>
                  <Text style={s.controlValue}>{controlNumber}</Text>
                  <View style={s.controlInstr}>
                    <Text style={s.controlInstrItem}>• Dial *150*03# (CRDB SimBanking)</Text>
                    <Text style={s.controlInstrItem}>• Select 'Bill Payment'</Text>
                    <Text style={s.controlInstrItem}>• Enter the Control Number</Text>
                  </View>
                  <Pressable style={s.doneBtn} onPress={() => { setAwaitingPayment(false); setShowModal(false); loadData(); }}>
                    <Text style={s.doneBtnText}>I have completed payment</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={s.secureBadge}><FontAwesome name="shield" size={14} color={Theme.success} /><Text style={s.secureText}>Encrypted secure transaction</Text></View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Current Plan */}
      {currentSub && (
        <View style={[s.currentCard, { backgroundColor: getPlanColor(currentSub.plan?.name).bg }]}>
          <View style={s.currentRow}>
            <View style={s.currentIcon}><FontAwesome name={getPlanIcon(currentSub.plan?.name) as any} size={20} color={getPlanColor(currentSub.plan?.name).text} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[s.currentName, { color: getPlanColor(currentSub.plan?.name).text }]}>Active: {currentSub.plan?.name}</Text>
              <Text style={s.currentPrice}>{currentSub.plan?.price === 0 ? 'Free Access' : `TSh ${currentSub.plan?.price?.toLocaleString()}/month`}</Text>
            </View>
            <View style={s.activeBadge}><Text style={s.activeBadgeText}>Active</Text></View>
          </View>
        </View>
      )}

      {/* Plans */}
      {plans.map(plan => {
        const isCurrent = currentSub?.plan?.id === plan.id;
        const color = getPlanColor(plan.name);
        const features = getPlanFeatures(plan);
        return (
          <View key={plan.id} style={[s.planCard, isCurrent && { borderColor: Theme.primary, borderWidth: 2 }]}>
            {isCurrent && <View style={s.currentBadge}><Text style={s.currentBadgeText}>Current</Text></View>}
            <View style={s.planHeader}>
              <FontAwesome name={getPlanIcon(plan.name) as any} size={18} color={color.text} />
              <Text style={s.planName}>{plan.name}</Text>
            </View>
            <Text style={s.planPrice}>{plan.price?.toLocaleString()} <Text style={s.planPriceSub}>TZS/mo</Text></Text>
            <View style={s.featuresList}>
              {features.map((f, i) => (
                <View key={i} style={s.featureRow}>
                  <FontAwesome name={f.icon as any} size={13} color={Theme.primary} />
                  <Text style={s.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>
            {!isCurrent && plan.price > 0 && (
              <Pressable style={s.upgradeBtn} onPress={() => { setSelectedPlan(plan); setShowModal(true); setControlNumber(''); }}>
                <Text style={s.upgradeBtnText}>Upgrade to {plan.name}</Text>
                <FontAwesome name="arrow-right" size={14} color="#fff" />
              </Pressable>
            )}
          </View>
        );
      })}

      {/* Upgrade Modal */}
      <Modal visible={showModal && !awaitingPayment} transparent animationType="slide">
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Upgrade Account</Text>
              <Text style={s.modalSub}>Elevate your earnings and priority status</Text>
            </View>
            <ScrollView style={s.modalBody} contentContainerStyle={{ gap: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              <View style={s.modalPlanBox}>
                <Text style={s.modalPlanName}>{selectedPlan?.name} Member</Text>
                <Text style={s.modalPlanPrice}>TSh {selectedPlan?.price?.toLocaleString()}</Text>
                <Text style={s.modalPlanBilling}>Billed monthly</Text>
              </View>
              <PaymentMethodPicker paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} phoneNumber={phoneNumber} setPhoneNumber={setPhoneNumber} cardDetails={cardDetails} setCardDetails={setCardDetails} />
            </ScrollView>
            <View style={s.modalFooter}>
              <Pressable style={[s.payBtn, upgrading && { opacity: 0.5 }]} onPress={handleUpgrade} disabled={upgrading}>
                {upgrading ? <ActivityIndicator color="#fff" /> : <Text style={s.payBtnText}>Pay TSh {selectedPlan?.price?.toLocaleString()}</Text>}
              </Pressable>
              <Pressable style={s.cancelBtn} onPress={() => setShowModal(false)} disabled={upgrading}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Current plan
  currentCard: { borderRadius: Theme.radiusLg, padding: 18 },
  currentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  currentIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  currentName: { fontSize: 16, fontWeight: '800' },
  currentPrice: { fontSize: 12, color: Theme.textSecondary },
  activeBadge: { backgroundColor: 'rgba(255,255,255,0.5)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  activeBadgeText: { fontSize: 11, fontWeight: '700', color: Theme.text },
  // Plans
  planCard: { backgroundColor: Theme.background, borderRadius: Theme.radiusLg, padding: 18, gap: 10, borderWidth: 1, borderColor: Theme.inputBorder, ...Theme.shadowSm },
  currentBadge: { position: 'absolute', top: -10, alignSelf: 'center', backgroundColor: Theme.primary, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 10 },
  currentBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planName: { fontSize: 18, fontWeight: '700', color: Theme.text },
  planPrice: { fontSize: 28, fontWeight: '900', color: Theme.text },
  planPriceSub: { fontSize: 12, fontWeight: '500', color: Theme.textSecondary },
  featuresList: { gap: 8, marginTop: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 13, fontWeight: '500', color: Theme.textSecondary },
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
  controlInstrItem: { fontSize: 12, color: Theme.textSecondary, lineHeight: 18 },
  doneBtn: { backgroundColor: Theme.text, paddingVertical: 14, borderRadius: Theme.radiusMd, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Theme.backgroundSecondary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Theme.radiusMd },
  secureText: { fontSize: 11, fontWeight: '700', color: Theme.textSecondary, textTransform: 'uppercase' },
});
