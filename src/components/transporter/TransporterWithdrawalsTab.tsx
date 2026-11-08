import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';
import { apiGet, apiPost } from '@/src/services/api';
import { logger } from '@/src/lib/logger';

const COMMISSION_RATE = 0.10;
const PAYOUT_METHODS = [
  { id: 'm-pesa', name: 'Vodacom M-Pesa' },
  { id: 'airtel-money', name: 'Airtel Money' },
  { id: 'tigo-pesa', name: 'Tigo Pesa' },
  { id: 'halopesa', name: 'HaloPesa' },
  { id: 'ezypesa', name: 'EzyPesa' },
  { id: 'bank_transfer', name: 'Bank Transfer' },
];

const QUICK_PERCENTAGES = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: 'Max', value: 1.0 },
];

const STATUS_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  pending: { icon: 'clock-o', color: '#b45309', bg: '#fef3c7' },
  processing: { icon: 'line-chart', color: '#1d4ed8', bg: '#dbeafe' },
  completed: { icon: 'check-circle', color: '#15803d', bg: '#dcfce7' },
  failed: { icon: 'times-circle', color: '#b91c1c', bg: '#fee2e2' },
  rejected: { icon: 'times-circle', color: '#b91c1c', bg: '#fee2e2' },
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

  const loadData = useCallback(async () => {
    try {
      const [res, financeRes] = await Promise.all([
        apiGet<any>('/transporters/withdrawals', accessToken).catch(() => null),
        apiGet<any>('/transporter/finance-summary', accessToken).catch(() => null)
      ]);
      setWithdrawals(res?.withdrawals || []);
      if (financeRes?.withdrawable_balance !== undefined) {
        setBalance(financeRes.withdrawable_balance);
      } else if (res?.availableBalance !== undefined) {
        setBalance(res.availableBalance);
      }
    } catch (e) { logger.error('Withdrawals load error', e); }
    setLoading(false);
  }, [accessToken]);

  useEffect(() => { loadData(); }, [transporterId, loadData]);

  const handleQuickPercent = (pct: number) => {
    if (balance <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const calculated = Math.floor(balance * pct);
    setAmount(calculated > 0 ? calculated.toString() : '');
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
      {/* Withdrawal Form Card */}
      <View style={st.card}>
        <View style={st.cardHeaderRow}>
          <View style={st.cardIconWrap}>
            <FontAwesome name="arrow-down" size={16} color={Theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.cardTitle}>Request Withdrawal</Text>
            <Text style={st.cardSub}>Instant mobile money payout powered by ClickPesa</Text>
          </View>
        </View>

        {/* Balance Box */}
        <View style={st.balanceBox}>
          <View style={st.balanceBoxTop}>
            <Text style={st.balanceLabel}>Available Balance</Text>
            <View style={st.liveDot} />
          </View>
          <Text style={st.balanceValue}>TSh {balance.toLocaleString()}</Text>
          <Text style={st.balanceSub}>Available for instant payout</Text>
        </View>

        {/* Amount Input & Quick Chips */}
        <View style={st.field}>
          <View style={st.labelRow}>
            <Text style={st.label}>Amount to Withdraw *</Text>
            {balance > 0 && (
              <View style={st.chipsRow}>
                {QUICK_PERCENTAGES.map((c) => (
                  <Pressable
                    key={c.label}
                    style={st.chipBtn}
                    onPress={() => handleQuickPercent(c.value)}
                  >
                    <Text style={st.chipText}>{c.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
          <TextInput
            style={st.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="Enter amount"
            placeholderTextColor={Theme.textMuted}
          />
        </View>

        {/* Dynamic Fee Calculation */}
        {amt > 0 && (
          <View style={st.breakdownCard}>
            <View style={st.breakdownHeader}>
              <FontAwesome name="file-text-o" size={12} color={Theme.primary} />
              <Text style={st.breakdownTitle}>FEE BREAKDOWN</Text>
            </View>
            <View style={st.breakdownRow}>
              <Text style={st.breakdownLabel}>Requested</Text>
              <Text style={st.breakdownVal}>TSh {amt.toLocaleString()}</Text>
            </View>
            <View style={st.breakdownRow}>
              <Text style={st.breakdownLabel}>Service Fee (10%)</Text>
              <Text style={[st.breakdownVal, { color: '#b45309' }]}>- TSh {fee.toLocaleString()}</Text>
            </View>
            <View style={[st.breakdownRow, st.breakdownTotal]}>
              <Text style={st.breakdownTotalLabel}>You Receive</Text>
              <Text style={st.breakdownTotalVal}>TSh {net.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {/* Payment Method Picker */}
        <View style={st.field}>
          <Text style={st.label}>Payment Method *</Text>
          <Pressable style={st.picker} onPress={() => setShowMethodPicker(!showMethodPicker)}>
            <View style={st.pickerLeft}>
              <FontAwesome name="mobile" size={18} color={method ? Theme.primary : Theme.textMuted} />
              <Text style={[st.pickerText, !method && { color: Theme.textMuted }]}>{selectedName}</Text>
            </View>
            <FontAwesome name="chevron-down" size={12} color={Theme.textMuted} />
          </Pressable>
          {showMethodPicker && (
            <View style={st.dropdown}>
              {PAYOUT_METHODS.map(m => (
                <Pressable
                  key={m.id}
                  style={[st.dropdownItem, method === m.id && st.dropdownItemActive]}
                  onPress={() => { setMethod(m.id); setShowMethodPicker(false); }}
                >
                  <Text style={[st.dropdownText, method === m.id && { color: Theme.primary, fontWeight: '700' }]}>
                    {m.name}
                  </Text>
                  {method === m.id && <FontAwesome name="check" size={12} color={Theme.primary} />}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Phone Number */}
        <View style={st.field}>
          <Text style={st.label}>Phone Number *</Text>
          <TextInput
            style={st.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+255 XXX XXX XXX"
            placeholderTextColor={Theme.textMuted}
            keyboardType="phone-pad"
          />
        </View>

        {/* Submit */}
        <Pressable
          style={[st.submitBtn, (submitting || balance <= 0) && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={submitting || balance <= 0}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <FontAwesome name="money" size={16} color="#fff" />
              <Text style={st.submitBtnText}>Request Withdrawal</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* History */}
      <View style={st.historyHeaderRow}>
        <Text style={st.sectionTitle}>Withdrawal History</Text>
        {withdrawals.length > 0 && (
          <View style={st.countTag}>
            <Text style={st.countTagText}>{withdrawals.length} {withdrawals.length === 1 ? 'record' : 'records'}</Text>
          </View>
        )}
      </View>

      {withdrawals.length === 0 ? (
        <View style={st.empty}>
          <View style={st.emptyIconWrap}>
            <FontAwesome name="history" size={32} color={Theme.textMuted} />
          </View>
          <Text style={st.emptyText}>No withdrawal requests yet</Text>
          <Text style={st.emptySub}>Your submitted withdrawal requests will appear here</Text>
        </View>
      ) : (
        withdrawals.map(w => {
          const cfg = STATUS_CONFIG[w.status] || STATUS_CONFIG.pending;
          return (
            <View key={w.id} style={st.historyCard}>
              <View style={[st.historyIconWrap, { backgroundColor: cfg.bg }]}>
                <FontAwesome name={cfg.icon as any} size={16} color={cfg.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.historyMethod}>{(w.payment_method || '').replace(/_/g, ' ')}</Text>
                <Text style={st.historyMeta}>
                  {new Date(w.created_at).toLocaleDateString()} at {new Date(w.created_at).toLocaleTimeString()}
                </Text>
                {w.notes && (
                  <View style={st.notesBox}>
                    <Text style={st.historyNotes}>{w.notes}</Text>
                  </View>
                )}
              </View>
              <View style={st.historyRight}>
                <Text style={st.historyAmount}>TSh {Number(w.amount).toLocaleString()}</Text>
                <View style={[st.statusPill, { backgroundColor: cfg.bg }]}>
                  <Text style={[st.historyStatus, { color: cfg.color }]}>{w.status}</Text>
                </View>
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

  card: {
    backgroundColor: Theme.background,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    ...Theme.shadowSm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Theme.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Theme.text,
    letterSpacing: -0.3,
  },
  cardSub: {
    fontSize: 11,
    color: Theme.textMuted,
    marginTop: 1,
  },

  // Balance
  balanceBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    gap: 4,
  },
  balanceBoxTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#15803d',
    letterSpacing: -0.5,
  },
  balanceSub: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '500',
  },

  // Field
  field: { gap: 6 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  chipBtn: {
    backgroundColor: Theme.backgroundSecondary,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.textSecondary,
  },
  input: {
    height: 48,
    backgroundColor: Theme.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
    color: Theme.text,
  },

  // Fee calculation
  breakdownCard: {
    backgroundColor: Theme.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  breakdownTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.primary,
    letterSpacing: 0.5,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: Theme.textSecondary,
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.text,
  },
  breakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: Theme.inputBorder,
    paddingTop: 8,
    marginTop: 2,
  },
  breakdownTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.text,
  },
  breakdownTotalVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#15803d',
  },

  // Picker
  picker: {
    height: 48,
    backgroundColor: Theme.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.text,
  },
  dropdown: {
    backgroundColor: Theme.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    overflow: 'hidden',
    marginTop: 4,
    ...Theme.shadowSm,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: Theme.inputBorder,
  },
  dropdownItemActive: {
    backgroundColor: Theme.primary + '10',
  },
  dropdownText: {
    fontSize: 13,
    color: Theme.text,
    fontWeight: '500',
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // History
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Theme.text,
    letterSpacing: -0.3,
  },
  countTag: {
    backgroundColor: Theme.backgroundSecondary,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countTagText: {
    fontSize: 11,
    color: Theme.textMuted,
    fontWeight: '600',
  },

  empty: {
    alignItems: 'center',
    padding: 36,
    gap: 8,
    backgroundColor: Theme.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.text,
  },
  emptySub: {
    fontSize: 11,
    color: Theme.textMuted,
    textAlign: 'center',
  },

  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Theme.background,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    ...Theme.shadowSm,
  },
  historyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyMethod: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.text,
    textTransform: 'capitalize',
  },
  historyMeta: {
    fontSize: 10,
    color: Theme.textMuted,
    marginTop: 2,
  },
  notesBox: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  historyNotes: {
    fontSize: 10,
    color: '#92400e',
    fontWeight: '500',
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.text,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  historyStatus: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
