import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl, ActivityIndicator, Alert, TextInput } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';
import { apiGet, apiPatch } from '@/src/services/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TransporterAssignmentsTab } from '@/src/components/transporter/TransporterAssignmentsTab';
import { TransporterPaymentsTab } from '@/src/components/transporter/TransporterPaymentsTab';
import { TransporterWithdrawalsTab } from '@/src/components/transporter/TransporterWithdrawalsTab';
import { TransporterSubscriptionTab } from '@/src/components/transporter/TransporterSubscriptionTab';

const TABS = ['Assignments', 'Payments', 'Withdrawals', 'Membership', 'Profile'] as const;

export default function TransporterDashboardScreen() {
  const { session, logout, isAuthenticated, setSession } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Assignments');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [transporterId, setTransporterId] = useState<string>('');
  const [profileData, setProfileData] = useState({
    full_name: '', phone: '', vehicle_type: '', license_plate: '',
  });

  const fetchTransporterData = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const [profile, transporter] = await Promise.all([
        apiGet<any>('/profile', session.access_token),
        apiGet<any>('/transporters/me', session.access_token).catch(() => null),
      ]);
      setProfileData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        vehicle_type: profile.vehicle_type || transporter?.transporter?.vehicle_type || '',
        license_plate: profile.license_plate || transporter?.transporter?.vehicle_registration || '',
      });
      setTransporterId(transporter?.transporter?.id || profile.transporter_id || session.user?.id || '');
    } catch (error) {
      console.error('Transporter Dashboard Fetch Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.access_token]);

  useEffect(() => { fetchTransporterData(); }, [fetchTransporterData]);

  const onRefresh = () => { setRefreshing(true); fetchTransporterData(); };

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logout();
    router.replace('/(tabs)');
  };

  const handleUpdateProfile = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const updated = await apiPatch<any>('/profile', profileData, session.access_token);
      await setSession({ ...session, user: { ...session.user, ...updated } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>TOLA Transporter</Text>
        <Pressable onPress={handleLogout}>
          <Text style={styles.logout}>Logout</Text>
        </Pressable>
      </View>
      
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
          {tab === 'Assignments' && (
            <TransporterAssignmentsTab
              transporterId={transporterId}
              accessToken={session?.access_token || ''}
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
              availableBalance={0}
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
              style={styles.body} 
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
                  />

                  <Text style={[styles.label, { marginTop: 12 }]}>License Plate</Text>
                  <TextInput
                    style={styles.input}
                    value={profileData.license_plate}
                    onChangeText={(t) => setProfileData(p => ({ ...p, license_plate: t }))}
                    placeholder="e.g. T 123 ABC"
                  />

                  <Pressable 
                    style={[styles.saveBtn, loading && { opacity: 0.7 }]} 
                    onPress={handleUpdateProfile}
                    disabled={loading}
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
  title: { fontSize: 18, fontWeight: '700', color: Theme.text },
  logout: { fontSize: 15, color: Theme.link },
  tabScroll: { backgroundColor: Theme.background, maxHeight: 48 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: Theme.primary },
  tabText: { fontSize: 14, color: Theme.text },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 48 },
  tabContent: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Theme.text, marginBottom: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: Theme.textMuted },
  formCard: { backgroundColor: Theme.background, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: Theme.inputBorder },
  label: { fontSize: 12, color: Theme.textSecondary, marginBottom: 4 },
  input: { backgroundColor: Theme.backgroundSecondary, borderRadius: 8, padding: 12, fontSize: 16, color: Theme.text, borderWidth: 1, borderColor: Theme.inputBorder },
  saveBtn: { backgroundColor: Theme.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
});
