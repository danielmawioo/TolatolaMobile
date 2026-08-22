import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransporterDashboardData } from '@/src/hooks/useTransporterDashboardData';
import { TransporterOverviewTab } from '@/src/components/transporter/TransporterOverviewTab';
import { TransporterPaymentsTab } from '@/src/components/transporter/TransporterPaymentsTab';
import { TransporterWithdrawalsTab } from '@/src/components/transporter/TransporterWithdrawalsTab';
import { TransporterSubscriptionTab } from '@/src/components/transporter/TransporterSubscriptionTab';
import { TransporterProfileTab } from '@/src/components/transporter/TransporterProfileTab';
import { TransporterKycGate } from '@/src/components/transporter/TransporterKycGate';

const TABS = ['Deliveries', 'Payments', 'Withdrawals', 'Membership', 'Profile'] as const;

export default function TransporterDashboardScreen() {
  const { session, logout, isAuthenticated, setSession } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Deliveries');

  useEffect(() => {
    if (params.tab && TABS.includes(params.tab as any)) {
      setTab(params.tab as any);
    }
  }, [params.tab]);

  const {
    loading,
    setLoading,
    refreshing,
    transporter,
    setTransporter,
    transporterId,
    unreadNotifs,
    profileData,
    setProfileData,
    isUpdatingLocation,
    locationStatus,
    handleUpdateLocation,
    activeAssignments,
    completedAssignments,
    availableBalance,
    fetchData,
    onRefresh,
  } = useTransporterDashboardData(session);

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logout();
    router.replace('/(tabs)');
  };

  if (!isAuthenticated) return null;

  // KYC GATE
  if (!loading) {
    if (!transporter) {
      return (
        <TransporterKycGate
          status="missing"
          transporter={transporter}
          topInset={insets.top}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onLogout={handleLogout}
        />
      );
    }

    if (transporter.kyc_status === 'pending') {
      return (
        <TransporterKycGate
          status="pending"
          transporter={transporter}
          topInset={insets.top}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onLogout={handleLogout}
        />
      );
    }

    if (transporter.kyc_status === 'rejected') {
      return (
        <TransporterKycGate
          status="rejected"
          transporter={transporter}
          topInset={insets.top}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onLogout={handleLogout}
        />
      );
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.logoText}>TOLA.</Text>
          <Text style={styles.headerSubtitle}>{transporter?.vehicle_type || 'Transporter'} Driver</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.notifBtn} onPress={() => router.push('/(tabs)/notifications' as any)}>
            <FontAwesome name="bell" size={16} color={Theme.text} />
            {unreadNotifs > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadNotifs > 9 ? '9+' : unreadNotifs}</Text>
              </View>
            )}
          </Pressable>
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <FontAwesome name="sign-out" size={14} color={Theme.text} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Theme.primary} />
          <Text style={styles.loadingText}>Fetching data...</Text>
        </View>
      ) : (
        <>
          {tab === 'Deliveries' && (
            <TransporterOverviewTab
              transporterId={transporterId}
              accessToken={session?.access_token || ''}
              transporter={transporter}
              activeCount={activeAssignments.length}
              completedCount={completedAssignments.length}
              availableBalance={availableBalance}
              refreshing={refreshing}
              onRefresh={onRefresh}
              isUpdatingLocation={isUpdatingLocation}
              locationStatus={locationStatus}
              onUpdateLocation={handleUpdateLocation}
            />
          )}

          {tab === 'Payments' && (
            <TransporterPaymentsTab
              transporterId={transporterId}
              accessToken={session?.access_token || ''}
            />
          )}

          {tab === 'Withdrawals' && (
            <TransporterWithdrawalsTab
              transporterId={transporterId}
              accessToken={session?.access_token || ''}
              availableBalance={availableBalance}
            />
          )}

          {tab === 'Membership' && (
            <TransporterSubscriptionTab
              transporterId={transporterId}
              accessToken={session?.access_token || ''}
            />
          )}

          {tab === 'Profile' && (
            <TransporterProfileTab
              transporter={transporter}
              profileData={profileData}
              setProfileData={setProfileData}
              session={session}
              setSession={setSession}
              loading={loading}
              setLoading={setLoading}
              refreshing={refreshing}
              onRefresh={onRefresh}
              onTransporterUpdated={setTransporter}
              onCancelEdit={() => fetchData(true)}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Theme.background,
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBorder
  },
  headerLeft: { gap: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoText: { fontSize: 24, fontWeight: '900', color: Theme.primary, letterSpacing: -1 },
  headerSubtitle: { fontSize: 11, color: Theme.textSecondary, fontWeight: '600' },
  notifBtn: { position: 'relative', width: 36, height: 36, borderRadius: 18, backgroundColor: Theme.inputBg, alignItems: 'center', justifyContent: 'center' },
  notifBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Theme.background },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Theme.inputBorder, borderRadius: 6 },
  logoutText: { fontSize: 13, color: Theme.text, fontWeight: '500' },

  tabScroll: { backgroundColor: Theme.background, maxHeight: 48, borderBottomWidth: 1, borderBottomColor: Theme.inputBorder },
  tabRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: Theme.primary },
  tabText: { fontSize: 14, color: Theme.textSecondary, fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: Theme.textMuted },
});
