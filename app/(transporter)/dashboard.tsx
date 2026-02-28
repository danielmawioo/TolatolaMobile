import { View, Text, ScrollView, Pressable, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Alert, TextInput } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';
import { apiGet, apiPatch } from '@/src/services/api';
import { Skeleton } from '@/components/Skeleton';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = ['Assignments', 'Payments', 'Withdrawals', 'Membership', 'Profile'] as const;

export default function TransporterDashboardScreen() {
  const { session, logout, isAuthenticated, setSession } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Assignments');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [assignments, setAssignments] = useState<any[]>([]);
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    vehicle_type: '',
    license_plate: '',
  });

  const fetchTransporterData = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const [jobs, profile] = await Promise.all([
        apiGet<any[]>('/transporter/jobs', session.access_token),
        apiGet<any>('/profile', session.access_token),
      ]);
      setAssignments(Array.isArray(jobs) ? jobs : []);
      setProfileData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        vehicle_type: profile.vehicle_type || '',
        license_plate: profile.license_plate || '',
      });
    } catch (error) {
      console.error('Transporter Dashboard Fetch Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchTransporterData();
  }, [fetchTransporterData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransporterData();
  };

  const updateJobStatus = async (jobId: string, status: string) => {
    if (!session?.access_token) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await apiPatch(`/transporter/jobs/${jobId}`, { status }, session.access_token);
      setAssignments(assignments.map(j => j.id === jobId ? { ...j, status } : j));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update job status');
    }
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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered': case 'completed': return Theme.success;
      case 'in transit': case 'picked up': return Theme.primary;
      case 'cancelled': return Theme.error;
      default: return '#f39c12';
    }
  };

  if (!isAuthenticated) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>TOLA Transporter</Text>
        <Pressable onPress={() => logout().then(() => router.replace('/(tabs)'))}>
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
          <Text style={styles.loadingText}>Fetching assignments...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.body} 
          contentContainerStyle={styles.bodyContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />}
        >
          {tab === 'Assignments' && (
            <View style={styles.tabContent}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Assignments</Text>
              </View>

              {assignments.length === 0 ? (
                <View style={styles.empty}>
                  <FontAwesome name="truck" size={48} color={Theme.textMuted} />
                  <Text style={styles.emptyText}>No assignments yet. Available jobs will appear here.</Text>
                </View>
              ) : (
                assignments.map(job => (
                  <View key={job.id} style={styles.jobCard}>
                    <View style={styles.jobHeader}>
                      <Text style={styles.jobId}>Job #{job.id.slice(0, 8)}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>{job.status}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.jobMeta}>
                      <FontAwesome name="map-marker" size={14} color={Theme.textSecondary} />
                      <Text style={styles.metaText}>{job.pickup_location || 'Pickup location not set'}</Text>
                    </View>
                    
                    <View style={[styles.jobMeta, { marginTop: 4 }]}>
                      <FontAwesome name="flag-checkered" size={14} color={Theme.textSecondary} />
                      <Text style={styles.metaText}>{job.delivery_location || 'Delivery location not set'}</Text>
                    </View>

                    <View style={styles.jobActions}>
                      {job.status === 'Available' && (
                        <Pressable style={styles.actionBtn} onPress={() => updateJobStatus(job.id, 'Assigned')}>
                          <Text style={styles.actionBtnText}>Accept Job</Text>
                        </Pressable>
                      )}
                      {job.status === 'Assigned' && (
                        <Pressable style={styles.actionBtn} onPress={() => updateJobStatus(job.id, 'In Transit')}>
                          <Text style={styles.actionBtnText}>Pick Up Items</Text>
                        </Pressable>
                      )}
                      {job.status === 'In Transit' && (
                        <Pressable style={[styles.actionBtn, { backgroundColor: Theme.success }]} onPress={() => updateJobStatus(job.id, 'Delivered')}>
                          <Text style={styles.actionBtnText}>Mark Delivered</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {tab === 'Payments' && (
             <View style={styles.tabContent}>
               <Text style={styles.sectionTitle}>Earnings Summary</Text>
               <View style={styles.statCardLarge}>
                 <Text style={styles.statLabelLarge}>Total Earned</Text>
                 <Text style={styles.statValueLarge}>TSh 0</Text>
               </View>
             </View>
          )}

          {tab === 'Profile' && (
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
          )}

          {tab === 'Withdrawals' && <Text style={styles.placeholder}>Withdrawals system pending integration.</Text>}
          {tab === 'Membership' && <Text style={styles.placeholder}>Transporter subscription plans.</Text>}
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
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Theme.text },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: Theme.textMuted },
  jobCard: { 
    backgroundColor: Theme.background, 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: Theme.inputBorder 
  },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  jobId: { fontSize: 15, fontWeight: '600', color: Theme.text },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '700' },
  jobMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 14, color: Theme.textSecondary },
  jobActions: { marginTop: 16, borderTopWidth: 1, borderTopColor: Theme.inputBorder, paddingTop: 16 },
  actionBtn: { backgroundColor: Theme.primary, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '600' },
  empty: { padding: 40, alignItems: 'center', backgroundColor: Theme.background, borderRadius: 12 },
  emptyText: { textAlign: 'center', color: Theme.textMuted, marginTop: 12, lineHeight: 20 },
  statCardLarge: { 
    backgroundColor: Theme.background, 
    padding: 32, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: Theme.inputBorder,
    alignItems: 'center'
  },
  statLabelLarge: { fontSize: 15, color: Theme.textSecondary, marginBottom: 8 },
  statValueLarge: { fontSize: 32, fontWeight: '800', color: Theme.primary },
  formCard: { backgroundColor: Theme.background, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: Theme.inputBorder },
  label: { fontSize: 12, color: Theme.textSecondary, marginBottom: 4 },
  input: { backgroundColor: Theme.backgroundSecondary, borderRadius: 8, padding: 12, fontSize: 16, color: Theme.text, borderWidth: 1, borderColor: Theme.inputBorder },
  saveBtn: { backgroundColor: Theme.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  placeholder: { color: Theme.textMuted, marginTop: 20, textAlign: 'center' },
});
