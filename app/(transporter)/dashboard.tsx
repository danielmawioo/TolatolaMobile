import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl, ActivityIndicator, Alert, TextInput } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';
import { apiGet, apiPatch, apiPut } from '@/src/services/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TransporterAssignmentsTab } from '@/src/components/transporter/TransporterAssignmentsTab';
import { TransporterPaymentsTab } from '@/src/components/transporter/TransporterPaymentsTab';
import { TransporterWithdrawalsTab } from '@/src/components/transporter/TransporterWithdrawalsTab';
import { TransporterSubscriptionTab } from '@/src/components/transporter/TransporterSubscriptionTab';

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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [transporter, setTransporter] = useState<any>(null);
  const [transporterId, setTransporterId] = useState<string>('');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [financeSummary, setFinanceSummary] = useState<any>(null);
  const [profileData, setProfileData] = useState({
    full_name: '', phone: '', vehicle_type: '', license_plate: '',
  });

  // Location update
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'updated' | 'error' | 'idle'>('idle');

  const fetchData = useCallback(async (silent = false) => {
    if (!session?.access_token) return;
    if (!silent) setLoading(true);
    try {
      const [profile, transporterRes] = await Promise.all([
        apiGet<any>('/profile', session.access_token).catch(() => null),
        apiGet<any>('/transporters/me', session.access_token).catch(() => null),
      ]);

      const tData = transporterRes?.transporter || null;
      setTransporter(tData);
      const tId = tData?.id || profile?.transporter_id || session.user?.id || '';
      setTransporterId(tId);

      setProfileData({
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        vehicle_type: profile?.vehicle_type || tData?.vehicle_type || '',
        license_plate: profile?.license_plate || tData?.vehicle_registration || '',
      });

      // Fetch assignments, payments, and finance summary for stats
      if (tId) {
        const [assignRes, payRes, financeRes] = await Promise.all([
          apiGet<any>('/transporter/jobs', session.access_token).catch(() => []),
          apiGet<any>('/transporters/payments', session.access_token).catch(() => ({ payments: [] })),
          apiGet<any>('/transporter/finance-summary', session.access_token).catch(() => null),
        ]);
        setAssignments(Array.isArray(assignRes) ? assignRes : assignRes?.assignments || assignRes?.data || []);
        setPayments(payRes?.payments || []);
        // Use finance summary for accurate balance if available
        if (financeRes) {
          setFinanceSummary(financeRes);
        }
      }

      // Notification count
      try {
        const notifRes = await apiGet<any>('/notifications/unread-count', session.access_token);
        setUnreadNotifs(notifRes?.unread_count || 0);
      } catch { /* silent */ }
    } catch (error) {
      console.error('Transporter Dashboard Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useFocusEffect(
    useCallback(() => { fetchData(true); }, [fetchData])
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

  const handleUpdateLocation = async () => {
    setIsUpdatingLocation(true);
    setLocationStatus('idle');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is needed to update your position.');
        setIsUpdatingLocation(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await apiPut('/transporters/me/location', {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        bearing: loc.coords.heading || null,
        speed: loc.coords.speed || null,
      }, session?.access_token);
      setLocationStatus('updated');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('Location update error:', e);
      setLocationStatus('error');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  // Real-time active GPS streaming loop for Uber-like driver tracking
  useEffect(() => {
    if (!session?.access_token || assignments.length === 0) return;

    // Check if there are active assignments in transit or picked up
    const hasActiveTrip = assignments.some(a => ['picked_up', 'in_transit'].includes(a.status));
    if (!hasActiveTrip) return;

    let locationInterval: any;

    const startLocationStreaming = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        // Perform immediate sync
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await apiPut('/transporters/me/location', {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          bearing: loc.coords.heading || null,
          speed: loc.coords.speed || null,
        }, session.access_token);

        // Stream every 10 seconds
        locationInterval = setInterval(async () => {
          try {
            const currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            await apiPut('/transporters/me/location', {
              latitude: currentLoc.coords.latitude,
              longitude: currentLoc.coords.longitude,
              bearing: currentLoc.coords.heading || null,
              speed: currentLoc.coords.speed || null,
            }, session.access_token);
          } catch (err) {
            console.warn('Real-time location stream error:', err);
          }
        }, 10000);
      } catch (err) {
        console.warn('Location streaming setup failed:', err);
      }
    };

    startLocationStreaming();

    return () => {
      if (locationInterval) clearInterval(locationInterval);
    };
  }, [assignments, session?.access_token]);

  const handleUpdateProfile = async () => {
    if (!session?.access_token) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const updated = await apiPatch<any>('/profile', profileData, session.access_token);
      await setSession({ ...session, user: { ...session.user, ...updated } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
  };

  // Stats
  const activeAssignments = assignments.filter(a => {
    const isAccepted = ['accepted', 'picked_up', 'in_transit'].includes(a.status) || (a.status === 'assigned' && a.accepted_at);
    const isReady = a.status === 'ready_for_pickup';
    return isAccepted || isReady;
  });
  const completedAssignments = assignments.filter(a => a.status === 'delivered' && a.is_customer_verified);
  const availableBalance = financeSummary?.withdrawable_balance ?? payments.filter(p => p.status === 'available').reduce((s, p) => s + Number(p.amount), 0);

  if (!isAuthenticated) return null;

  // KYC GATE
  if (!loading) {
    if (!transporter) {
      return (
        <View style={styles.container}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <View style={styles.headerLeft}>
              <Text style={styles.logoText}>TOLA.</Text>
              <Text style={styles.headerSubtitle}>Transporter Profile</Text>
            </View>
            <View style={styles.headerRight}>
              <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                <FontAwesome name="sign-out" size={14} color={Theme.text} />
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            </View>
          </View>
          
          <ScrollView 
            contentContainerStyle={styles.gateContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />}
          >
            <View style={styles.gateCard}>
              <View style={[styles.gateIconContainer, { backgroundColor: '#ede9fe' }]}>
                <FontAwesome name="truck" size={32} color="#7c3aed" />
              </View>
              <Text style={styles.gateTitle}>Transporter KYC Required</Text>
              <Text style={styles.gateDesc}>
                To start taking deliveries and earning with Tolatola, you need to register your transporter details and verify your license.
              </Text>
              
              <Pressable 
                style={styles.gatePrimaryBtn}
                onPress={() => router.push('/(transporter)/register' as any)}
              >
                <Text style={styles.gatePrimaryBtnText}>Register as Transporter</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      );
    }

    if (transporter.kyc_status === 'pending') {
      return (
        <View style={styles.container}>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <View style={styles.headerLeft}>
              <Text style={styles.logoText}>TOLA.</Text>
              <Text style={styles.headerSubtitle}>Under Review</Text>
            </View>
            <View style={styles.headerRight}>
              <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                <FontAwesome name="sign-out" size={14} color={Theme.text} />
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            </View>
          </View>
          
          <ScrollView 
            contentContainerStyle={styles.gateContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />}
          >
            <View style={styles.gateCard}>
              <View style={[styles.gateIconContainer, { backgroundColor: '#fef3c7' }]}>
                <FontAwesome name="clock-o" size={36} color="#d97706" />
              </View>
              <Text style={styles.gateTitle}>KYC Under Review</Text>
              <Text style={styles.gateSubtitle}>Your application for {transporter.business_name || 'Transporter'} is being reviewed</Text>
              <Text style={styles.gateDesc}>
                Thank you for submitting your transporter profile. Our admin team is currently reviewing your documents and vehicle details.
              </Text>
              
              <View style={styles.gateInfoBox}>
                <Text style={styles.gateInfoText}>Typical review time: 24-48 hours</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      );
    }

    if (transporter.kyc_status === 'rejected') {
      return (
        <View style={styles.container}>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <View style={styles.headerLeft}>
              <Text style={styles.logoText}>TOLA.</Text>
              <Text style={styles.headerSubtitle}>Rejected</Text>
            </View>
            <View style={styles.headerRight}>
              <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                <FontAwesome name="sign-out" size={14} color={Theme.text} />
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            </View>
          </View>
          
          <ScrollView 
            contentContainerStyle={styles.gateContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />}
          >
            <View style={[styles.gateCard, { borderColor: '#fca5a5' }]}>
              <View style={[styles.gateIconContainer, { backgroundColor: '#fee2e2' }]}>
                <FontAwesome name="times-circle" size={36} color={Theme.error} />
              </View>
              <Text style={[styles.gateTitle, { color: Theme.error }]}>Application Rejected</Text>
              <Text style={styles.gateSubtitle}>Your transporter profile application has been rejected</Text>
              
              {transporter.kyc_notes && (
                <View style={styles.rejectionBox}>
                  <Text style={styles.rejectionTitle}>Rejection Reason:</Text>
                  <Text style={styles.rejectionText}>{transporter.kyc_notes}</Text>
                </View>
              )}
              
              <Text style={styles.gateDesc}>
                Please review the rejection reason above and make the necessary corrections before reapplying.
              </Text>
              
              <Pressable 
                style={[styles.gatePrimaryBtn, { backgroundColor: Theme.error }]}
                onPress={() => router.push('/(transporter)/register' as any)}
              >
                <Text style={styles.gatePrimaryBtnText}>Reapply as Transporter</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
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
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.bodyContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />}>
              {/* Welcome */}
              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeTitle}>Transporter Dashboard</Text>
                <Text style={styles.welcomeSubtitle}>{transporter?.business_name || 'Welcome to your dashboard'}</Text>
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}><FontAwesome name="truck" size={16} color="#2563eb" /></View>
                  <Text style={styles.statValue}>{activeAssignments.length}</Text>
                  <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: '#dcfce7' }]}><FontAwesome name="check-circle" size={16} color="#16a34a" /></View>
                  <Text style={styles.statValue}>{completedAssignments.length}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: '#ede9fe' }]}><FontAwesome name="money" size={16} color="#7c3aed" /></View>
                  <Text style={styles.statValue}>{availableBalance > 0 ? `${Math.round(availableBalance / 1000)}k` : '0'}</Text>
                  <Text style={styles.statLabel}>Balance</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}><FontAwesome name="star" size={16} color="#d97706" /></View>
                  <Text style={styles.statValue}>{transporter?.rating || '5.0'}</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
              </View>

              {/* Update Location Card */}
              <View style={styles.locationCard}>
                <View style={styles.locationCardHeader}>
                  <FontAwesome name="map-marker" size={18} color={Theme.primary} />
                  <Text style={styles.locationCardTitle}>My Location</Text>
                </View>
                <Pressable
                  style={[styles.locationBtn, isUpdatingLocation && { opacity: 0.6 }]}
                  onPress={handleUpdateLocation}
                  disabled={isUpdatingLocation}
                >
                  <FontAwesome name="crosshairs" size={14} color="#fff" />
                  <Text style={styles.locationBtnText}>{isUpdatingLocation ? 'Updating...' : 'Update My Location'}</Text>
                </Pressable>
                {locationStatus === 'updated' && <Text style={styles.locationSuccess}>✓ Location synced</Text>}
                {locationStatus === 'error' && <Text style={styles.locationError}>Failed to sync location</Text>}
              </View>

              {/* Assignments Tab (inline) */}
              <TransporterAssignmentsTab
                transporterId={transporterId}
                accessToken={session?.access_token || ''}
              />
            </ScrollView>
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
            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={styles.bodyContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />}
            >
              <View style={styles.tabContent}>
                <Text style={styles.sectionTitle}>Vehicle & Profile</Text>
                <View style={styles.formCard}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    value={profileData.full_name}
                    onChangeText={(t) => setProfileData(p => ({ ...p, full_name: t }))}
                  />

                  <Text style={[styles.label, { marginTop: 12 }]}>Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={profileData.phone}
                    onChangeText={(t) => setProfileData(p => ({ ...p, phone: t }))}
                    keyboardType="phone-pad"
                  />

                  <Text style={[styles.label, { marginTop: 12 }]}>Vehicle Type</Text>
                  <TextInput
                    style={styles.input}
                    value={profileData.vehicle_type}
                    onChangeText={(t) => setProfileData(p => ({ ...p, vehicle_type: t }))}
                    placeholder="e.g. Motorcycle, Van"
                    placeholderTextColor={Theme.textMuted}
                  />

                  <Text style={[styles.label, { marginTop: 12 }]}>License Plate</Text>
                  <TextInput
                    style={styles.input}
                    value={profileData.license_plate}
                    onChangeText={(t) => setProfileData(p => ({ ...p, license_plate: t }))}
                    placeholder="e.g. T 123 ABC"
                    placeholderTextColor={Theme.textMuted}
                  />

                  <Pressable 
                    style={styles.saveBtn} 
                    onPress={handleUpdateProfile}
                  >
                    <Text style={styles.saveBtnText}>Update Profile</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
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

  bodyContent: { padding: 20, paddingBottom: 48 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: Theme.textMuted },

  welcomeSection: { marginBottom: 20 },
  welcomeTitle: { fontSize: 24, fontWeight: '700', color: Theme.text, marginBottom: 4 },
  welcomeSubtitle: { fontSize: 14, color: Theme.textSecondary },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: Theme.background, borderRadius: 12, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Theme.inputBorder },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: Theme.text },
  statLabel: { fontSize: 9, fontWeight: '700', color: Theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Location Card
  locationCard: {
    backgroundColor: Theme.primary + '08',
    borderWidth: 1,
    borderColor: Theme.primary + '30',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  locationCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationCardTitle: { fontSize: 15, fontWeight: '700', color: Theme.text },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Theme.primary,
    paddingVertical: 12,
    borderRadius: 8,
  },
  locationBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  locationSuccess: { fontSize: 11, color: '#16a34a', fontWeight: '600', textAlign: 'center' },
  locationError: { fontSize: 11, color: '#ef4444', fontWeight: '600', textAlign: 'center' },

  // Profile
  tabContent: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Theme.text, marginBottom: 16 },
  formCard: { backgroundColor: Theme.background, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: Theme.inputBorder },
  label: { fontSize: 12, color: Theme.textSecondary, marginBottom: 4, fontWeight: '600' },
  input: { backgroundColor: Theme.backgroundSecondary, borderRadius: 8, padding: 12, fontSize: 16, color: Theme.text, borderWidth: 1, borderColor: Theme.inputBorder },
  saveBtn: { backgroundColor: Theme.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // KYC Gate Styles
  gateContent: { flexGrow: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  gateCard: { width: '100%', backgroundColor: Theme.background, borderRadius: Theme.radiusLg, borderWidth: 1, borderColor: Theme.inputBorder, padding: 24, alignItems: 'center', gap: 16, ...Theme.shadowMd },
  gateIconContainer: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  gateTitle: { fontSize: 20, fontWeight: '800', color: Theme.text, textAlign: 'center' },
  gateSubtitle: { fontSize: 14, fontWeight: '600', color: Theme.textSecondary, textAlign: 'center', lineHeight: 20 },
  gateDesc: { fontSize: 13, color: Theme.textMuted, textAlign: 'center', lineHeight: 20 },
  gatePrimaryBtn: { width: '100%', backgroundColor: Theme.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  gatePrimaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  gateInfoBox: { width: '100%', backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 8, padding: 12, marginTop: 8 },
  gateInfoText: { fontSize: 12, color: '#b45309', fontWeight: '600', textAlign: 'center' },
  rejectionBox: { width: '100%', backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, padding: 14, marginTop: 4, gap: 4 },
  rejectionTitle: { fontSize: 12, fontWeight: '700', color: '#991b1b', textTransform: 'uppercase' },
  rejectionText: { fontSize: 13, color: '#dc2626', lineHeight: 18 },
});
