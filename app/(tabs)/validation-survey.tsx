import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';
import { apiPost } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const RESPONDENT_TYPES = ['Consumer', 'Producer', 'Manufacturer', 'Supplier', 'Wholesaler', 'Retail Trader', 'Transporter', 'Other'];
const CHALLENGE_OPTIONS = ['Trust', 'Product Availability', 'Supplier Discovery', 'Logistics', 'Payment Security', 'Information Gap', 'Other'];
const CHANNEL_OPTIONS = ['WhatsApp', 'Facebook', 'Phone Calls', 'Referral', 'Physical Market', 'Other'];
const TIME_OPTIONS = ['Less than 1 hour', '1–3 hours', '3–6 hours', '6–12 hours', 'More than 12 hours', 'Multiple days'];
const FREQUENCY_OPTIONS = ['Daily', 'Several times a week', 'Weekly', 'Monthly', 'Rarely', 'Never'];
const PAYMENT_OPTIONS = ['< TZS 1,000', 'TZS 1,000–5,000', 'TZS 5,000–10,000', 'TZS 10,000–25,000', 'TZS 25,000–50,000', '> TZS 50,000'];
const REGIONS = [
  'Arusha','Dar es Salaam','Dodoma','Geita','Iringa','Kagera','Katavi','Kigoma',
  'Kilimanjaro','Lindi','Manyara','Mara','Mbeya','Morogoro','Mtwara','Mwanza',
  'Njombe','Pemba Kaskazini','Pemba Kusini','Pwani','Rukwa','Ruvuma','Shinyanga',
  'Simiyu','Singida','Songwe','Tabora','Tanga','Unguja Kaskazini','Unguja Kusini','Unguja Mjini Magharibi',
];

type FormData = {
  full_name: string; phone: string; email: string; region: string; district: string;
  location_ward: string; respondent_type: string; q1_challenges: string;
  q2_biggest_challenge: string; q3_impact_rating: number; q4_time_searching: string;
  q5_lost_money: string; q6_channels: string[]; q7_satisfaction_rating: number;
  q8_platform_value_rating: number; q9_escrow_importance: number;
  q10_buyer_protection_importance: number; q11_otp_reduces_disputes: string;
  q12_nearby_suppliers_frequency: string; q13_willing_to_pay: string;
  q14_payment_amount: string; q15_choice_and_reason: string;
};

const initial: FormData = {
  full_name: '', phone: '', email: '', region: '', district: '', location_ward: '',
  respondent_type: '', q1_challenges: '', q2_biggest_challenge: '', q3_impact_rating: 5,
  q4_time_searching: '', q5_lost_money: '', q6_channels: [], q7_satisfaction_rating: 5,
  q8_platform_value_rating: 5, q9_escrow_importance: 5, q10_buyer_protection_importance: 5,
  q11_otp_reduces_disputes: '', q12_nearby_suppliers_frequency: '', q13_willing_to_pay: '',
  q14_payment_amount: '', q15_choice_and_reason: '',
};

function PillSelect({ options, value, onSelect, multi }: { options: string[]; value: string | string[]; onSelect: (v: string) => void; multi?: boolean }) {
  return (
    <View style={s.pillRow}>
      {options.map(o => {
        const active = multi ? (value as string[]).includes(o) : value === o;
        return (
          <Pressable key={o} style={[s.pill, active && s.pillActive]} onPress={() => onSelect(o)}>
            <Text style={[s.pillText, active && s.pillTextActive]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={s.ratingContainer}>
      <Text style={s.questionLabel}>{label}</Text>
      <View style={s.ratingRow}>
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <Pressable key={n} style={[s.ratingDot, n <= value && s.ratingDotActive]} onPress={() => onChange(n)}>
            <Text style={[s.ratingDotText, n <= value && s.ratingDotTextActive]}>{n}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function ValidationSurveyScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    ...initial,
    full_name: (session?.user?.full_name as string) || '',
    phone: (session?.user?.phone as string) || '',
    email: session?.user?.email || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (k: keyof FormData, v: any) => setForm(p => ({ ...p, [k]: v }));
  const toggleCh = (c: string) => set('q6_channels', form.q6_channels.includes(c) ? form.q6_channels.filter(x => x !== c) : [...form.q6_channels, c]);

  const validateStep0 = () => {
    if (!form.full_name.trim() || !form.phone.trim() || !form.email.trim() || !form.region || !form.district.trim() || !form.location_ward.trim() || !form.respondent_type) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return false;
    }
    return true;
  };

  const validateStep1 = () => {
    if (!form.q1_challenges || !form.q2_biggest_challenge || !form.q4_time_searching || !form.q5_lost_money || form.q6_channels.length === 0 || !form.q11_otp_reduces_disputes || !form.q12_nearby_suppliers_frequency || !form.q13_willing_to_pay || !form.q14_payment_amount || !form.q15_choice_and_reason.trim()) {
      Alert.alert('Missing Fields', 'Please answer all questions.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep1()) return;
    setSubmitting(true);
    try {
      await apiPost('/validation-survey', form);
      setSubmitted(true); setStep(2);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit survey.');
    }
    setSubmitting(false);
  };

  // Thank you screen
  if (step === 2) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.thankYou}>
          <View style={s.checkCircle}><FontAwesome name="check" size={36} color="#fff" /></View>
          <Text style={s.thankTitle}>Thank You!</Text>
          <Text style={s.thankText}>Thank you for participating in the TOLA Market Validation Survey. Your feedback helps us build a trusted Digital Trade & Supply Chain Ecosystem for Africa.</Text>
          <Pressable style={s.primaryBtn} onPress={() => router.back()}>
            <Text style={s.primaryBtnText}>Back to Profile</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.container} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 100 + insets.bottom, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => step === 0 ? router.back() : setStep(0)} style={s.backBtn}>
            <FontAwesome name="arrow-left" size={16} color={Theme.text} />
          </Pressable>
          <Text style={s.headerTitle}>Market Validation Survey</Text>
        </View>

        {/* Progress */}
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: step === 0 ? '50%' : '100%' }]} />
        </View>
        <Text style={s.stepLabel}>Step {step + 1} of 2 — {step === 0 ? 'Your Information' : 'Survey Questions'}</Text>

        {/* Step 0: Respondent Info */}
        {step === 0 && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Respondent Information</Text>
            <Text style={s.label}>Full Name *</Text>
            <TextInput style={s.input} value={form.full_name} onChangeText={t => set('full_name', t)} placeholder="John Doe" />
            <Text style={s.label}>Phone Number *</Text>
            <TextInput style={s.input} value={form.phone} onChangeText={t => set('phone', t)} placeholder="+255 7XX" keyboardType="phone-pad" />
            <Text style={s.label}>Email Address *</Text>
            <TextInput style={s.input} value={form.email} onChangeText={t => set('email', t)} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
            <Text style={s.label}>Region *</Text>
            <PillSelect options={REGIONS} value={form.region} onSelect={v => set('region', v)} />
            <Text style={s.label}>District *</Text>
            <TextInput style={s.input} value={form.district} onChangeText={t => set('district', t)} placeholder="e.g. Ilala" />
            <Text style={s.label}>Location / Ward *</Text>
            <TextInput style={s.input} value={form.location_ward} onChangeText={t => set('location_ward', t)} placeholder="e.g. Kariakoo" />
            <Text style={s.label}>Respondent Type *</Text>
            <PillSelect options={RESPONDENT_TYPES} value={form.respondent_type} onSelect={v => set('respondent_type', v)} />
            <Pressable style={s.primaryBtn} onPress={() => validateStep0() && setStep(1)}>
              <Text style={s.primaryBtnText}>Continue</Text>
              <FontAwesome name="arrow-right" size={14} color="#fff" />
            </Pressable>
          </View>
        )}

        {/* Step 1: Questionnaire */}
        {step === 1 && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Validation Questionnaire</Text>

            <Text style={s.questionLabel}>1. Have you experienced challenges finding products, suppliers, customers or transporters in the last 12 months?</Text>
            <PillSelect options={['Yes', 'No']} value={form.q1_challenges} onSelect={v => set('q1_challenges', v)} />

            <Text style={s.questionLabel}>2. What was the biggest challenge?</Text>
            <PillSelect options={CHALLENGE_OPTIONS} value={form.q2_biggest_challenge} onSelect={v => set('q2_biggest_challenge', v)} />

            <RatingRow label="3. Rate the impact of that challenge (1–10)" value={form.q3_impact_rating} onChange={v => set('q3_impact_rating', v)} />

            <Text style={s.questionLabel}>4. Time spent searching for products/suppliers/transporters?</Text>
            <PillSelect options={TIME_OPTIONS} value={form.q4_time_searching} onSelect={v => set('q4_time_searching', v)} />

            <Text style={s.questionLabel}>5. Have you lost money due to fraud, non-delivery, wrong product or delayed payment?</Text>
            <PillSelect options={['Yes', 'No']} value={form.q5_lost_money} onSelect={v => set('q5_lost_money', v)} />

            <Text style={s.questionLabel}>6. Which channels do you currently use? (Select all)</Text>
            <PillSelect options={CHANNEL_OPTIONS} value={form.q6_channels} onSelect={toggleCh} multi />

            <RatingRow label="7. Satisfaction with current method (1–10)" value={form.q7_satisfaction_rating} onChange={v => set('q7_satisfaction_rating', v)} />
            <RatingRow label="8. Value of a platform connecting Buyers, Vendors & Transporters (1–10)" value={form.q8_platform_value_rating} onChange={v => set('q8_platform_value_rating', v)} />
            <RatingRow label="9. Importance of TOLA Escrow Payment Protection (1–10)" value={form.q9_escrow_importance} onChange={v => set('q9_escrow_importance', v)} />
            <RatingRow label="10. Importance of TOLA Buyer Protection & Dispute Resolution (1–10)" value={form.q10_buyer_protection_importance} onChange={v => set('q10_buyer_protection_importance', v)} />

            <Text style={s.questionLabel}>11. Can OTP Delivery Confirmation reduce payment disputes?</Text>
            <PillSelect options={['Yes', 'No', 'Not Sure']} value={form.q11_otp_reduces_disputes} onSelect={v => set('q11_otp_reduces_disputes', v)} />

            <Text style={s.questionLabel}>12. If TOLA showed nearby suppliers first, how often would you use it?</Text>
            <PillSelect options={FREQUENCY_OPTIONS} value={form.q12_nearby_suppliers_frequency} onSelect={v => set('q12_nearby_suppliers_frequency', v)} />

            <Text style={s.questionLabel}>13. Are you willing to pay for a secure trade and logistics service?</Text>
            <PillSelect options={['Yes', 'No', 'Maybe']} value={form.q13_willing_to_pay} onSelect={v => set('q13_willing_to_pay', v)} />

            <Text style={s.questionLabel}>14. How much would you pay for Escrow, Tracking and Buyer Protection?</Text>
            <PillSelect options={PAYMENT_OPTIONS} value={form.q14_payment_amount} onSelect={v => set('q14_payment_amount', v)} />

            <Text style={s.questionLabel}>15. If you had to choose between your current method and TOLA, which would you choose and why?</Text>
            <TextInput style={[s.input, { height: 100, textAlignVertical: 'top' }]} value={form.q15_choice_and_reason} onChangeText={t => set('q15_choice_and_reason', t)} placeholder="Share your thoughts..." multiline />

            <View style={s.btnRow}>
              <Pressable style={s.secondaryBtn} onPress={() => setStep(0)}>
                <FontAwesome name="arrow-left" size={14} color={Theme.text} />
                <Text style={s.secondaryBtnText}>Back</Text>
              </Pressable>
              <Pressable style={[s.primaryBtn, { flex: 1 }, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <><Text style={s.primaryBtnText}>Submit Survey</Text></>}
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Theme.text },
  progressBar: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 3 },
  stepLabel: { fontSize: 12, fontWeight: '600', color: Theme.textMuted, marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', padding: 20, gap: 14, ...Theme.shadowSm },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Theme.text, marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '700', color: Theme.textSecondary },
  input: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, fontSize: 15, color: Theme.text, borderWidth: 1, borderColor: '#e2e8f0' },
  questionLabel: { fontSize: 14, fontWeight: '600', color: Theme.text, lineHeight: 20 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  pillActive: { borderColor: '#10b981', backgroundColor: '#10b981' + '15' },
  pillText: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  pillTextActive: { color: '#10b981' },
  ratingContainer: { gap: 8 },
  ratingRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  ratingDot: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  ratingDotActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  ratingDotText: { fontSize: 12, fontWeight: '700', color: Theme.textMuted },
  ratingDotTextActive: { color: '#fff' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 12, marginTop: 4 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12 },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: Theme.textSecondary },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  thankYou: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  checkCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  thankTitle: { fontSize: 28, fontWeight: '800', color: Theme.text },
  thankText: { fontSize: 15, color: Theme.textMuted, textAlign: 'center', lineHeight: 22 },
});
