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
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';
import { apiGet } from '@/src/services/api';
import { RegisterUserModal } from '@/src/components/agent/RegisterUserModal';

const TABS = ['Overview', 'Registrations', 'Commissions', 'Performance', 'Profile'] as const;

export default function AgentDashboardScreen() {
  const { session, logout, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal control states
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerType, setRegisterType] = useState<'vendor' | 'customer' | 'transporter'>('vendor');

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
        const [roleRes, dashRes, regsRes, commsRes] = await Promise.all([
          apiGet<any>('/agents/my-role', session.access_token).catch(() => null),
          apiGet<any>('/agents/dashboard', session.access_token).catch(() => null),
          apiGet<any>('/agents/registrations', session.access_token).catch(() => ({ data: [] })),
          apiGet<any>('/agents/commissions', session.access_token).catch(() => ({ data: [] })),
        ]);

        if (roleRes?.agent) {
          setAgentProfile(roleRes.agent);
        }
        if (dashRes) {
          setDashboardStats(dashRes);
        }
        setRegistrations(regsRes?.data || []);
        setCommissions(commsRes?.data || []);

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

  const openRegisterModal = (type: 'vendor' | 'customer' | 'transporter') => {
    setRegisterType(type);
    setIsRegisterOpen(true);
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

              {/* Quick Actions Panel */}
              <Text style={styles.sectionTitle}>Register User</Text>
              <View style={styles.quickActionsContainer}>
                <Pressable
                  style={styles.actionCard}
                  onPress={() => openRegisterModal('vendor')}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: '#dcfce7' }]}>
                    <FontAwesome name="shopping-bag" size={18} color="#16a34a" />
                  </View>
                  <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>Register Vendor</Text>
                    <Text style={styles.actionDesc}>Add new shops or businesses</Text>
                  </View>
                  <FontAwesome name="chevron-right" size={12} color={Theme.textMuted} />
                </Pressable>

                <Pressable
                  style={styles.actionCard}
                  onPress={() => openRegisterModal('transporter')}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: '#ede9fe' }]}>
                    <FontAwesome name="truck" size={18} color="#7c3aed" />
                  </View>
                  <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>Register Transporter</Text>
                    <Text style={styles.actionDesc}>Add drivers and delivery fleets</Text>
                  </View>
                  <FontAwesome name="chevron-right" size={12} color={Theme.textMuted} />
                </Pressable>

                <Pressable
                  style={styles.actionCard}
                  onPress={() => openRegisterModal('customer')}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: '#dbeafe' }]}>
                    <FontAwesome name="user" size={18} color="#2563eb" />
                  </View>
                  <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>Register Customer</Text>
                    <Text style={styles.actionDesc}>Refer new retail shoppers</Text>
                  </View>
                  <FontAwesome name="chevron-right" size={12} color={Theme.textMuted} />
                </Pressable>
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

          {/* TAB 3: COMMISSIONS */}
          {tab === 'Commissions' && (
            <View>
              {/* Financial Stats cards */}
              <View style={styles.commStatsGrid}>
                <View style={[styles.commStatCard, { borderLeftColor: '#7c3aed', borderLeftWidth: 4 }]}>
                  <Text style={styles.commStatLabel}>Total Earned</Text>
                  <Text style={styles.commStatValue}>{formatTzs(commissionsSummary.total)}</Text>
                </View>
                <View style={[styles.commStatCard, { borderLeftColor: '#eab308', borderLeftWidth: 4 }]}>
                  <Text style={styles.commStatLabel}>Pending Approval</Text>
                  <Text style={styles.commStatValue}>{formatTzs(commissionsSummary.pending)}</Text>
                </View>
                <View style={[styles.commStatCard, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
                  <Text style={styles.commStatLabel}>Paid out</Text>
                  <Text style={styles.commStatValue}>{formatTzs(commissionsSummary.paid)}</Text>
                </View>
              </View>

              {/* Commissions history transactions */}
              <Text style={styles.sectionTitle}>Earnings History</Text>
              <View style={styles.cardWrapper}>
                {commissions.length === 0 ? (
                  <Text style={styles.emptyText}>You haven't earned any commissions yet.</Text>
                ) : (
                  commissions.map((comm) => (
                    <View key={comm.id} style={styles.commRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.commRowTitle}>
                          {comm.agent_registrations
                            ? `Registration: ${comm.agent_registrations.full_name}`
                            : comm.description || 'Bonus / Adjustment'}
                        </Text>
                        <Text style={styles.commRowDate}>
                          {new Date(comm.created_at).toLocaleDateString()}
                        </Text>
                        <Text style={styles.commRowType}>{comm.commission_type}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                        <Text style={styles.commRowAmount}>+{formatTzs(comm.amount)}</Text>
                        <View style={[styles.statusBadge, comm.status === 'paid' ? styles.statusBadgePaid : comm.status === 'approved' ? styles.statusBadgeApproved : styles.statusBadgePending]}>
                          <Text style={styles.statusBadgeText}>{comm.status}</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
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

      {/* Dedicated Modal for adding new registrants */}
      <RegisterUserModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        type={registerType}
        accessToken={session?.access_token || ''}
        onSuccess={() => fetchData(true)}
      />
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
});
