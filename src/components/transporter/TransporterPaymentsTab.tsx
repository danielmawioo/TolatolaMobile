import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { apiGet } from '@/src/services/api';
import { logger } from '@/src/lib/logger';

const STATUS_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  pending: { icon: 'clock-o', color: '#b45309', bg: '#fef3c7' },
  available: { icon: 'check-circle', color: '#15803d', bg: '#dcfce7' },
  completed: { icon: 'check-circle', color: '#15803d', bg: '#dcfce7' },
  withdrawn: { icon: 'arrow-down', color: '#4b5563', bg: '#f3f4f6' },
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
      {/* Modern Balance Cards */}
      <View style={st.balanceRow}>
        <View style={st.balanceCardAvailable}>
          <View style={st.balanceIconWrapAvailable}>
            <FontAwesome name="credit-card" size={16} color="#15803d" />
          </View>
          <Text style={st.balanceLabelAvailable}>Available Balance</Text>
          <Text style={st.balanceValueAvailable}>TSh {available.toLocaleString()}</Text>
          <View style={st.balancePillAvailable}>
            <View style={st.greenDot} />
            <Text style={st.balanceSubAvailable}>Ready to withdraw</Text>
          </View>
        </View>

        <View style={st.balanceCardPending}>
          <View style={st.balanceIconWrapPending}>
            <FontAwesome name="clock-o" size={16} color="#b45309" />
          </View>
          <Text style={st.balanceLabelPending}>Pending Balance</Text>
          <Text style={st.balanceValuePending}>TSh {pending.toLocaleString()}</Text>
          <View style={st.balancePillPending}>
            <Text style={st.balanceSubPending}>Being processed</Text>
          </View>
        </View>
      </View>

      {/* Payment History */}
      <View style={st.historyHeader}>
        <Text style={st.sectionTitle}>Payment History</Text>
        {payments.length > 0 && (
          <View style={st.countTag}>
            <Text style={st.countTagText}>{payments.length} {payments.length === 1 ? 'entry' : 'entries'}</Text>
          </View>
        )}
      </View>

      {payments.length === 0 ? (
        <View style={st.empty}>
          <View style={st.emptyIconWrap}>
            <FontAwesome name="money" size={32} color={Theme.textMuted} />
          </View>
          <Text style={st.emptyText}>No payments yet</Text>
        </View>
      ) : (
        payments.map(p => {
          const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
          return (
            <View key={p.id} style={st.paymentCard}>
              <View style={[st.itemIconWrap, { backgroundColor: cfg.bg }]}>
                <FontAwesome name={cfg.icon as any} size={16} color={cfg.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.paymentDesc}>{p.description || `${p.payment_type} payment`}</Text>
                <Text style={st.paymentMeta}>{new Date(p.created_at).toLocaleDateString()} at {new Date(p.created_at).toLocaleTimeString()}</Text>
              </View>
              <View style={st.paymentRight}>
                <Text style={st.paymentAmount}>+TSh {Number(p.amount).toLocaleString()}</Text>
                <View style={[st.statusPill, { backgroundColor: cfg.bg }]}>
                  <Text style={[st.paymentStatus, { color: cfg.color }]}>{p.status}</Text>
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

  // Balances
  balanceRow: { flexDirection: 'row', gap: 12 },
  balanceCardAvailable: {
    flex: 1,
    backgroundColor: Theme.background,
    borderRadius: 16,
    padding: 16,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    ...Theme.shadowSm,
  },
  balanceIconWrapAvailable: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabelAvailable: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValueAvailable: {
    fontSize: 19,
    fontWeight: '900',
    color: '#15803d',
    letterSpacing: -0.5,
  },
  balancePillAvailable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  greenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16a34a',
  },
  balanceSubAvailable: {
    fontSize: 10,
    fontWeight: '600',
    color: '#166534',
  },

  balanceCardPending: {
    flex: 1,
    backgroundColor: Theme.background,
    borderRadius: 16,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
    ...Theme.shadowSm,
  },
  balanceIconWrapPending: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabelPending: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValuePending: {
    fontSize: 19,
    fontWeight: '900',
    color: Theme.text,
    letterSpacing: -0.5,
  },
  balancePillPending: {
    marginTop: 2,
  },
  balanceSubPending: {
    fontSize: 10,
    fontWeight: '500',
    color: Theme.textMuted,
  },

  // History
  historyHeader: {
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
    padding: 40,
    gap: 10,
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
  },
  emptyText: {
    fontSize: 14,
    color: Theme.textMuted,
    fontWeight: '500',
  },

  paymentCard: {
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
  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentDesc: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.text,
  },
  paymentMeta: {
    fontSize: 10,
    color: Theme.textMuted,
    marginTop: 2,
  },
  paymentRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803d',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  paymentStatus: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
