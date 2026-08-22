import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';
import { apiGet, apiPost } from '@/src/services/api';
import { logger } from '@/src/lib/logger';

const COMMISSION_RATE = 0.05;
const PAYOUT_METHODS = [
  { id: 'airtel-money', name: 'Airtel Money' },
  { id: 'tigo-pesa', name: 'Tigo Pesa' },
  { id: 'halopesa', name: 'HaloPesa' },
  { id: 'ezypesa', name: 'EzyPesa' },
  { id: 'bank-transfer', name: 'Bank Transfer' },
];

const STATUS_ICON: Record<string, { icon: string; color: string }> = {
  completed: { icon: 'check-circle', color: '#16a34a' },
  pending: { icon: 'clock-o', color: '#eab308' },
  processing: { icon: 'line-chart', color: '#2563eb' },
  failed: { icon: 'times-circle', color: '#ef4444' },
};

interface Props { vendorId: string; accessToken: string; }

export function VendorWalletTab({ vendorId, accessToken }: Props) {
  const [balance, setBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('airtel-money');
  const [details, setDetails] = useState('');
  const [showMethodPicker, setShowMethodPicker] = useState(false);

  useEffect(() => { loadData(); }, [vendorId]);

  const loadData = async () => {
    try {
      const res = await apiGet<any>(`/vendors/${vendorId}/wallet`, accessToken);
      setBalance(res.balance || 0);
      setPendingBalance(res.pendingBalance || 0);
      setPayouts(res.payouts || []);
    } catch (e) { logger.error('Wallet load error', e); }
    setLoading(false);
  };

  const handlePayout = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { Alert.alert('Invalid', 'Enter a valid amount'); return; }
    if (amt > balance) { Alert.alert('Insufficient', 'Amount exceeds balance'); return; }
    if (!details.trim()) { Alert.alert('Missing', 'Enter payment details (phone number)'); return; }

    setRequesting(true);
    try {
      await apiPost(`/vendors/${vendorId}/payouts`, { amount: amt, paymentMethod: method, paymentDetails: details }, accessToken);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Payout request submitted for approval');
      setAmount(''); setDetails('');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to request payout');
    }
    setRequesting(false);
  };

  const selectedMethodName = PAYOUT_METHODS.find(m => m.id === method)?.name || method;
  const amt = Number(amount) || 0;
  const fee = Math.round(amt * COMMISSION_RATE);
  const net = amt - fee;

  if (loading) return <View style={s.center}><ActivityIndicator color={Theme.primary} /></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Balance Cards */}
      <View style={s.balanceRow}>
        <View style={[s.balanceCard, { borderColor: Theme.success + '30' }]}>
          <View style={s.balanceIconWrap}><FontAwesome name="credit-card" size={18} color={Theme.success} /></View>
          <Text style={s.balanceLabel}>Available Balance</Text>
          <Text style={s.balanceValue}>TSh {balance.toLocaleString()}</Text>
          <Text style={s.balanceSub}>Ready to withdraw</Text>
        </View>
        <View style={[s.balanceCard, { borderColor: '#fde68a' }]}>
          <View style={[s.balanceIconWrap, { backgroundColor: '#fef3c7' }]}><FontAwesome name="clock-o" size={18} color="#b45309" /></View>
          <Text style={s.balanceLabel}>Pending Balance</Text>
          <Text style={s.balanceValue}>TSh {pendingBalance.toLocaleString()}</Text>
          <Text style={s.balanceSub}>Awaiting delivery</Text>
        </View>
      </View>

      {/* Request Payout */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Request Payout</Text>
        <View style={s.card}>
          <View style={s.field}>
            <Text style={s.label}>Amount (TSh)</Text>
            <TextInput style={s.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="Enter amount" placeholderTextColor={Theme.textMuted} />
            <Text style={s.hint}>Available: TSh {balance.toLocaleString()}</Text>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Payment Method</Text>
            <Pressable style={s.picker} onPress={() => setShowMethodPicker(!showMethodPicker)}>
              <Text style={s.pickerText}>{selectedMethodName}</Text>
              <FontAwesome name="chevron-down" size={12} color={Theme.textMuted} />
            </Pressable>
            {showMethodPicker && (
              <View style={s.dropdown}>
                {PAYOUT_METHODS.map(m => (
                  <Pressable key={m.id} style={[s.dropdownItem, method === m.id && s.dropdownItemActive]} onPress={() => { setMethod(m.id); setShowMethodPicker(false); }}>
                    <Text style={[s.dropdownText, method === m.id && { color: Theme.primary, fontWeight: '700' }]}>{m.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={s.field}>
            <Text style={s.label}>Payment Details</Text>
            <TextInput style={s.input} value={details} onChangeText={setDetails} placeholder="e.g., +255 XXX XXX XXX" placeholderTextColor={Theme.textMuted} keyboardType="phone-pad" />
          </View>

          {amt > 0 && (
            <View style={s.breakdownCard}>
              <View style={s.breakdownRow}><Text style={s.breakdownLabel}>Requested</Text><Text style={s.breakdownVal}>TSh {amt.toLocaleString()}</Text></View>
              <View style={s.breakdownRow}><Text style={s.breakdownLabel}>Service Fee (5%)</Text><Text style={[s.breakdownVal, { color: Theme.error }]}>- TSh {fee.toLocaleString()}</Text></View>
              <View style={[s.breakdownRow, s.breakdownTotal]}><Text style={s.breakdownTotalLabel}>You Receive</Text><Text style={s.breakdownTotalVal}>TSh {net.toLocaleString()}</Text></View>
            </View>
          )}

          <Pressable style={[s.payoutBtn, (requesting || balance <= 0) && { opacity: 0.5 }]} onPress={handlePayout} disabled={requesting || balance <= 0}>
            {requesting ? <ActivityIndicator color="#fff" /> : <><FontAwesome name="money" size={16} color="#fff" /><Text style={s.payoutBtnText}>Request Payout</Text></>}
          </Pressable>
        </View>
      </View>

      {/* Payout History */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Payout History</Text>
        {payouts.length === 0 ? (
          <View style={s.emptyState}><FontAwesome name="history" size={40} color={Theme.textMuted} /><Text style={s.emptyText}>No payouts yet</Text></View>
        ) : (
          payouts.map(p => {
            const si = STATUS_ICON[p.status] || STATUS_ICON.pending;
            return (
              <View key={p.id} style={s.payoutCard}>
                <FontAwesome name={si.icon as any} size={20} color={si.color} />
                <View style={{ flex: 1 }}>
                  <Text style={s.payoutAmount}>TSh {Number(p.amount).toLocaleString()}</Text>
                  <Text style={s.payoutMeta}>{new Date(p.created_at).toLocaleDateString()} via {p.payment_method}</Text>
                </View>
                <Text style={[s.payoutStatus, { color: si.color }]}>{p.status}</Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Balance
  balanceRow: { flexDirection: 'row', gap: 12 },
  balanceCard: { flex: 1, backgroundColor: Theme.background, borderRadius: Theme.radiusLg, padding: 18, gap: 6, borderWidth: 1, ...Theme.shadowSm },
  balanceIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: Theme.success + '10', alignItems: 'center', justifyContent: 'center' },
  balanceLabel: { fontSize: 10, fontWeight: '700', color: Theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceValue: { fontSize: 22, fontWeight: '900', color: Theme.text },
  balanceSub: { fontSize: 10, color: Theme.textMuted },
  // Section
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Theme.text },
  card: { backgroundColor: Theme.background, borderRadius: Theme.radiusLg, padding: 16, gap: 16, ...Theme.shadowSm },
  // Fields
  field: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', color: Theme.textSecondary, textTransform: 'uppercase' },
  input: { height: 48, backgroundColor: Theme.inputBg, borderRadius: Theme.radiusMd, borderWidth: 1, borderColor: Theme.inputBorder, paddingHorizontal: 14, fontSize: 15, color: Theme.text },
  hint: { fontSize: 10, color: Theme.textMuted },
  picker: { height: 48, backgroundColor: Theme.inputBg, borderRadius: Theme.radiusMd, borderWidth: 1, borderColor: Theme.inputBorder, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerText: { fontSize: 15, color: Theme.text, fontWeight: '500' },
  dropdown: { backgroundColor: '#fff', borderRadius: Theme.radiusSm, borderWidth: 1, borderColor: Theme.inputBorder, ...Theme.shadowMd },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 0.5, borderBottomColor: Theme.inputBorder },
  dropdownItemActive: { backgroundColor: Theme.primary + '08' },
  dropdownText: { fontSize: 14, color: Theme.text },
  // Breakdown
  breakdownCard: { backgroundColor: Theme.backgroundSecondary, borderRadius: Theme.radiusMd, padding: 14, gap: 8 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { fontSize: 13, color: Theme.textSecondary },
  breakdownVal: { fontSize: 13, fontWeight: '600', color: Theme.text },
  breakdownTotal: { borderTopWidth: 1, borderTopColor: Theme.inputBorder, paddingTop: 8, marginTop: 4 },
  breakdownTotalLabel: { fontSize: 14, fontWeight: '800', color: Theme.text },
  breakdownTotalVal: { fontSize: 16, fontWeight: '900', color: Theme.success },
  // Payout button
  payoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Theme.primary, paddingVertical: 14, borderRadius: Theme.radiusMd },
  payoutBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // History
  emptyState: { alignItems: 'center', padding: 40, gap: 12 },
  emptyText: { fontSize: 14, color: Theme.textMuted },
  payoutCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Theme.background, padding: 16, borderRadius: Theme.radiusMd, borderWidth: 1, borderColor: Theme.inputBorder, marginBottom: 8 },
  payoutAmount: { fontSize: 15, fontWeight: '700', color: Theme.text },
  payoutMeta: { fontSize: 11, color: Theme.textMuted, marginTop: 2 },
  payoutStatus: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
});
