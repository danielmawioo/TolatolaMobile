import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';
import { apiGet, apiPost } from '@/src/services/api';

const COMMISSION_RATE = 0.035;
const PAYOUT_METHODS = [
  { id: 'airtel-money', name: 'Airtel Money' },
  { id: 'tigo-pesa', name: 'Tigo Pesa' },
  { id: 'halopesa', name: 'HaloPesa' },
  { id: 'ezypesa', name: 'EzyPesa' },
  { id: 'bank_transfer', name: 'Bank Transfer' },
];

const STATUS_ICON: Record<string, { icon: string; color: string }> = {
  pending: { icon: 'clock-o', color: '#eab308' },
  approved: { icon: 'check-circle', color: '#2563eb' },
  completed: { icon: 'check-circle', color: '#16a34a' },
  rejected: { icon: 'times-circle', color: '#ef4444' },
};

interface Props { transporterId: string; accessToken: string; availableBalance: number; }

export function TransporterWithdrawalsTab({ transporterId, accessToken, availableBalance: initialBalance }: Props) {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [balance, setBalance] = useState(initialBalance);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [phone, setPhone] = useState('');
  const [showMethodPicker, setShowMethodPicker] = useState(false);

  useEffect(() => { loadData(); }, [transporterId]);

  const loadData = async () => {
    try {
      const res = await apiGet<any>(`/transporters/${transporterId}/withdrawals`, accessToken);
      setWithdrawals(res?.withdrawals || []);
      if (res?.availableBalance !== undefined) setBalance(res.availableBalance);
    } catch (e) { console.error('Withdrawals load error', e); }
    setLoading(false);
  };

  const handleSubmit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0 || amt > balance) { Alert.alert('Invalid', 'Enter a valid amount within your balance'); return; }
    if (!method) { Alert.alert('Required', 'Select a payment method'); return; }
    if (!phone.trim()) { Alert.alert('Required', 'Enter your phone number'); return; }

    setSubmitting(true);
    try {
      await apiPost('/transporters/withdrawals', {
        amount: amt,
        payment_method: method,
        payment_details: { phone_number: phone },
      }, accessToken);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Withdrawal request submitted!');
      setAmount(''); setPhone(''); setMethod('');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit withdrawal');
    }
    setSubmitting(false);
  };

  const selectedName = PAYOUT_METHODS.find(m => m.id === method)?.name || 'Select method';
  const amt = Number(amount) || 0;
  const fee = Math.round(amt * COMMISSION_RATE);
  const net = amt - fee;

  if (loading) return <View style={st.center}><ActivityIndicator color={Theme.primary} /></View>;

  return (
    <ScrollView style={st.container} contentContainerStyle={st.content}>
      {/* Withdrawal Form */}
      <View style={st.card}>
        <Text style={st.cardTitle}>Request Withdrawal</Text>

        <View style={st.balanceBox}>
          <Text style={st.balanceLabel}>Available Balance</Text>
          <Text style={st.balanceValue}>TSh {balance.toLocaleString()}</Text>
        </View>

        <View style={st.field}>
          <Text style={st.label}>Amount to Withdraw *</Text>
          <TextInput style={st.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="Enter amount" placeholderTextColor={Theme.textMuted} />
        </View>

        {amt > 0 && (
          <View style={st.breakdownCard}>
            <View style={st.breakdownRow}><Text style={st.breakdownLabel}>Requested</Text><Text style={st.breakdownVal}>TSh {amt.toLocaleString()}</Text></View>
            <View style={st.breakdownRow}><Text style={st.breakdownLabel}>Service Fee (3.5%)</Text><Text style={[st.breakdownVal, { color: Theme.error }]}>- TSh {fee.toLocaleString()}</Text></View>
            <View style={[st.breakdownRow, st.breakdownTotal]}><Text style={st.breakdownTotalLabel}>You Receive</Text><Text style={st.breakdownTotalVal}>TSh {net.toLocaleString()}</Text></View>
          </View>
        )}

        <View style={st.field}>
          <Text style={st.label}>Payment Method *</Text>
          <Pressable style={st.picker} onPress={() => setShowMethodPicker(!showMethodPicker)}>
            <Text style={[st.pickerText, !method && { color: Theme.textMuted }]}>{selectedName}</Text>
            <FontAwesome name="chevron-down" size={12} color={Theme.textMuted} />
          </Pressable>
          {showMethodPicker && (
            <View style={st.dropdown}>
              {PAYOUT_METHODS.map(m => (
                <Pressable key={m.id} style={[st.dropdownItem, method === m.id && st.dropdownItemActive]} onPress={() => { setMethod(m.id); setShowMethodPicker(false); }}>
                  <Text style={[st.dropdownText, method === m.id && { color: Theme.primary, fontWeight: '700' }]}>{m.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={st.field}>
          <Text style={st.label}>Phone Number *</Text>
          <TextInput style={st.input} value={phone} onChangeText={setPhone} placeholder="+255 XXX XXX XXX" placeholderTextColor={Theme.textMuted} keyboardType="phone-pad" />
        </View>

        <Pressable style={[st.submitBtn, (submitting || balance <= 0) && { opacity: 0.5 }]} onPress={handleSubmit} disabled={submitting || balance <= 0}>
          {submitting ? <ActivityIndicator color="#fff" /> : <><FontAwesome name="money" size={16} color="#fff" /><Text style={st.submitBtnText}>Request Withdrawal</Text></>}
        </Pressable>
      </View>

      {/* History */}
      <Text style={st.sectionTitle}>Withdrawal History</Text>
      {withdrawals.length === 0 ? (
        <View style={st.empty}><FontAwesome name="history" size={40} color={Theme.textMuted} /><Text style={st.emptyText}>No withdrawal requests yet</Text></View>
      ) : (
        withdrawals.map(w => {
          const si = STATUS_ICON[w.status] || STATUS_ICON.pending;
          return (
            <View key={w.id} style={st.historyCard}>
              <FontAwesome name={si.icon as any} size={20} color={si.color} />
              <View style={{ flex: 1 }}>
                <Text style={st.historyMethod}>{(w.payment_method || '').replace(/_/g, ' ')}</Text>
                <Text style={st.historyMeta}>{new Date(w.created_at).toLocaleDateString()} at {new Date(w.created_at).toLocaleTimeString()}</Text>
                {w.notes && <Text style={st.historyNotes}>{w.notes}</Text>}
              </View>
              <View style={st.historyRight}>
                <Text style={st.historyAmount}>TSh {Number(w.amount).toLocaleString()}</Text>
                <Text style={[st.historyStatus, { color: si.color }]}>{w.status}</Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: Theme.background, borderRadius: Theme.radiusLg, padding: 16, gap: 14, ...Theme.shadowSm },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Theme.text },
  balanceBox: { backgroundColor: '#f0fdf4', borderRadius: Theme.radiusMd, padding: 14, borderWidth: 1, borderColor: '#bbf7d0' },
  balanceLabel: { fontSize: 11, color: Theme.textSecondary },
  balanceValue: { fontSize: 22, fontWeight: '900', color: '#15803d' },
  field: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', color: Theme.textSecondary, textTransform: 'uppercase' },
  input: { height: 48, backgroundColor: Theme.inputBg, borderRadius: Theme.radiusMd, borderWidth: 1, borderColor: Theme.inputBorder, paddingHorizontal: 14, fontSize: 15, color: Theme.text },
  picker: { height: 48, backgroundColor: Theme.inputBg, borderRadius: Theme.radiusMd, borderWidth: 1, borderColor: Theme.inputBorder, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerText: { fontSize: 15, color: Theme.text, fontWeight: '500' },
  dropdown: { backgroundColor: '#fff', borderRadius: Theme.radiusSm, borderWidth: 1, borderColor: Theme.inputBorder, ...Theme.shadowMd },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 0.5, borderBottomColor: Theme.inputBorder },
  dropdownItemActive: { backgroundColor: Theme.primary + '08' },
  dropdownText: { fontSize: 14, color: Theme.text },
  breakdownCard: { backgroundColor: Theme.backgroundSecondary, borderRadius: Theme.radiusMd, padding: 14, gap: 8 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { fontSize: 13, color: Theme.textSecondary },
  breakdownVal: { fontSize: 13, fontWeight: '600', color: Theme.text },
  breakdownTotal: { borderTopWidth: 1, borderTopColor: Theme.inputBorder, paddingTop: 8, marginTop: 4 },
  breakdownTotalLabel: { fontSize: 14, fontWeight: '800', color: Theme.text },
  breakdownTotalVal: { fontSize: 16, fontWeight: '900', color: Theme.success },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Theme.primary, paddingVertical: 14, borderRadius: Theme.radiusMd },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Theme.text },
  empty: { alignItems: 'center', padding: 40, gap: 12 },
  emptyText: { fontSize: 14, color: Theme.textMuted },
  historyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Theme.background, padding: 14, borderRadius: Theme.radiusMd, borderWidth: 1, borderColor: Theme.inputBorder },
  historyMethod: { fontSize: 13, fontWeight: '600', color: Theme.text, textTransform: 'capitalize' },
  historyMeta: { fontSize: 10, color: Theme.textMuted, marginTop: 2 },
  historyNotes: { fontSize: 10, color: Theme.textMuted, marginTop: 2 },
  historyRight: { alignItems: 'flex-end', gap: 2 },
  historyAmount: { fontSize: 14, fontWeight: '700', color: Theme.text },
  historyStatus: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
});
