import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { apiPost } from '@/src/services/api';
import { formatTzs } from '@/src/lib/currency';
import { logger } from '@/src/lib/logger';

interface Props {
  walletStats: any;
  accessToken: string | null | undefined;
  agentPhone?: string;
  onWithdrawSuccess: () => void;
}

export function AgentWalletTab({ walletStats, accessToken, agentPhone, onWithdrawSuccess }: Props) {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('m-pesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'earnings' | 'payouts'>('earnings');

  const handleOpenWithdraw = () => {
    setPhoneNumber(agentPhone || '');
    setShowWithdrawModal(true);
  };

  const handleWithdrawalRequest = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      Alert.alert('Kosa', 'Tafadhali weka kiasi sahihi cha kutoa.');
      return;
    }
    if (amount > (walletStats?.withdrawableBalance || 0)) {
      Alert.alert('Kosa', 'Salio lako la kutoa halitoshi.');
      return;
    }
    if (!phoneNumber || phoneNumber.trim().length < 9) {
      Alert.alert('Kosa', 'Tafadhali weka namba sahihi ya simu ya kupokelea.');
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      const res = await apiPost<any>(
        '/agents/withdrawals/request',
        {
          amount,
          paymentMethod,
          paymentDetails: phoneNumber,
        },
        accessToken
      );
      if (res?.success) {
        Alert.alert('Ombi Limepokelewa!', `Ombi lako la kutoa TZS ${amount.toLocaleString()} limepokelewa na linafanyiwa kazi.`);
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        setPhoneNumber('');
        onWithdrawSuccess();
      } else {
        Alert.alert('Ombi Imeshindikana', res?.error || 'Imeshindikana kutuma ombi. Jaribu tena.');
      }
    } catch (err: any) {
      logger.error('[AGENT WITHDRAWAL]', err);
      Alert.alert('Hitilafu', err.message || 'Hitilafu imetokea. Jaribu tena baadae.');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  return (
    <View style={{ paddingBottom: 24 }}>
      {/* Premium Gradient Card Container */}
      <View style={styles.premiumCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={styles.cardHeaderLabel}>SALIO LA WALLET</Text>
            <Text style={styles.cardBalanceText}>
              {formatTzs(walletStats?.withdrawableBalance ?? 0)}
            </Text>
          </View>
          <View style={styles.cardIconBox}>
            <FontAwesome name="credit-card" size={18} color="#2dd4bf" />
          </View>
        </View>

        <View style={{ marginTop: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.cardNumberText}>**** **** **** AGENT</Text>
            <Text style={styles.cardSubText}>Tola Agent Account</Text>
          </View>
          <Pressable
            style={[
              styles.cardWithdrawBtn,
              (walletStats?.withdrawableBalance || 0) <= 0 && { opacity: 0.5 }
            ]}
            disabled={(walletStats?.withdrawableBalance || 0) <= 0}
            onPress={handleOpenWithdraw}
          >
            <Text style={styles.cardWithdrawBtnText}>Kutoa Salio</Text>
            <FontAwesome name="arrow-right" size={10} color="#042f1a" style={{ marginLeft: 6 }} />
          </Pressable>
        </View>
      </View>

      {/* Financial KPI Row */}
      <View style={styles.commStatsGrid}>
        <View style={[styles.commStatCard, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
          <Text style={styles.commStatLabel}>Lifetime Earnings</Text>
          <Text style={styles.commStatValue}>{formatTzs(walletStats?.lifetimeEarnings ?? 0)}</Text>
        </View>
        <View style={[styles.commStatCard, { borderLeftColor: '#f59e0b', borderLeftWidth: 4 }]}>
          <Text style={styles.commStatLabel}>Pending Approval</Text>
          <Text style={styles.commStatValue}>{formatTzs(walletStats?.pendingBalance ?? 0)}</Text>
        </View>
        <View style={[styles.commStatCard, { borderLeftColor: '#06b6d4', borderLeftWidth: 4 }]}>
          <Text style={styles.commStatLabel}>Paid out</Text>
          <Text style={styles.commStatValue}>{formatTzs(walletStats?.paidBalance ?? 0)}</Text>
        </View>
      </View>

      {/* Custom History Toggle Switch */}
      <View style={styles.historyToggleRow}>
        <Pressable
          style={[styles.historyToggleTab, activeHistoryTab === 'earnings' && styles.historyToggleTabActive]}
          onPress={() => setActiveHistoryTab('earnings')}
        >
          <Text style={[styles.historyToggleText, activeHistoryTab === 'earnings' && styles.historyToggleTextActive]}>
            Kamisheni Zilizopokelewa
          </Text>
        </Pressable>
        <Pressable
          style={[styles.historyToggleTab, activeHistoryTab === 'payouts' && styles.historyToggleTabActive]}
          onPress={() => setActiveHistoryTab('payouts')}
        >
          <Text style={[styles.historyToggleText, activeHistoryTab === 'payouts' && styles.historyToggleTextActive]}>
            Utoaji Fedha (Payouts)
          </Text>
        </Pressable>
      </View>

      {/* History Lists */}
      {activeHistoryTab === 'earnings' ? (
        /* Commissions List */
        <View style={styles.cardWrapper}>
          {(walletStats?.commissions || []).length === 0 ? (
            <Text style={styles.emptyText}>Hujapata kamisheni yoyote bado.</Text>
          ) : (
            (walletStats.commissions).map((comm: any) => (
              <View key={comm.id} style={styles.commRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.commRowTitle}>
                    {comm.agent_registrations
                      ? `Usajili: ${comm.agent_registrations.full_name}`
                      : comm.description || 'Bonus / Adjustment'}
                  </Text>
                  <Text style={styles.commRowDate}>
                    {new Date(comm.created_at).toLocaleDateString()}
                  </Text>
                  <Text style={styles.commRowType}>{comm.commission_type}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Text style={[styles.commRowAmount, { color: '#16a34a' }]}>+{formatTzs(comm.amount)}</Text>
                  <View style={[styles.statusBadge, comm.status === 'paid' ? styles.statusBadgePaid : comm.status === 'approved' ? styles.statusBadgeApproved : styles.statusBadgePending]}>
                    <Text style={styles.statusBadgeText}>
                      {comm.status === 'pending' ? 'inasubiri' : comm.status === 'approved' ? 'imeidhinishwa' : comm.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      ) : (
        /* Withdrawals List */
        <View style={styles.cardWrapper}>
          {(walletStats?.withdrawals || []).length === 0 ? (
            <Text style={styles.emptyText}>Hujafanya muamala wa kutoa salio bado.</Text>
          ) : (
            (walletStats.withdrawals).map((wdraw: any) => (
              <View key={wdraw.id} style={styles.commRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.commRowTitle, { textTransform: 'uppercase' }]}>
                    {wdraw.payment_method}
                  </Text>
                  <Text style={styles.commRowDate}>
                    {new Date(wdraw.created_at).toLocaleDateString()}
                  </Text>
                  <Text style={[styles.commRowType, { fontFamily: 'monospace' }]}>
                    {wdraw.payment_details?.phoneNumber || 'M-Money'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Text style={styles.commRowAmount}>{formatTzs(wdraw.amount)}</Text>
                  <Text style={{ fontSize: 9, color: '#f43f5e', fontWeight: 'bold' }}>
                    Ada: -{formatTzs(wdraw.service_fee)}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    wdraw.status === 'paid' ? styles.statusBadgePaid :
                    wdraw.status === 'processing' ? { backgroundColor: '#dbeafe' } :
                    wdraw.status === 'pending' ? styles.statusBadgePending :
                    { backgroundColor: '#ffe4e6' }
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      wdraw.status === 'processing' ? { color: '#2563eb' } :
                      wdraw.status === 'failed' || wdraw.status === 'rejected' ? { color: '#e11d48' } : {}
                    ]}>
                      {wdraw.status === 'pending' ? 'inasubiri' : wdraw.status === 'processing' ? 'inatumwa' : wdraw.status === 'paid' ? 'imelipwa' : wdraw.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Secure Mobile Money Withdrawal Modal Popup */}
      <Modal
        visible={showWithdrawModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Kutoa Salio</Text>
                <Text style={styles.modalSubTitle}>
                  Salio la Kutoa: {formatTzs(walletStats?.withdrawableBalance ?? 0)}
                </Text>
              </View>
              <Pressable style={styles.modalCloseBtn} onPress={() => setShowWithdrawModal(false)}>
                <FontAwesome name="times" size={16} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              {/* Operator selection */}
              <Text style={styles.inputLabel}>Mtoa Huduma wa Simu</Text>
              <View style={styles.operatorRow}>
                {[
                  { id: 'm-pesa', name: 'M-Pesa' },
                  { id: 'tigo-pesa', name: 'Tigo Pesa' },
                  { id: 'airtel-money', name: 'Airtel Money' },
                  { id: 'halopesa', name: 'Halopesa' },
                ].map((op) => (
                  <Pressable
                    key={op.id}
                    style={[styles.operatorChip, paymentMethod === op.id && styles.operatorChipActive]}
                    onPress={() => setPaymentMethod(op.id)}
                  >
                    <Text style={[styles.operatorChipText, paymentMethod === op.id && styles.operatorChipTextActive]}>
                      {op.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Recipient phone */}
              <Text style={styles.inputLabel}>Namba ya Kupokea Fedha</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Mfano: 0754123456"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />

              {/* Amount */}
              <Text style={styles.inputLabel}>Kiasi cha Kutoa (TZS)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Mfano: 10000"
                keyboardType="number-pad"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
              />

              {/* Quick Chips Percentages */}
              <View style={styles.quickChipsRow}>
                {[0.25, 0.5, 0.75, 1.0].map((p) => {
                  const label = p === 1.0 ? 'Salio Lote' : `${p * 100}%`;
                  return (
                    <Pressable
                      key={p}
                      style={styles.quickChip}
                      onPress={() => {
                        const balance = walletStats?.withdrawableBalance || 0;
                        const calculated = Math.floor(balance * p);
                        setWithdrawAmount(calculated.toString());
                      }}
                    >
                      <Text style={styles.quickChipText}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Fees calculation card */}
              {withdrawAmount && Number(withdrawAmount) > 0 ? (
                <View style={styles.feesCard}>
                  <View style={styles.feeLine}>
                    <Text style={styles.feeLabel}>Kiasi cha Kutoa:</Text>
                    <Text style={styles.feeVal}>{formatTzs(Number(withdrawAmount))}</Text>
                  </View>
                  <View style={styles.feeLine}>
                    <Text style={[styles.feeLabel, { color: '#e11d48' }]}>Makato (10%):</Text>
                    <Text style={[styles.feeVal, { color: '#e11d48' }]}>
                      -{formatTzs(Math.round(Number(withdrawAmount) * 0.10))}
                    </Text>
                  </View>
                  <View style={[styles.feeLine, { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, marginTop: 4 }]}>
                    <Text style={[styles.feeLabel, { fontWeight: 'bold', color: '#1e293b' }]}>Utapokea (Net):</Text>
                    <Text style={[styles.feeVal, { fontWeight: 'black', color: '#16a34a', fontSize: 13 }]}>
                      {formatTzs(Math.max(0, Number(withdrawAmount) - Math.round(Number(withdrawAmount) * 0.10)))}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Action buttons */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 40 }}>
                <Pressable style={styles.modalCancelBtn} onPress={() => setShowWithdrawModal(false)}>
                  <Text style={styles.modalCancelText}>Ghairi</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalConfirmBtn, isSubmittingWithdraw && { opacity: 0.7 }]}
                  disabled={isSubmittingWithdraw}
                  onPress={handleWithdrawalRequest}
                >
                  {isSubmittingWithdraw ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Thibitisha</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  premiumCard: {
    backgroundColor: '#0f766e', borderRadius: 16, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  cardHeaderLabel: { fontSize: 10, fontWeight: '800', color: '#ccfbf1', letterSpacing: 1.5 },
  cardBalanceText: { fontSize: 26, fontWeight: '900', color: '#ffffff', marginTop: 6, letterSpacing: -0.5 },
  cardIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.1)', alignItems: 'center', justifyContent: 'center' },
  cardNumberText: { fontSize: 11, color: '#ffffff', letterSpacing: 2, opacity: 0.9 },
  cardSubText: { fontSize: 9, color: '#99f6e4', marginTop: 2, fontWeight: '600' },
  cardWithdrawBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  cardWithdrawBtnText: { fontSize: 11, fontWeight: '800', color: '#042f1a' },
  commStatsGrid: { gap: 10, marginBottom: 20 },
  commStatCard: { backgroundColor: Theme.background, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: Theme.inputBorder },
  commStatLabel: { fontSize: 11, fontWeight: '700', color: Theme.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  commStatValue: { fontSize: 18, fontWeight: '900', color: Theme.text },
  historyToggleRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 16 },
  historyToggleTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  historyToggleTabActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  historyToggleText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  historyToggleTextActive: { color: '#047857' },
  cardWrapper: { backgroundColor: Theme.background, borderRadius: 12, borderWidth: 1, borderColor: Theme.inputBorder, padding: 16, marginBottom: 22 },
  emptyText: { textAlign: 'center', color: Theme.textMuted, fontSize: 12, paddingVertical: 16 },
  commRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Theme.inputBorder },
  commRowTitle: { fontSize: 13, fontWeight: '700', color: Theme.text },
  commRowDate: { fontSize: 11, color: Theme.textMuted, marginTop: 2 },
  commRowType: { fontSize: 10, color: Theme.textSecondary, textTransform: 'capitalize', marginTop: 4 },
  commRowAmount: { fontSize: 14, fontWeight: '900', color: '#10b981', marginBottom: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusBadgePaid: { backgroundColor: '#dcfce7' },
  statusBadgeApproved: { backgroundColor: '#ccfbf1' },
  statusBadgePending: { backgroundColor: '#fef3c7' },
  statusBadgeText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', color: Theme.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  modalSubTitle: { fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: '500' },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  inputLabel: { fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 6, textTransform: 'uppercase' },
  operatorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  operatorChip: { flex: 1, minWidth: '45%', paddingVertical: 12, paddingHorizontal: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  operatorChipActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5', borderWidth: 2 },
  operatorChipText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  operatorChipTextActive: { color: '#047857', fontWeight: '800' },
  formInput: {
    borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    color: '#1e293b', fontWeight: '700', marginBottom: 16, backgroundColor: '#f8fafc',
  },
  quickChipsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  quickChip: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  quickChipText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  feesCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  feeLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  feeLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  feeVal: { fontSize: 11, color: '#334155', fontWeight: '700' },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center' },
  modalCancelText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  modalConfirmBtn: { flex: 1, backgroundColor: '#059669', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalConfirmText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
});
