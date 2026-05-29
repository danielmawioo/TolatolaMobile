import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Share,
  Linking,
  Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';
import { apiGet, apiPost } from '@/src/services/api';

const TABS = ['Overview', 'Registrations', 'Wallet', 'Performance', 'Profile'] as const;

export default function AgentDashboardScreen() {
  const { session, logout, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Wallet and withdrawal states
  const [walletStats, setWalletStats] = useState<any>({
    lifetimeEarnings: 0,
    pendingBalance: 0,
    withdrawableBalance: 0,
    paidBalance: 0,
    commissions: [],
    withdrawals: [],
  });
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('m-pesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'earnings' | 'payouts'>('earnings');

  // Referral link states
  const [referralLink, setReferralLink] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Loaded database states
  const [agentProfile, setAgentProfile] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'vendor' | 'customer' | 'transporter'>('all');
  const [perfPeriod, setPerfPeriod] = useState<'week' | 'month' | 'year'>('month');

  // Format TZS Currency
  const formatTzs = (amount: any) => {
    const num = Number(amount || 0);
    return `TZS ${num.toLocaleString()}`;
  };

  const fetchData = useCallback(
    async (silent = false) => {
      if (!session?.access_token) return;
      if (!silent) setLoading(true);
      try {
        const [roleRes, dashRes, regsRes, commsRes, refRes, walletRes] = await Promise.all([
          apiGet<any>('/agents/my-role', session.access_token).catch(() => null),
          apiGet<any>('/agents/dashboard', session.access_token).catch(() => null),
          apiGet<any>('/agents/registrations', session.access_token).catch(() => ({ data: [] })),
          apiGet<any>('/agents/commissions', session.access_token).catch(() => ({ data: [] })),
          apiGet<any>('/agents/referral-link', session.access_token).catch(() => null),
          apiGet<any>('/agents/wallet', session.access_token).catch(() => null),
        ]);

        if (roleRes?.agent) {
          setAgentProfile(roleRes.agent);
        }
        if (dashRes) {
          setDashboardStats(dashRes);
        }
        setRegistrations(regsRes?.data || []);
        setCommissions(commsRes?.data || []);
        if (refRes?.referral_link) {
          setReferralLink(refRes.referral_link);
          setReferralCode(refRes.referral_code || '');
        }
        if (walletRes?.success && walletRes?.wallet) {
          setWalletStats(walletRes.wallet);
        } else {
          // Fallback calculations for stability
          const commsList = commsRes?.data || [];
          const lifetimeEarnings = commsList.reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0);
          const pendingBalance = commsList.filter((c: any) => c.status === 'pending').reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0);
          const paidBalance = commsList.filter((c: any) => c.status === 'paid').reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0);
          setWalletStats({
            lifetimeEarnings,
            pendingBalance,
            withdrawableBalance: Math.max(0, lifetimeEarnings - pendingBalance - paidBalance),
            paidBalance,
            commissions: commsList,
            withdrawals: [],
          });
        }

        // Fetch unread notification count
        try {
          const notifRes = await apiGet<any>('/notifications/unread-count', session.access_token);
          setUnreadNotifs(notifRes?.unread_count || 0);
        } catch {
          /* silent */
        }
      } catch (err) {
        console.error('[AGENT DASHBOARD] Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    },
    [session?.access_token]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData(true);
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  }, [fetchData]);

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logout();
    router.replace('/(tabs)');
  };

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
      console.error('Share failed:', err);
    }
  };

  const handleWhatsAppShare = () => {
    const link = referralLink || `https://tolatola.co/auth/sign-up?ref=${agentProfile?.agent_code || ''}`;
    const message = encodeURIComponent(`Hello! Register on TOLA using my referral link to get started: ${link}`);
    Linking.openURL(`https://api.whatsapp.com/send?text=${message}`);
  };

  if (!isAuthenticated) return null;

  // Filter registrations
  const filteredRegistrations = registrations.filter((reg) => {
    const matchesSearch =
      reg.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.phone?.includes(searchQuery) ||
      reg.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || reg.registration_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const commissionsSummary = dashboardStats?.commissionsSummary || {
    total: commissions.reduce((acc, c) => acc + Number(c.amount || 0), 0),
    pending: commissions.filter((c) => c.status === 'pending').reduce((acc, c) => acc + Number(c.amount || 0), 0),
    paid: commissions.filter((c) => c.status === 'paid').reduce((acc, c) => acc + Number(c.amount || 0), 0),
  };

  // Performance computations based on selected period
  const registrationsInPeriod = registrations.filter((reg) => {
    const date = new Date(reg.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (perfPeriod === 'week') return diffDays <= 7;
    if (perfPeriod === 'month') return diffDays <= 30;
    return diffDays <= 365;
  });

  const commissionsInPeriod = commissions.filter((comm) => {
    const date = new Date(comm.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (perfPeriod === 'week') return diffDays <= 7;
    if (perfPeriod === 'month') return diffDays <= 30;
    return diffDays <= 365;
  });

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
        session?.access_token
      );
      if (res?.success) {
        Alert.alert('Ombi Limepokelewa!', `Ombi lako la kutoa TZS ${amount.toLocaleString()} limepokelewa na linafanyiwa kazi.`);
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        setPhoneNumber('');
        fetchData(true);
      } else {
        Alert.alert('Ombi Imeshindikana', res?.error || 'Imeshindikana kutuma ombi. Jaribu tena.');
      }
    } catch (err: any) {
      console.error('[AGENT WITHDRAWAL]', err);
      Alert.alert('Hitilafu', err.message || 'Hitilafu imetokea. Jaribu tena baadae.');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.logoText}>TOLA.</Text>
          <Text style={styles.headerSubtitle}>
            {agentProfile?.agent_roles?.role_name || 'Sales Agent'} Portal
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            style={styles.notifBtn}
            onPress={() => router.push('/(tabs)/notifications' as any)}
          >
            <FontAwesome name="bell" size={16} color={Theme.text} />
            {unreadNotifs > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <FontAwesome name="sign-out" size={14} color={Theme.text} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      {/* Navigation Tab Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabRow}
      >
        {TABS.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Theme.primary} size="large" />
          <Text style={styles.loadingText}>Loading Dashboard Details...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.bodyContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />
          }
        >
          {/* TAB 1: OVERVIEW */}
          {tab === 'Overview' && (
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
                    {referralLink || `https://tolatola.co/auth/sign-up?ref=${agentProfile?.agent_code || '...'}`}
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
                <Pressable onPress={() => setTab('Registrations')}>
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
          )}

          {/* TAB 2: REGISTRATIONS */}
          {tab === 'Registrations' && (
            <View>
              {/* Search input bar */}
              <View style={styles.searchBar}>
                <FontAwesome name="search" size={16} color={Theme.textSecondary} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, phone or email..."
                  placeholderTextColor={Theme.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {/* Type Category Filter Segment */}
              <View style={styles.filterRow}>
                {(['all', 'vendor', 'transporter', 'customer'] as const).map((filter) => (
                  <Pressable
                    key={filter}
                    style={[styles.filterChip, typeFilter === filter && styles.filterChipActive]}
                    onPress={() => setTypeFilter(filter)}
                  >
                    <Text style={[styles.filterChipText, typeFilter === filter && styles.filterChipTextActive]}>
                      {filter}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Render list of registrations */}
              <View style={styles.cardWrapper}>
                {filteredRegistrations.length === 0 ? (
                  <Text style={styles.emptyText}>No registrations match your search criteria.</Text>
                ) : (
                  filteredRegistrations.map((reg) => (
                    <View key={reg.id} style={[styles.regRow, { paddingVertical: 14 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.regName}>{reg.full_name}</Text>
                        <Text style={styles.regContact}>Phone: {reg.phone}</Text>
                        {reg.email ? <Text style={styles.regContact}>Email: {reg.email}</Text> : null}
                        {reg.region ? <Text style={styles.regContact}>Location: {reg.region}, {reg.district}</Text> : null}
                        <Text style={styles.regDate}>Registered: {new Date(reg.created_at).toLocaleDateString()}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', height: 60 }}>
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
            </View>
          )}

          {/* TAB 3: WALLET */}
          {tab === 'Wallet' && (
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
                    onPress={() => {
                      setPhoneNumber(agentProfile?.users?.phone || '');
                      setShowWithdrawModal(true);
                    }}
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
                            <Text style={[styles.feeLabel, { color: '#e11d48' }]}>Makato (3.5%):</Text>
                            <Text style={[styles.feeVal, { color: '#e11d48' }]}>
                              -{formatTzs(Math.round(Number(withdrawAmount) * 0.035))}
                            </Text>
                          </View>
                          <View style={[styles.feeLine, { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, marginTop: 4 }]}>
                            <Text style={[styles.feeLabel, { fontWeight: 'bold', color: '#1e293b' }]}>Utapokea (Net):</Text>
                            <Text style={[styles.feeVal, { fontWeight: 'black', color: '#16a34a', fontSize: 13 }]}>
                              {formatTzs(Math.max(0, Number(withdrawAmount) - Math.round(Number(withdrawAmount) * 0.035)))}
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
          )}

          {/* TAB 4: PERFORMANCE */}
          {tab === 'Performance' && (
            <View>
              {/* Period Select Filter */}
              <View style={styles.filterRow}>
                {(['week', 'month', 'year'] as const).map((period) => (
                  <Pressable
                    key={period}
                    style={[styles.filterChip, perfPeriod === period && styles.filterChipActive, { flex: 1, alignItems: 'center' }]}
                    onPress={() => setPerfPeriod(period)}
                  >
                    <Text style={[styles.filterChipText, perfPeriod === period && styles.filterChipTextActive, { textTransform: 'capitalize' }]}>
                      {period}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Performance Stats Cards */}
              <View style={styles.cardWrapper}>
                <View style={styles.perfStatRow}>
                  <View style={styles.perfStatCol}>
                    <Text style={styles.perfStatVal}>{registrationsInPeriod.length}</Text>
                    <Text style={styles.perfStatLbl}>Registrations</Text>
                  </View>
                  <View style={styles.perfStatCol}>
                    <Text style={styles.perfStatVal}>
                      {formatTzs(commissionsInPeriod.reduce((acc, c) => acc + Number(c.amount || 0), 0))}
                    </Text>
                    <Text style={styles.perfStatLbl}>Commissions</Text>
                  </View>
                </View>

                {/* Conversion Breakdown details */}
                <View style={styles.perfDetailSection}>
                  <Text style={styles.perfDetailTitle}>Activity Breakdown</Text>
                  <View style={styles.perfBreakdownRow}>
                    <Text style={styles.perfBreakdownLabel}>Shops Registered</Text>
                    <Text style={styles.perfBreakdownValue}>
                      {registrationsInPeriod.filter((r) => r.registration_type === 'vendor').length}
                    </Text>
                  </View>
                  <View style={styles.perfBreakdownRow}>
                    <Text style={styles.perfBreakdownLabel}>Transporters Registered</Text>
                    <Text style={styles.perfBreakdownValue}>
                      {registrationsInPeriod.filter((r) => r.registration_type === 'transporter').length}
                    </Text>
                  </View>
                  <View style={styles.perfBreakdownRow}>
                    <Text style={styles.perfBreakdownLabel}>Customers Referred</Text>
                    <Text style={styles.perfBreakdownValue}>
                      {registrationsInPeriod.filter((r) => r.registration_type === 'customer').length}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* TAB 5: PROFILE */}
          {tab === 'Profile' && (
            <View>
              <View style={styles.profileSection}>
                {/* Agent Avatar Badge */}
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>
                    {agentProfile?.users?.full_name?.charAt(0) || 'A'}
                  </Text>
                </View>

                <Text style={styles.profileName}>{agentProfile?.users?.full_name || 'Agent'}</Text>
                <Text style={styles.profileCode}>{agentProfile?.agent_code || 'TOLA-AG-XXXX'}</Text>
                
                {/* Agent Detail Information Grid */}
                <View style={styles.profileInfoCard}>
                  <View style={styles.profileInfoRow}>
                    <Text style={styles.profileInfoLabel}>Email:</Text>
                    <Text style={styles.profileInfoValue}>{agentProfile?.users?.email || 'N/A'}</Text>
                  </View>
                  <View style={styles.profileInfoRow}>
                    <Text style={styles.profileInfoLabel}>Phone:</Text>
                    <Text style={styles.profileInfoValue}>{agentProfile?.phone || agentProfile?.users?.phone || 'N/A'}</Text>
                  </View>
                  <View style={styles.profileInfoRow}>
                    <Text style={styles.profileInfoLabel}>Territory:</Text>
                    <Text style={styles.profileInfoValue}>
                      {agentProfile?.area ? `${agentProfile.area}, ` : ''}
                      {agentProfile?.district ? `${agentProfile.district}, ` : ''}
                      {agentProfile?.region || 'Tanzania'}
                    </Text>
                  </View>
                  <View style={styles.profileInfoRow}>
                    <Text style={styles.profileInfoLabel}>Registered On:</Text>
                    <Text style={styles.profileInfoValue}>
                      {agentProfile?.created_at ? new Date(agentProfile.created_at).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={styles.profileLogoutBtn}
                  onPress={handleLogout}
                >
                  <FontAwesome name="sign-out" size={16} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.profileLogoutBtnText}>Log Out Account</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      )}


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Theme.background,
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBorder,
  },
  headerLeft: {
    gap: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: Theme.primary,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Theme.textSecondary,
    fontWeight: '600',
  },
  notifBtn: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Theme.background,
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    borderRadius: 6,
  },
  logoutText: {
    fontSize: 13,
    color: Theme.text,
    fontWeight: '500',
  },
  tabScroll: {
    backgroundColor: Theme.background,
    maxHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBorder,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Theme.primary,
  },
  tabText: {
    fontSize: 14,
    color: Theme.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 48,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: Theme.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  agentOverviewHeader: {
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.text,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: Theme.textSecondary,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },
  statCard: {
    width: '48%',
    backgroundColor: Theme.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    gap: 6,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '900',
    color: Theme.text,
  },
  statLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.textMuted,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.text,
    marginBottom: 12,
    marginTop: 8,
  },
  quickActionsContainer: {
    backgroundColor: Theme.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    paddingVertical: 4,
    marginBottom: 22,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.backgroundSecondary,
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.text,
  },
  actionDesc: {
    fontSize: 11,
    color: Theme.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllLink: {
    color: Theme.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  cardWrapper: {
    backgroundColor: Theme.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    padding: 16,
    marginBottom: 22,
  },
  emptyText: {
    textAlign: 'center',
    color: Theme.textMuted,
    fontSize: 12,
    paddingVertical: 16,
  },
  regRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBorder,
  },
  regInfo: {
    flex: 1,
  },
  regName: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.text,
  },
  regDate: {
    fontSize: 11,
    color: Theme.textMuted,
    marginTop: 2,
  },
  regContact: {
    fontSize: 12,
    color: Theme.textSecondary,
    marginTop: 2,
  },
  regRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeVendor: {
    backgroundColor: '#dcfce7',
  },
  badgeCustomer: {
    backgroundColor: '#dbeafe',
  },
  badgeTransporter: {
    backgroundColor: '#ede9fe',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'capitalize',
    color: Theme.text,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusActive: {
    color: '#10b981',
  },
  statusPending: {
    color: '#f59e0b',
  },
  guidelinesCard: {
    backgroundColor: Theme.primary + '08',
    borderColor: Theme.primary + '20',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 10,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  guideText: {
    fontSize: 12,
    color: Theme.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.background,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    borderRadius: Theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Theme.text,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Theme.background,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  filterChipActive: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: Theme.textSecondary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  commStatsGrid: {
    gap: 10,
    marginBottom: 20,
  },
  commStatCard: {
    backgroundColor: Theme.background,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  commStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  commStatValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Theme.text,
  },
  commRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBorder,
  },
  commRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.text,
  },
  commRowDate: {
    fontSize: 11,
    color: Theme.textMuted,
    marginTop: 2,
  },
  commRowType: {
    fontSize: 10,
    color: Theme.textSecondary,
    textTransform: 'capitalize',
    marginTop: 4,
  },
  commRowAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#10b981',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgePaid: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeApproved: {
    backgroundColor: '#ccfbf1',
  },
  statusBadgePending: {
    backgroundColor: '#fef3c7',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: Theme.text,
  },
  perfStatRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  perfStatCol: {
    flex: 1,
    backgroundColor: Theme.backgroundSecondary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    gap: 4,
  },
  perfStatVal: {
    fontSize: 18,
    fontWeight: '900',
    color: Theme.text,
  },
  perfStatLbl: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.textSecondary,
  },
  perfDetailSection: {
    marginTop: 10,
  },
  perfDetailTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.text,
    marginBottom: 12,
  },
  perfBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.backgroundSecondary,
  },
  perfBreakdownLabel: {
    fontSize: 12,
    color: Theme.textSecondary,
    fontWeight: '500',
  },
  perfBreakdownValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.text,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.text,
  },
  profileCode: {
    fontSize: 12,
    color: Theme.textSecondary,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  profileInfoCard: {
    backgroundColor: Theme.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    width: '100%',
    padding: 16,
    marginTop: 24,
    gap: 12,
  },
  profileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBg,
  },
  profileInfoLabel: {
    fontSize: 12,
    color: Theme.textMuted,
    fontWeight: '600',
  },
  profileInfoValue: {
    fontSize: 12,
    color: Theme.text,
    fontWeight: '700',
  },
  profileLogoutBtn: {
    flexDirection: 'row',
    backgroundColor: '#dc2626',
    borderRadius: 10,
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  profileLogoutBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  referralCard: {
    backgroundColor: Theme.background,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  referralBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
    marginBottom: 12,
  },
  referralBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16a34a',
    textTransform: 'uppercase',
  },
  referralHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.text,
    marginBottom: 6,
  },
  referralDesc: {
    fontSize: 12,
    color: Theme.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  referralLinkBox: {
    backgroundColor: Theme.backgroundSecondary,
    borderColor: Theme.inputBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  referralLinkText: {
    fontSize: 12,
    color: Theme.textSecondary,
    fontWeight: '500',
  },
  referralActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  referralCopyBtn: {
    flex: 1.2,
    flexDirection: 'row',
    backgroundColor: Theme.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  referralCopyBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  referralWhatsAppBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  referralWhatsAppBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  referralShareBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderColor: Theme.primary,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumCard: {
    backgroundColor: '#0f766e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ccfbf1',
    letterSpacing: 1.5,
  },
  cardBalanceText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 6,
    letterSpacing: -0.5,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNumberText: {
    fontSize: 11,
    color: '#ffffff',
    letterSpacing: 2,
    opacity: 0.9,
  },
  cardSubText: {
    fontSize: 9,
    color: '#99f6e4',
    marginTop: 2,
    fontWeight: '600',
  },
  cardWithdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardWithdrawBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#042f1a',
  },
  historyToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  historyToggleTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  historyToggleTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  historyToggleTextActive: {
    color: '#047857',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalSubTitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  operatorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  operatorChip: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  operatorChipActive: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
    borderWidth: 2,
  },
  operatorChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  operatorChipTextActive: {
    color: '#047857',
    fontWeight: '800',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '700',
    marginBottom: 16,
    backgroundColor: '#f8fafc',
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  quickChip: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  feesCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  feeLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  feeLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  feeVal: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '700',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
