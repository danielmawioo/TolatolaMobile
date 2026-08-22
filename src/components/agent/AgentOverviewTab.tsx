import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Share, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';
import { formatTzs } from '@/src/lib/currency';
import { logger } from '@/src/lib/logger';

interface Props {
  agentProfile: any;
  dashboardStats: any;
  registrations: any[];
  commissions: any[];
  referralLink: string;
  onSeeAllRegistrations: () => void;
}

export function AgentOverviewTab({
  agentProfile,
  dashboardStats,
  registrations,
  commissions,
  referralLink,
  onSeeAllRegistrations,
}: Props) {
  const [copied, setCopied] = useState(false);

  const commissionsSummary = dashboardStats?.commissionsSummary || {
    total: commissions.reduce((acc, c) => acc + Number(c.amount || 0), 0),
    pending: commissions.filter((c) => c.status === 'pending').reduce((acc, c) => acc + Number(c.amount || 0), 0),
    paid: commissions.filter((c) => c.status === 'paid').reduce((acc, c) => acc + Number(c.amount || 0), 0),
  };

  const linkOrDefault = referralLink || `https://tolatola.co/auth/sign-up?ref=${agentProfile?.agent_code || '...'}`;

  const handleCopyLink = async () => {
    const link = referralLink || `https://tolatola.co/auth/sign-up?ref=${agentProfile?.agent_code || ''}`;
    await Clipboard.setStringAsync(link);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = async () => {
    const link = referralLink || `https://tolatola.co/auth/sign-up?ref=${agentProfile?.agent_code || ''}`;
    try {
      await Share.share({
        message: `Hello! Register on TOLA using my referral link to get started: ${link}`,
      });
    } catch (err) {
      logger.error('Share failed:', err);
    }
  };

  const handleWhatsAppShare = () => {
    const link = referralLink || `https://tolatola.co/auth/sign-up?ref=${agentProfile?.agent_code || ''}`;
    const message = encodeURIComponent(`Hello! Register on TOLA using my referral link to get started: ${link}`);
    Linking.openURL(`https://api.whatsapp.com/send?text=${message}`);
  };

  return (
    <View>
      {/* Agent Greeting Header */}
      <View style={styles.agentOverviewHeader}>
        <Text style={styles.welcomeTitle}>
          Karibu, {agentProfile?.users?.full_name || 'Agent'}
        </Text>
        <Text style={styles.welcomeSubtitle}>
          Track your sales performance and grow your referral network.
        </Text>
      </View>

      {/* Quick KPI stats row */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#dcfce7' }]}>
            <FontAwesome name="users" size={14} color="#16a34a" />
          </View>
          <Text style={styles.statVal}>
            {dashboardStats?.overview?.totalRegistrations ?? registrations.length}
          </Text>
          <Text style={styles.statLbl}>Total Regs</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
            <FontAwesome name="check-circle" size={14} color="#2563eb" />
          </View>
          <Text style={styles.statVal}>
            {dashboardStats?.overview?.activeUsers ?? registrations.filter(r => r.status === 'active').length}
          </Text>
          <Text style={styles.statLbl}>Active</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}>
            <FontAwesome name="clock-o" size={14} color="#d97706" />
          </View>
          <Text style={styles.statVal}>
            {registrations.filter(r => r.status === 'pending').length}
          </Text>
          <Text style={styles.statLbl}>Pending</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#ede9fe' }]}>
            <FontAwesome name="money" size={14} color="#7c3aed" />
          </View>
          <Text style={styles.statVal}>
            {formatTzs(commissionsSummary.total)}
          </Text>
          <Text style={styles.statLbl}>Earned</Text>
        </View>
      </View>

      {/* Referral Link Card */}
      <Text style={styles.sectionTitle}>Your Referral Link</Text>
      <View style={styles.referralCard}>
        <View style={styles.referralBadge}>
          <FontAwesome name="gift" size={12} color="#16a34a" />
          <Text style={styles.referralBadgeText}>Refer & Earn Commission</Text>
        </View>
        <Text style={styles.referralHeading}>
          Invite Customers, Vendors & Transporters
        </Text>
        <Text style={styles.referralDesc}>
          Share your unique referral link. When they sign up, they are automatically added to your dashboard and you earn commissions.
        </Text>

        <View style={styles.referralLinkBox}>
          <Text style={styles.referralLinkText} numberOfLines={1}>
            {linkOrDefault}
          </Text>
        </View>

        <View style={styles.referralActions}>
          <Pressable style={styles.referralCopyBtn} onPress={handleCopyLink}>
            <FontAwesome name={copied ? 'check' : 'copy'} size={14} color="#fff" />
            <Text style={styles.referralCopyBtnText}>
              {copied ? 'Copied!' : 'Copy Link'}
            </Text>
          </Pressable>
          <Pressable style={styles.referralWhatsAppBtn} onPress={handleWhatsAppShare}>
            <FontAwesome name="whatsapp" size={16} color="#fff" />
            <Text style={styles.referralWhatsAppBtnText}>WhatsApp</Text>
          </Pressable>
          <Pressable style={styles.referralShareBtn} onPress={handleShareLink}>
            <FontAwesome name="share-alt" size={14} color={Theme.primary} />
          </Pressable>
        </View>
      </View>

      {/* Recent registrations preview */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <Pressable onPress={onSeeAllRegistrations}>
          <Text style={styles.seeAllLink}>See All</Text>
        </Pressable>
      </View>

      <View style={styles.cardWrapper}>
        {registrations.length === 0 ? (
          <Text style={styles.emptyText}>No recent registrations found.</Text>
        ) : (
          registrations.slice(0, 5).map((reg) => (
            <View key={reg.id} style={styles.regRow}>
              <View style={styles.regInfo}>
                <Text style={styles.regName}>{reg.full_name}</Text>
                <Text style={styles.regDate}>
                  {new Date(reg.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.regRight}>
                <View style={[styles.badge, reg.registration_type === 'vendor' ? styles.badgeVendor : reg.registration_type === 'customer' ? styles.badgeCustomer : styles.badgeTransporter]}>
                  <Text style={styles.badgeText}>{reg.registration_type}</Text>
                </View>
                <Text style={[styles.statusText, reg.status === 'active' ? styles.statusActive : styles.statusPending]}>
                  {reg.status}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Commission Guidelines info card */}
      <Text style={styles.sectionTitle}>Commission Policy</Text>
      <View style={styles.guidelinesCard}>
        <View style={styles.guideRow}>
          <FontAwesome name="circle" size={8} color={Theme.primary} style={{ marginRight: 8, marginTop: 4 }} />
          <Text style={styles.guideText}>Shops/Vendors give high, premium commission rewards once approved.</Text>
        </View>
        <View style={styles.guideRow}>
          <FontAwesome name="circle" size={8} color={Theme.primary} style={{ marginRight: 8, marginTop: 4 }} />
          <Text style={styles.guideText}>Transporters earn medium tier commission rates.</Text>
        </View>
        <View style={styles.guideRow}>
          <FontAwesome name="circle" size={8} color={Theme.primary} style={{ marginRight: 8, marginTop: 4 }} />
          <Text style={styles.guideText}>Customers award basic referral bonuses upon their first purchase.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  agentOverviewHeader: { marginBottom: 20 },
  welcomeTitle: { fontSize: 22, fontWeight: '800', color: Theme.text, marginBottom: 4 },
  welcomeSubtitle: { fontSize: 13, color: Theme.textSecondary, lineHeight: 18 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  statCard: { width: '48%', backgroundColor: Theme.background, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Theme.inputBorder, gap: 6 },
  statIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statVal: { fontSize: 16, fontWeight: '900', color: Theme.text },
  statLbl: { fontSize: 10, fontWeight: '700', color: Theme.textMuted, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Theme.text, marginBottom: 12, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seeAllLink: { color: Theme.primary, fontSize: 13, fontWeight: '700' },
  cardWrapper: { backgroundColor: Theme.background, borderRadius: 12, borderWidth: 1, borderColor: Theme.inputBorder, padding: 16, marginBottom: 22 },
  emptyText: { textAlign: 'center', color: Theme.textMuted, fontSize: 12, paddingVertical: 16 },
  regRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Theme.inputBorder },
  regInfo: { flex: 1 },
  regName: { fontSize: 14, fontWeight: '700', color: Theme.text },
  regDate: { fontSize: 11, color: Theme.textMuted, marginTop: 2 },
  regRight: { alignItems: 'flex-end', gap: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeVendor: { backgroundColor: '#dcfce7' },
  badgeCustomer: { backgroundColor: '#dbeafe' },
  badgeTransporter: { backgroundColor: '#ede9fe' },
  badgeText: { fontSize: 9, fontWeight: '700', textTransform: 'capitalize', color: Theme.text },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  statusActive: { color: '#10b981' },
  statusPending: { color: '#f59e0b' },
  guidelinesCard: { backgroundColor: Theme.primary + '08', borderColor: Theme.primary + '20', borderWidth: 1, borderRadius: 12, padding: 16, gap: 12, marginBottom: 10 },
  guideRow: { flexDirection: 'row', alignItems: 'flex-start' },
  guideText: { fontSize: 12, color: Theme.textSecondary, lineHeight: 18, flex: 1 },
  referralCard: {
    backgroundColor: Theme.background, borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  referralBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0',
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, gap: 6, marginBottom: 12,
  },
  referralBadgeText: { fontSize: 10, fontWeight: '800', color: '#16a34a', textTransform: 'uppercase' },
  referralHeading: { fontSize: 16, fontWeight: '800', color: Theme.text, marginBottom: 6 },
  referralDesc: { fontSize: 12, color: Theme.textSecondary, lineHeight: 18, marginBottom: 16 },
  referralLinkBox: { backgroundColor: Theme.backgroundSecondary, borderColor: Theme.inputBorder, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  referralLinkText: { fontSize: 12, color: Theme.textSecondary, fontWeight: '500' },
  referralActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  referralCopyBtn: {
    flex: 1.2, flexDirection: 'row', backgroundColor: Theme.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowColor: Theme.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2,
  },
  referralCopyBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  referralWhatsAppBtn: {
    flex: 1, flexDirection: 'row', backgroundColor: '#25D366', borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowColor: '#25D366', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2,
  },
  referralWhatsAppBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  referralShareBtn: { width: 44, height: 44, borderRadius: 12, borderColor: Theme.primary, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
