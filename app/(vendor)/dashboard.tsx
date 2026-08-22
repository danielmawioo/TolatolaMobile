import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import React, { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVendorDashboardData } from '@/src/hooks/useVendorDashboardData';
import { VendorOrdersTab } from '@/src/components/vendor/VendorOrdersTab';
import { VendorWalletTab } from '@/src/components/vendor/VendorWalletTab';
import { VendorSubscriptionTab } from '@/src/components/vendor/VendorSubscriptionTab';
import { VendorProductsTab } from '@/src/components/vendor/VendorProductsTab';
import { VendorShopSettingsTab } from '@/src/components/vendor/VendorShopSettingsTab';
import { VendorProfileTab } from '@/src/components/vendor/VendorProfileTab';
import { VendorOverviewHeader } from '@/src/components/vendor/VendorOverviewHeader';
import { VendorKycGate } from '@/src/components/vendor/VendorKycGate';

const TABS = ['Products', 'Orders', 'Wallet', 'Subscription', 'Shop', 'Profile'] as const;

export default function VendorDashboardScreen() {
  const { session, logout, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Products');

  useEffect(() => {
    if (params.tab && TABS.includes(params.tab as any)) {
      setTab(params.tab as any);
    }
  }, [params.tab]);

  const {
    loading,
    refreshing,
    vendor,
    setVendor,
    shop,
    products,
    setProducts,
    orders,
    unreadNotifs,
    onRefresh,
  } = useVendorDashboardData(session?.access_token);

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logout();
    router.replace('/(tabs)');
  };

  if (!isAuthenticated) return null;

  // KYC GATE
  if (!loading) {
    if (!vendor) {
      return <VendorKycGate status="missing" vendor={vendor} refreshing={refreshing} onRefresh={onRefresh} onLogout={handleLogout} />;
    }

    if (vendor.kyc_status === 'pending') {
      return <VendorKycGate status="pending" vendor={vendor} refreshing={refreshing} onRefresh={onRefresh} onLogout={handleLogout} />;
    }

    if (vendor.kyc_status === 'rejected') {
      return <VendorKycGate status="rejected" vendor={vendor} refreshing={refreshing} onRefresh={onRefresh} onLogout={handleLogout} />;
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: Theme.primary, letterSpacing: -1 }}>TOLA.</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerSubtitle}>Vendor Dashboard</Text>
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Theme.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />}>
          <VendorOverviewHeader vendorName={vendor?.business_name} shop={shop} products={products} orders={orders} />

          {shop && (
            <>
              {tab === 'Products' && (
                <VendorProductsTab shop={shop} products={products} accessToken={session?.access_token || ''} onProductsChange={setProducts} />
              )}
              {tab === 'Orders' && shop?.id && (
                <VendorOrdersTab shopId={shop.id} accessToken={session?.access_token || ''} onOrdersLoaded={() => {}} />
              )}
              {tab === 'Wallet' && vendor?.id && (
                <VendorWalletTab vendorId={vendor.id} accessToken={session?.access_token || ''} />
              )}
              {tab === 'Subscription' && vendor?.id && (
                <VendorSubscriptionTab vendorId={vendor.id} accessToken={session?.access_token || ''} />
              )}
              {tab === 'Shop' && (
                <VendorShopSettingsTab shop={shop} vendor={vendor} onGoToProfile={() => setTab('Profile')} />
              )}
              {tab === 'Profile' && (
                <VendorProfileTab
                  vendor={vendor}
                  accessToken={session?.access_token || ''}
                  userEmail={session?.user?.email}
                  onVendorUpdated={(patch) => setVendor((prev) => (prev ? { ...prev, ...patch } : prev))}
                />
              )}
            </>
          )}
        </ScrollView>
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
  headerLeft: {},
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifBtn: { position: 'relative', width: 36, height: 36, borderRadius: 18, backgroundColor: Theme.inputBg, alignItems: 'center', justifyContent: 'center' },
  notifBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Theme.background },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  headerSubtitle: { fontSize: 13, color: Theme.textSecondary },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Theme.inputBorder, borderRadius: 6 },
  logoutText: { fontSize: 13, color: Theme.text, fontWeight: '500' },

  tabScroll: { backgroundColor: Theme.background, maxHeight: 48, borderBottomWidth: 1, borderBottomColor: Theme.inputBorder },
  tabRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: Theme.backgroundSecondary },
  tabText: { fontSize: 14, color: Theme.textSecondary, fontWeight: '500' },
  tabTextActive: { color: Theme.text, fontWeight: '700' },

  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 48 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: Theme.textMuted },
});
