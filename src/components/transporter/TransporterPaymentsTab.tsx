import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { apiGet } from '@/src/services/api';
import { logger } from '@/src/lib/logger';

const STATUS_ICON: Record<string, { icon: string; color: string }> = {
  pending: { icon: 'clock-o', color: '#eab308' },
  available: { icon: 'check-circle', color: '#16a34a' },
  withdrawn: { icon: 'money', color: '#6b7280' },
};

interface Props { transporterId: string; accessToken: string; }

export function TransporterPaymentsTab({ transporterId, accessToken }: Props) {
  const [payments, setPayments] = useState<any[]>([]);
  const [available, setAvailable] = useState(0);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [transporterId]);

  const loadData = async () => {
    try {
      const [paymentsRes, financeRes] = await Promise.all([
        apiGet<any>('/transporters/payments', accessToken).catch(() => ({ payments: [] })),
        apiGet<any>('/transporter/finance-summary', accessToken).catch(() => null)
      ]);
      setPayments(paymentsRes?.payments || []);
      setAvailable(financeRes?.withdrawable_balance ?? paymentsRes?.availableBalance ?? 0);
      setPending(financeRes?.pending_balance ?? paymentsRes?.pendingBalance ?? 0);
    } catch (e) { logger.error('Payments load error', e); }
    setLoading(false);
  };

  if (loading) return <View style={st.center}><ActivityIndicator color={Theme.primary} /></View>;

  return (
    <ScrollView style={st.container} contentContainerStyle={st.content}>
      {/* Balance Cards */}
      <View style={st.balanceRow}>
        <View style={[st.balanceCard, { borderColor: Theme.success + '30' }]}>
          <View style={st.balanceIconWrap}><FontAwesome name="credit-card" size={18} color={Theme.success} /></View>
          <Text style={st.balanceLabel}>Available Balance</Text>
          <Text style={st.balanceValue}>TSh {available.toLocaleString()}</Text>
          <Text style={st.balanceSub}>Ready to withdraw</Text>
        </View>
        <View style={[st.balanceCard, { borderColor: '#fde68a' }]}>
          <View style={[st.balanceIconWrap, { backgroundColor: '#fef3c7' }]}><FontAwesome name="clock-o" size={18} color="#b45309" /></View>
          <Text style={st.balanceLabel}>Pending Balance</Text>
          <Text style={st.balanceValue}>TSh {pending.toLocaleString()}</Text>
          <Text style={st.balanceSub}>Being processed</Text>
        </View>
      </View>

      {/* Payment History */}
      <Text style={st.sectionTitle}>Payment History</Text>
      {payments.length === 0 ? (
        <View style={st.empty}><FontAwesome name="money" size={40} color={Theme.textMuted} /><Text style={st.emptyText}>No payments yet</Text></View>
      ) : (
        payments.map(p => {
          const si = STATUS_ICON[p.status] || STATUS_ICON.pending;
          return (
            <View key={p.id} style={st.paymentCard}>
              <FontAwesome name={si.icon as any} size={20} color={si.color} />
              <View style={{ flex: 1 }}>
                <Text style={st.paymentDesc}>{p.description || `${p.payment_type} payment`}</Text>
                <Text style={st.paymentMeta}>{new Date(p.created_at).toLocaleDateString()} at {new Date(p.created_at).toLocaleTimeString()}</Text>
              </View>
              <View style={st.paymentRight}>
                <Text style={st.paymentAmount}>+TSh {Number(p.amount).toLocaleString()}</Text>
                <Text style={[st.paymentStatus, { color: si.color }]}>{p.status}</Text>
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
  balanceRow: { flexDirection: 'row', gap: 12 },
  balanceCard: { flex: 1, backgroundColor: Theme.background, borderRadius: Theme.radiusLg, padding: 18, gap: 6, borderWidth: 1, ...Theme.shadowSm },
  balanceIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: Theme.success + '10', alignItems: 'center', justifyContent: 'center' },
  balanceLabel: { fontSize: 10, fontWeight: '700', color: Theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceValue: { fontSize: 20, fontWeight: '900', color: Theme.text },
  balanceSub: { fontSize: 10, color: Theme.textMuted },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Theme.text },
  empty: { alignItems: 'center', padding: 40, gap: 12 },
  emptyText: { fontSize: 14, color: Theme.textMuted },
  paymentCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Theme.background, padding: 14, borderRadius: Theme.radiusMd, borderWidth: 1, borderColor: Theme.inputBorder },
  paymentDesc: { fontSize: 13, fontWeight: '600', color: Theme.text },
  paymentMeta: { fontSize: 10, color: Theme.textMuted, marginTop: 2 },
  paymentRight: { alignItems: 'flex-end', gap: 2 },
  paymentAmount: { fontSize: 14, fontWeight: '700', color: Theme.success },
  paymentStatus: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
});
