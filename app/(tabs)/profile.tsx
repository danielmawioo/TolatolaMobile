import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, TextInput,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';
import { apiGet, apiPatch, apiPost } from '@/src/services/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { OrderHistorySection } from '@/src/components/profile/OrderHistorySection';
import { TransactionHistorySection } from '@/src/components/profile/TransactionHistorySection';
import { SupportSection } from '@/src/components/profile/SupportSection';
import { KycVerificationSection } from '@/src/components/profile/KycVerificationSection';

type ProfileTab = 'personal' | 'kyc' | 'orders' | 'transactions' | 'support' | 'settings';

const NAV_ITEMS: { id: ProfileTab; label: string; icon: string }[] = [
  { id: 'personal', label: 'Personal Info', icon: 'user' },
  { id: 'kyc', label: 'KYC', icon: 'shield' },
  { id: 'orders', label: 'Order History', icon: 'shopping-bag' },
  { id: 'transactions', label: 'Transactions', icon: 'credit-card' },
  { id: 'support', label: 'Support', icon: 'headphones' },
  { id: 'settings', label: 'Settings', icon: 'cog' },
];

export default function ProfileScreen() {
  const { session, logout, setSession } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [refreshing, setRefreshing] = useState(false);

  // Personal info
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', phone: '' });

  // Settings
  const [passwordData, setPasswordData] = useState({ current: '', newPw: '', confirm: '' });
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setFormData({
        full_name: (session.user.full_name as string) || '',
        phone: (session.user.phone as string) || '',
      });
    }
  }, [session]);

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
      const updatedUser = await apiPatch<any>('/profile', formData, session.access_token);
      await setSession({ ...session, user: { ...session.user, ...updatedUser } });
      setEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPw !== passwordData.confirm) {
      Alert.alert('Error', "Passwords don't match");
      return;
    }
    if (passwordData.newPw.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setChangingPw(true);
    try {
      await apiPost('/auth/change-password', {
        currentPassword: passwordData.current,
        newPassword: passwordData.newPw,
      }, session?.access_token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Password updated');
      setPasswordData({ current: '', newPw: '', confirm: '' });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to change password');
    }
    setChangingPw(false);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. This will permanently delete your account and remove your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiPost('/profile/delete', {}, session?.access_token);
              await logout();
              router.replace('/(tabs)');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  // Unauthenticated view
  if (!session) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 100 + insets.bottom, paddingHorizontal: gap.md }]}
      >
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Sign in to save items, track orders, and manage your profile. Part of TOLA Tanzania — trade smarter.</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.primaryBtnText}>Log in</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.secondaryBtnText}>Sign up</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={() => router.push('/(guest)/track')}>
          <Text style={styles.linkBtnText}>Track order</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const userName = (session.user?.full_name as string) || (session.user as any)?.name || 'User';
  const userEmail = session.user?.email || '';
  const userType = (session.user?.user_type as string) || (session.user as any)?.role || 'customer';
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const renderPersonalInfo = () => (
    <View style={styles.sectionContent}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.avatarName}>{userName}</Text>
          <Text style={styles.avatarEmail}>{userEmail}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        {editing ? (
          <>
            <View style={styles.field}><Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput style={styles.fieldInput} value={formData.full_name} onChangeText={(t) => setFormData(f => ({ ...f, full_name: t }))} placeholder="Your full name" />
            </View>
            <View style={styles.field}><Text style={styles.fieldLabel}>Email</Text>
              <Text style={[styles.fieldValue, { color: Theme.textMuted }]}>{userEmail}</Text>
              <Text style={styles.fieldHint}>Email cannot be changed here</Text>
            </View>
            <View style={styles.field}><Text style={styles.fieldLabel}>Phone</Text>
              <TextInput style={styles.fieldInput} value={formData.phone} onChangeText={(t) => setFormData(f => ({ ...f, phone: t }))} placeholder="Phone number" keyboardType="phone-pad" />
            </View>
            <View style={styles.field}><Text style={styles.fieldLabel}>Account Type</Text>
              <Text style={styles.fieldValue}>{userType}</Text>
            </View>
            <View style={styles.editActions}>
              <Pressable style={styles.cancelEditBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelEditText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, loading && { opacity: 0.5 }]} onPress={handleUpdateProfile} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View style={styles.field}><Text style={styles.fieldLabel}>Full Name</Text><Text style={styles.fieldValue}>{userName}</Text></View>
            <View style={styles.field}><Text style={styles.fieldLabel}>Email</Text><Text style={[styles.fieldValue, { color: Theme.textMuted }]}>{userEmail}</Text></View>
            <View style={styles.field}><Text style={styles.fieldLabel}>Phone</Text><Text style={styles.fieldValue}>{String(session.user?.phone || 'Not provided')}</Text></View>
            <View style={styles.field}><Text style={styles.fieldLabel}>Account Type</Text><Text style={[styles.fieldValue, { textTransform: 'capitalize' }]}>{userType}</Text></View>
            <Pressable style={styles.editProfileBtn} onPress={() => setEditing(true)}>
              <FontAwesome name="edit" size={14} color="#fff" />
              <Text style={styles.editProfileBtnText}>Edit Profile</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.sectionContent}>
      {/* Password */}
      <Text style={styles.settingsTitle}>Security</Text>
      <Text style={styles.settingsDesc}>Manage your password and security preferences.</Text>
      <View style={styles.infoCard}>
        <View style={styles.field}><Text style={styles.fieldLabel}>Current Password</Text>
          <TextInput style={styles.fieldInput} value={passwordData.current} onChangeText={t => setPasswordData(p => ({ ...p, current: t }))} secureTextEntry placeholder="Current password" />
        </View>
        <View style={styles.field}><Text style={styles.fieldLabel}>New Password</Text>
          <TextInput style={styles.fieldInput} value={passwordData.newPw} onChangeText={t => setPasswordData(p => ({ ...p, newPw: t }))} secureTextEntry placeholder="New password" />
        </View>
        <View style={styles.field}><Text style={styles.fieldLabel}>Confirm Password</Text>
          <TextInput style={styles.fieldInput} value={passwordData.confirm} onChangeText={t => setPasswordData(p => ({ ...p, confirm: t }))} secureTextEntry placeholder="Confirm new password" />
        </View>
        <Pressable style={[styles.editProfileBtn, changingPw && { opacity: 0.5 }]} onPress={handlePasswordChange} disabled={changingPw}>
          {changingPw ? <ActivityIndicator color="#fff" /> : <Text style={styles.editProfileBtnText}>Update Password</Text>}
        </Pressable>
      </View>

      {/* Danger Zone */}
      <Text style={[styles.settingsTitle, { color: Theme.error, marginTop: 24 }]}>Danger Zone</Text>
      <View style={styles.dangerCard}>
        <View style={styles.dangerRow}>
          <View style={{ flex: 1 }}><Text style={styles.dangerLabel}>Sign out</Text><Text style={styles.dangerDesc}>Sign out on this device.</Text></View>
          <Pressable style={styles.dangerBtn} onPress={handleLogout}>
            <FontAwesome name="sign-out" size={14} color={Theme.error} />
            <Text style={styles.dangerBtnText}>Sign Out</Text>
          </Pressable>
        </View>
        <View style={styles.dangerDivider} />
        <View style={styles.dangerRow}>
          <View style={{ flex: 1 }}><Text style={styles.dangerLabel}>Delete Account</Text><Text style={styles.dangerDesc}>Permanently delete your data.</Text></View>
          <Pressable style={[styles.dangerBtn, { backgroundColor: Theme.error + '10', borderColor: Theme.error }]} onPress={handleDeleteAccount}>
            <Text style={[styles.dangerBtnText, { color: Theme.error }]}>Delete</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.memberSince}>Member since {new Date(session.user?.created_at as string || Date.now()).getFullYear()}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.profileHeaderInner}>
          <View style={styles.avatarSmall}><Text style={styles.avatarSmallText}>{initials}</Text></View>
          <View style={{ flex: 1 }}><Text style={styles.profileName} numberOfLines={1}>{userName}</Text><Text style={styles.profileEmail} numberOfLines={1}>{userEmail}</Text></View>
        </View>
      </View>

      {/* Tab Navigation */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navScroll} contentContainerStyle={styles.navRow}>
        {NAV_ITEMS.map(item => (
          <Pressable key={item.id} style={[styles.navItem, activeTab === item.id && styles.navItemActive]} onPress={() => setActiveTab(item.id)}>
            <FontAwesome name={item.icon as any} size={14} color={activeTab === item.id ? '#fff' : Theme.textMuted} />
            <Text style={[styles.navLabel, activeTab === item.id && styles.navLabelActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); }} colors={[Theme.primary]} />}
      >
        <Text style={styles.sectionTitle}>{NAV_ITEMS.find(n => n.id === activeTab)?.label}</Text>
        <View style={styles.divider} />

        {activeTab === 'personal' && renderPersonalInfo()}
        {activeTab === 'kyc' && <KycVerificationSection accessToken={session.access_token!} userId={session.user?.id || ''} />}
        {activeTab === 'orders' && <OrderHistorySection accessToken={session.access_token!} />}
        {activeTab === 'transactions' && <TransactionHistorySection accessToken={session.access_token!} />}
        {activeTab === 'support' && <SupportSection accessToken={session.access_token!} />}
        {activeTab === 'settings' && renderSettings()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  content: { paddingBottom: 24 },
  // Unauth
  title: { fontSize: 24, fontWeight: '700', color: Theme.text },
  subtitle: { fontSize: 15, color: Theme.textSecondary, marginBottom: 24 },
  primaryBtn: { backgroundColor: Theme.primary, paddingVertical: 16, borderRadius: Theme.radiusMd, alignItems: 'center', marginBottom: 12, ...Theme.shadowSm },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { backgroundColor: Theme.background, paddingVertical: 14, borderRadius: Theme.radiusMd, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: Theme.inputBorder },
  secondaryBtnText: { fontSize: 16, color: Theme.text },
  linkBtn: { alignItems: 'center', paddingVertical: 12 },
  linkBtnText: { fontSize: 15, color: Theme.link },
  // Profile Header
  profileHeader: { backgroundColor: Theme.background, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Theme.inputBorder },
  profileHeaderInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#818cf8', alignItems: 'center', justifyContent: 'center' },
  avatarSmallText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  profileName: { fontSize: 15, fontWeight: '700', color: Theme.text },
  profileEmail: { fontSize: 11, color: Theme.textMuted },
  // Nav
  navScroll: { backgroundColor: Theme.background, maxHeight: 48, borderBottomWidth: 1, borderBottomColor: Theme.inputBorder },
  navRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, gap: 4, alignItems: 'center' },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  navItemActive: { backgroundColor: Theme.primary },
  navLabel: { fontSize: 12, fontWeight: '600', color: Theme.textSecondary },
  navLabelActive: { color: '#fff' },
  // Body
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 100 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: Theme.text },
  divider: { height: 1, backgroundColor: Theme.inputBorder, marginVertical: 12 },
  sectionContent: { gap: 14 },
  // Avatar
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: Theme.backgroundSecondary, padding: 16, borderRadius: Theme.radiusLg, borderWidth: 1, borderColor: Theme.inputBorder },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#818cf8', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  avatarName: { fontSize: 16, fontWeight: '700', color: Theme.text },
  avatarEmail: { fontSize: 12, color: Theme.textMuted },
  // Info card
  infoCard: { backgroundColor: Theme.background, padding: 16, borderRadius: Theme.radiusLg, borderWidth: 1, borderColor: Theme.inputBorder, gap: 14 },
  field: { gap: 4 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: Theme.textSecondary, textTransform: 'uppercase' },
  fieldValue: { fontSize: 15, fontWeight: '500', color: Theme.text },
  fieldInput: { backgroundColor: Theme.backgroundSecondary, borderRadius: 8, padding: 12, fontSize: 15, color: Theme.text, borderWidth: 1, borderColor: Theme.inputBorder },
  fieldHint: { fontSize: 10, color: Theme.textMuted },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelEditBtn: { flex: 1, borderWidth: 2, borderColor: Theme.inputBorder, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelEditText: { fontWeight: '600', color: Theme.textSecondary },
  saveBtn: { flex: 1, backgroundColor: Theme.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Theme.primary, paddingVertical: 12, borderRadius: 8, marginTop: 4 },
  editProfileBtnText: { color: '#fff', fontWeight: '600' },
  // Settings
  settingsTitle: { fontSize: 16, fontWeight: '700', color: Theme.text },
  settingsDesc: { fontSize: 12, color: Theme.textMuted },
  dangerCard: { backgroundColor: '#fef2f2', borderRadius: Theme.radiusMd, borderWidth: 1, borderColor: '#fecaca', padding: 16, gap: 0 },
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  dangerLabel: { fontSize: 14, fontWeight: '600', color: Theme.text },
  dangerDesc: { fontSize: 11, color: Theme.textMuted },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#fecaca', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  dangerBtnText: { fontSize: 12, fontWeight: '700', color: Theme.error },
  dangerDivider: { height: 1, backgroundColor: '#fecaca', marginVertical: 8 },
  memberSince: { fontSize: 10, color: Theme.textMuted, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1, marginTop: 12 },
});
