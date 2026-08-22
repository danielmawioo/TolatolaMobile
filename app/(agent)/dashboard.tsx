import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';
import { useAgentDashboardData } from '@/src/hooks/useAgentDashboardData';
import { AgentOverviewTab } from '@/src/components/agent/AgentOverviewTab';
import { AgentRegistrationsTab } from '@/src/components/agent/AgentRegistrationsTab';
import { AgentWalletTab } from '@/src/components/agent/AgentWalletTab';
import { AgentPerformanceTab } from '@/src/components/agent/AgentPerformanceTab';
import { AgentProfileTab } from '@/src/components/agent/AgentProfileTab';

const TABS = ['Overview', 'Registrations', 'Wallet', 'Performance', 'Profile'] as const;

export default function AgentDashboardScreen() {
  const { session, logout, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');

  const {
    loading,
    refreshing,
    walletStats,
    agentProfile,
    dashboardStats,
    registrations,
    commissions,
    unreadNotifs,
    referralLink,
    fetchData,
    onRefresh,
  } = useAgentDashboardData(session?.access_token);

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logout();
    router.replace('/(tabs)');
  };

  if (!isAuthenticated) return null;

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
          {tab === 'Overview' && (
            <AgentOverviewTab
              agentProfile={agentProfile}
              dashboardStats={dashboardStats}
              registrations={registrations}
              commissions={commissions}
              referralLink={referralLink}
              onSeeAllRegistrations={() => setTab('Registrations')}
            />
          )}

          {tab === 'Registrations' && <AgentRegistrationsTab registrations={registrations} />}

          {tab === 'Wallet' && (
            <AgentWalletTab
              walletStats={walletStats}
              accessToken={session?.access_token}
              agentPhone={agentProfile?.users?.phone}
              onWithdrawSuccess={() => fetchData(true)}
            />
          )}

          {tab === 'Performance' && (
            <AgentPerformanceTab registrations={registrations} commissions={commissions} />
          )}

          {tab === 'Profile' && <AgentProfileTab agentProfile={agentProfile} onLogout={handleLogout} />}
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
});
