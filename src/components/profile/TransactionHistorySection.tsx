import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { apiGet } from '@/src/services/api';

const TYPE_ICON: Record<string, { icon: string; color: string }> = {
  payment: { icon: 'arrow-up', color: '#ef4444' },
  escrow_hold: { icon: 'arrow-up', color: '#ef4444' },
  refund: { icon: 'arrow-down', color: '#16a34a' },
  escrow_release: { icon: 'arrow-down', color: '#16a34a' },
};
const STATUS_COLORS: Record<string, string> = {
  completed: '#16a34a', pending: '#eab308', failed: '#ef4444',
};

interface Props { accessToken: string; }

export function TransactionHistorySection({ accessToken }: Props) {
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<any>('/profile/transactions', accessToken);
        setTxns(Array.isArray(res) ? res : res?.data || res?.transactions || []);
      } catch (e) { console.error('Txn load error', e); }
      setLoading(false);
    })();
  }, [accessToken]);

  if (loading) return <View style={s.center}><ActivityIndicator color={Theme.primary} /></View>;

  if (txns.length === 0) return (
    <View style={s.empty}>
      <FontAwesome name="credit-card" size={48} color={Theme.textMuted} />
      <Text style={s.emptyTitle}>No transactions yet</Text>
      <Text style={s.emptyText}>Your financial transactions will appear here once you start buying.</Text>
    </View>
  );

  return (
    <View style={s.list}>
      {txns.map(t => {
        const ti = TYPE_ICON[t.transaction_type] || { icon: 'credit-card', color: '#6b7280' };
        const sc = STATUS_COLORS[t.status] || '#6b7280';
        const label = t.transaction_type === 'escrow_hold' ? 'Payment Protected'
          : t.transaction_type === 'escrow_release' ? 'Payment Released'
          : (t.transaction_type || 'transaction').replace(/_/g, ' ');
        return (
          <View key={t.id} style={s.row}>
            <View style={[s.iconWrap, { backgroundColor: ti.color + '10' }]}>
              <FontAwesome name={ti.icon as any} size={14} color={ti.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.txnLabel}>{label}</Text>
              {t.description && <Text style={s.txnDesc} numberOfLines={1}>{t.description}</Text>}
              <Text style={s.txnDate}>{new Date(t.created_at).toLocaleDateString()} at {new Date(t.created_at).toLocaleTimeString()}</Text>
            </View>
            <View style={s.right}>
              <Text style={s.txnAmount}>{t.currency || 'TZS'} {Number(t.amount).toLocaleString()}</Text>
              <View style={[s.statusBadge, { backgroundColor: sc + '18' }]}>
                <Text style={[s.statusText, { color: sc }]}>{t.status}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  center: { padding: 40, alignItems: 'center' },
  empty: { alignItems: 'center', padding: 40, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Theme.text },
  emptyText: { fontSize: 13, color: Theme.textMuted, textAlign: 'center' },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Theme.background, padding: 14, borderRadius: Theme.radiusMd, borderWidth: 1, borderColor: Theme.inputBorder },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txnLabel: { fontSize: 13, fontWeight: '600', color: Theme.text, textTransform: 'capitalize' },
  txnDesc: { fontSize: 10, color: Theme.textMuted, marginTop: 1 },
  txnDate: { fontSize: 10, color: Theme.textMuted, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  txnAmount: { fontSize: 14, fontWeight: '700', color: Theme.text },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  statusText: { fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },
});
