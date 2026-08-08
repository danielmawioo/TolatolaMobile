import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, TextInput,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { getRoleRedirectPath } from '@/src/lib/roleRedirect';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';
import { apiGet, apiPatch, apiPost } from '@/src/services/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { OrderHistorySection } from '@/src/components/profile/OrderHistorySection';
import { TransactionHistorySection } from '@/src/components/profile/TransactionHistorySection';
import { SupportSection } from '@/src/components/profile/SupportSection';
import { KycVerificationSection } from '@/src/components/profile/KycVerificationSection';
import { OptimizedImage } from '@/components/OptimizedImage';
import { ThemeToggle } from '@/src/components/ThemeToggle';

type ProfileTab = 'personal' | 'kyc' | 'orders' | 'transactions' | 'support' | 'settings' | 'wishlist';

const NAV_ITEMS: { id: ProfileTab; label: string; icon: string }[] = [
  { id: 'personal', label: 'Personal Info', icon: 'user' },
  { id: 'kyc', label: 'KYC Verification', icon: 'shield' },
  { id: 'orders', label: 'Order History', icon: 'shopping-bag' },
  { id: 'wishlist', label: 'Wishlist', icon: 'heart-o' },
  { id: 'transactions', label: 'Transactions', icon: 'credit-card' },
  { id: 'support', label: 'Support Tickets', icon: 'headphones' },
  { id: 'settings', label: 'Settings', icon: 'cog' },
];

export default function ProfileScreen() {
  const { session, logout, setSession, switchRole } = useAuth();
  const [switchingRole, setSwitchingRole] = useState<string | null>(null);
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

  const fetchProfile = async () => {
    if (!session?.access_token) return;
    try {
      const res = await apiGet<any>('/profile', session.access_token);
      if (res?.profile) {
        await setSession({
          ...session,
          user: {
            ...session.user,
            ...res.profile,
          }
        });
      }
    } catch (err) {
      console.log('Error fetching fresh profile:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchProfile();
  }, [session?.access_token]);

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
      const res = await apiPatch<any>('/profile', formData, session.access_token);
      const updatedUser = res?.profile || res || {};
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
        style={[styles.container, { backgroundColor: '#fff' }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 100 + insets.bottom, paddingHorizontal: gap.md }]}
      >
        <Text style={styles.unauthTitle}>Account</Text>
        <Text style={styles.unauthSubtitle}>Sign in to save items, track orders, and manage your profile. Part of TOLA Tanzania — trade smarter.</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.primaryBtnText}>Log in</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.secondaryBtnText}>Sign up</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={() => router.push('/(guest)/track')}>
          <Text style={styles.linkBtnText}>Track order</Text>
        </Pressable>

        <View style={{ height: 24 }} />
        <Pressable
          style={({ pressed }) => [styles.dashboardCard, { borderColor: '#10b981' + '40', backgroundColor: '#f0fdf4' }, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/(tabs)/validation-survey' as any)}
        >
          <View style={styles.dashboardCardLeft}>
            <View style={[styles.dashboardIconBox, { backgroundColor: '#10b981' }]}>
              <FontAwesome name="clipboard" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dashboardCardTitle}>Market Validation Survey</Text>
              <Text style={styles.dashboardCardSubtitle}>Help us build TOLA — take the survey and share your feedback</Text>
            </View>
          </View>
          <View style={[styles.dashboardActionBtn, { backgroundColor: '#10b981' }]}>
            <Text style={styles.dashboardActionBtnText}>Take Survey</Text>
            <FontAwesome name="arrow-right" size={12} color="#fff" />
          </View>
        </Pressable>
      </ScrollView>
    );
  }

  const userName = (session.user?.full_name as string) || (session.user as any)?.name || 'User';
  const userEmail = session.user?.email || '';
  const userType = (session.user?.user_type as string) || (session.user as any)?.role || 'customer';
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  // KYC status check from nested session object or profile fallback
  const kycStatus = (session.user as any)?.kyc?.kyc_status || (session.user as any)?.kyc_status || 'Not Verified'; 

  const renderKycBadge = () => {
    const rawKycStatus = (session.user as any)?.kyc?.kyc_status || (session.user as any)?.kyc_status;
    const status = String(rawKycStatus || '').toLowerCase();

    let badgeStyle = {};
    let textStyle = {};
    let label = 'Not Verified';

    if (status === 'approved') {
      badgeStyle = { backgroundColor: '#16a34a', borderWidth: 0 };
      textStyle = { color: '#ffffff' };
      label = 'Verified';
    } else if (status === 'pending') {
      badgeStyle = { backgroundColor: 'rgba(234, 179, 8, 0.15)', borderColor: '#fef08a', borderWidth: 1 };
      textStyle = { color: '#a16207' };
      label = 'Pending Review';
    } else if (status === 'rejected') {
      badgeStyle = { backgroundColor: '#dc2626', borderWidth: 0 };
      textStyle = { color: '#ffffff' };
      label = 'Rejected';
    } else if (status === 'changes_requested') {
      badgeStyle = { backgroundColor: '#fff7ed', borderColor: '#fed7aa', borderWidth: 1 };
      textStyle = { color: '#c2410c' };
      label = 'Changes Requested';
    } else {
      badgeStyle = { backgroundColor: '#e2e8f0', borderWidth: 0 };
      textStyle = { color: '#475569' };
      label = 'Not Verified';
    }

    return (
      <View style={[styles.badgeWrapper, badgeStyle]}>
        <Text style={[styles.badgeText, textStyle]}>{label}</Text>
      </View>
    );
  };

  const renderPersonalInfo = () => (
    <View style={styles.tabContentInner}>
      {editing ? (
        <View style={styles.infoCard}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput style={styles.fieldInput} value={formData.full_name} onChangeText={(t) => setFormData(f => ({ ...f, full_name: t }))} placeholder="Your full name" />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={[styles.fieldValue, { color: Theme.textMuted }]}>{userEmail}</Text>
            <Text style={styles.fieldHint}>Email cannot be changed here</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput style={styles.fieldInput} value={formData.phone} onChangeText={(t) => setFormData(f => ({ ...f, phone: t }))} placeholder="Phone number" keyboardType="phone-pad" />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Account Type</Text>
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
        </View>
      ) : (
        <View style={styles.infoCard}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <Text style={styles.fieldValue}>{userName}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={[styles.fieldValue, { color: Theme.textMuted }]}>{userEmail}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <Text style={styles.fieldValue}>{String(session.user?.phone || 'Not provided')}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Account Type</Text>
            <Text style={[styles.fieldValue, { textTransform: 'capitalize' }]}>{userType}</Text>
          </View>
          <Pressable style={styles.editProfileBtn} onPress={() => setEditing(true)}>
            <FontAwesome name="edit" size={14} color="#fff" />
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  const renderSettings = () => (
    <View style={styles.tabContentInner}>
      <Text style={styles.settingsTitle}>Security</Text>
      <Text style={styles.settingsDesc}>Manage your password and security preferences.</Text>
      <View style={styles.infoCard}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Current Password</Text>
          <TextInput style={styles.fieldInput} value={passwordData.current} onChangeText={t => setPasswordData(p => ({ ...p, current: t }))} secureTextEntry placeholder="Current password" />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>New Password</Text>
          <TextInput style={styles.fieldInput} value={passwordData.newPw} onChangeText={t => setPasswordData(p => ({ ...p, newPw: t }))} secureTextEntry placeholder="New password" />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Confirm Password</Text>
          <TextInput style={styles.fieldInput} value={passwordData.confirm} onChangeText={t => setPasswordData(p => ({ ...p, confirm: t }))} secureTextEntry placeholder="Confirm new password" />
        </View>
        <Pressable style={[styles.editProfileBtn, changingPw && { opacity: 0.5 }]} onPress={handlePasswordChange} disabled={changingPw}>
          {changingPw ? <ActivityIndicator color="#fff" /> : <Text style={styles.editProfileBtnText}>Update Password</Text>}
        </Pressable>
      </View>

      <Text style={[styles.settingsTitle, { marginTop: 24 }]}>Appearance & Theme</Text>
      <Text style={styles.settingsDesc}>Switch between Light and Dark mode.</Text>
      <View style={[styles.infoCard, { alignItems: 'flex-start', paddingTop: 8 }]}>
        <ThemeToggle />
      </View>

      <Text style={[styles.settingsTitle, { color: Theme.error, marginTop: 24 }]}>Danger Zone</Text>
      <View style={styles.dangerCard}>
        <View style={styles.dangerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerLabel}>Sign out</Text>
            <Text style={styles.dangerDesc}>Sign out on this device.</Text>
          </View>
          <Pressable style={styles.dangerBtn} onPress={handleLogout}>
            <FontAwesome name="sign-out" size={14} color={Theme.error} />
            <Text style={styles.dangerBtnText}>Sign Out</Text>
          </Pressable>
        </View>
        <View style={styles.dangerDivider} />
        <View style={styles.dangerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerLabel}>Delete Account</Text>
            <Text style={styles.dangerDesc}>Permanently delete your data.</Text>
          </View>
          <Pressable style={[styles.dangerBtn, { backgroundColor: Theme.error + '10', borderColor: Theme.error }]} onPress={handleDeleteAccount}>
            <Text style={[styles.dangerBtnText, { color: Theme.error }]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: 100 + insets.bottom }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Theme.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Page Title */}
      <Text style={styles.pageTitle}>My Profile</Text>

      {/* User Info Header Card */}
      <View style={styles.userHeaderCard}>
        <View style={{ position: 'relative' }}>
          <View style={styles.avatarCircle}>
            {session.user?.profile_image_url ? (
              <OptimizedImage
                source={session.user.profile_image_url as string}
                width="100%"
                height="100%"
                style={{ borderRadius: 24 }}
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          {((session.user as any)?.kyc?.kyc_status === 'approved' || (session.user as any)?.kyc_status === 'approved') && (
            <View style={styles.verifiedMiniBadge}>
              <FontAwesome name="check-circle" size={14} color="#16a34a" />
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{userEmail}</Text>
        </View>
        {renderKycBadge()}
      </View>

      {/* Admin Dashboard Shortcut */}
      {userType === 'admin' && (
        <View style={styles.dashboardCard}>
          <View style={styles.dashboardCardLeft}>
            <View style={[styles.dashboardIconBox, { backgroundColor: Theme.primary }]}>
              <FontAwesome name={'gears' as any} size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dashboardCardTitle}>System Administration</Text>
              <Text style={styles.dashboardCardSubtitle}>Manage the platform</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.dashboardActionBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push(getRoleRedirectPath('admin') as any)}
          >
            <Text style={styles.dashboardActionBtnText}>Go to Dashboard</Text>
            <FontAwesome name="arrow-right" size={12} color="#fff" />
          </Pressable>
        </View>
      )}

      {/* Your Business Roles Section */}
      <View style={styles.rolesSection}>
        <Text style={styles.rolesSectionTitle}>Your Business Roles</Text>
        <Text style={styles.rolesSectionSubtitle}>Expand your account — sell products or deliver orders</Text>

        {/* Seller Role Card */}
        {(() => {
          const vendorProfile = (session.user as any)?.vendor;
          const vendorStatus = vendorProfile?.kyc_status;
          const isApproved = vendorStatus === 'approved';
          const isPending = vendorStatus === 'pending';
          const isRejected = vendorStatus === 'rejected';

          return (
            <View style={[styles.roleCard, isApproved && styles.roleCardApproved, isPending && styles.roleCardPending, isRejected && styles.roleCardRejected]}>
              <View style={styles.roleCardHeader}>
                <View style={[styles.roleIconBox, { backgroundColor: isApproved ? '#16a34a' : isPending ? '#d97706' : isRejected ? '#dc2626' : Theme.primary }]}>
                  <FontAwesome name="shopping-bag" size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roleCardTitle}>Seller</Text>
                  <Text style={styles.roleCardDesc}>
                    {isApproved ? 'Your seller account is active' : isPending ? 'Application under review' : isRejected ? 'Application was not approved' : 'Sell your products on TOLA'}
                  </Text>
                </View>
                {isApproved && (
                  <View style={styles.roleApprovedBadge}>
                    <FontAwesome name="check-circle" size={12} color="#16a34a" />
                    <Text style={styles.roleApprovedBadgeText}>Active</Text>
                  </View>
                )}
                {isPending && (
                  <View style={[styles.roleApprovedBadge, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]}>
                    <FontAwesome name="clock-o" size={12} color="#d97706" />
                    <Text style={[styles.roleApprovedBadgeText, { color: '#92400e' }]}>Pending</Text>
                  </View>
                )}
                {isRejected && (
                  <View style={[styles.roleApprovedBadge, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                    <FontAwesome name="times-circle" size={12} color="#dc2626" />
                    <Text style={[styles.roleApprovedBadgeText, { color: '#991b1b' }]}>Rejected</Text>
                  </View>
                )}
              </View>
              {isRejected && vendorProfile?.kyc_notes && (
                <View style={styles.rejectionReasonBox}>
                  <Text style={styles.rejectionReasonLabel}>Reason:</Text>
                  <Text style={styles.rejectionReasonText}>{vendorProfile.kyc_notes}</Text>
                </View>
              )}
              <Pressable
                style={({ pressed }) => [
                  styles.roleActionBtn,
                  isApproved ? { backgroundColor: '#16a34a' } : isRejected ? { backgroundColor: '#dc2626' } : isPending ? { backgroundColor: '#9ca3af' } : { backgroundColor: Theme.primary },
                  (pressed || switchingRole === 'vendor') && { opacity: 0.7 },
                ]}
                disabled={isPending || switchingRole === 'vendor'}
                onPress={async () => {
                  if (isApproved) {
                    try {
                      setSwitchingRole('vendor');
                      await switchRole('vendor');
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      router.push('/(vendor)/dashboard' as any);
                    } catch (e: any) {
                      Alert.alert('Error', e.message || 'Failed to switch role');
                    } finally {
                      setSwitchingRole(null);
                    }
                  } else {
                    router.push('/(vendor)/register' as any);
                  }
                }}
              >
                {switchingRole === 'vendor' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.roleActionBtnText}>
                      {isApproved ? 'Switch to Seller Dashboard' : isPending ? 'Under Review' : isRejected ? 'Reapply' : 'Become a Seller'}
                    </Text>
                    {!isPending && <FontAwesome name="arrow-right" size={12} color="#fff" />}
                  </>
                )}
              </Pressable>
            </View>
          );
        })()}

        {/* Transporter Role Card */}
        {(() => {
          const transporterProfile = (session.user as any)?.transporter;
          const transporterStatus = transporterProfile?.kyc_status;
          const isApproved = transporterStatus === 'approved';
          const isPending = transporterStatus === 'pending';
          const isRejected = transporterStatus === 'rejected';

          return (
            <View style={[styles.roleCard, isApproved && styles.roleCardApproved, isPending && styles.roleCardPending, isRejected && styles.roleCardRejected]}>
              <View style={styles.roleCardHeader}>
                <View style={[styles.roleIconBox, { backgroundColor: isApproved ? '#16a34a' : isPending ? '#d97706' : isRejected ? '#dc2626' : '#10b981' }]}>
                  <FontAwesome name="truck" size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roleCardTitle}>Transporter</Text>
                  <Text style={styles.roleCardDesc}>
                    {isApproved ? 'Your transporter account is active' : isPending ? 'Application under review' : isRejected ? 'Application was not approved' : 'Deliver orders across Tanzania'}
                  </Text>
                </View>
                {isApproved && (
                  <View style={styles.roleApprovedBadge}>
                    <FontAwesome name="check-circle" size={12} color="#16a34a" />
                    <Text style={styles.roleApprovedBadgeText}>Active</Text>
                  </View>
                )}
                {isPending && (
                  <View style={[styles.roleApprovedBadge, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]}>
                    <FontAwesome name="clock-o" size={12} color="#d97706" />
                    <Text style={[styles.roleApprovedBadgeText, { color: '#92400e' }]}>Pending</Text>
                  </View>
                )}
                {isRejected && (
                  <View style={[styles.roleApprovedBadge, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                    <FontAwesome name="times-circle" size={12} color="#dc2626" />
                    <Text style={[styles.roleApprovedBadgeText, { color: '#991b1b' }]}>Rejected</Text>
                  </View>
                )}
              </View>
              {isRejected && transporterProfile?.kyc_notes && (
                <View style={styles.rejectionReasonBox}>
                  <Text style={styles.rejectionReasonLabel}>Reason:</Text>
                  <Text style={styles.rejectionReasonText}>{transporterProfile.kyc_notes}</Text>
                </View>
              )}
              <Pressable
                style={({ pressed }) => [
                  styles.roleActionBtn,
                  isApproved ? { backgroundColor: '#16a34a' } : isRejected ? { backgroundColor: '#dc2626' } : isPending ? { backgroundColor: '#9ca3af' } : { backgroundColor: '#10b981' },
                  (pressed || switchingRole === 'transporter') && { opacity: 0.7 },
                ]}
                disabled={isPending || switchingRole === 'transporter'}
                onPress={async () => {
                  if (isApproved) {
                    try {
                      setSwitchingRole('transporter');
                      await switchRole('transporter');
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      router.push('/(transporter)/dashboard' as any);
                    } catch (e: any) {
                      Alert.alert('Error', e.message || 'Failed to switch role');
                    } finally {
                      setSwitchingRole(null);
                    }
                  } else {
                    router.push('/(transporter)/register' as any);
                  }
                }}
              >
                {switchingRole === 'transporter' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.roleActionBtnText}>
                      {isApproved ? 'Switch to Transporter Dashboard' : isPending ? 'Under Review' : isRejected ? 'Reapply' : 'Become a Transporter'}
                    </Text>
                    {!isPending && <FontAwesome name="arrow-right" size={12} color="#fff" />}
                  </>
                )}
              </Pressable>
            </View>
          );
        })()}  
      </View>

      {/* Market Validation Survey Card */}
      <Pressable
        style={({ pressed }) => [styles.dashboardCard, { borderColor: '#10b981' + '40' }, pressed && { opacity: 0.85 }]}
        onPress={() => router.push('/(tabs)/validation-survey' as any)}
      >
        <View style={styles.dashboardCardLeft}>
          <View style={[styles.dashboardIconBox, { backgroundColor: '#10b981' }]}>
            <FontAwesome name="clipboard" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dashboardCardTitle}>Market Validation Survey</Text>
            <Text style={styles.dashboardCardSubtitle}>Help us build a better TOLA — share your feedback</Text>
          </View>
        </View>
        <View style={[styles.dashboardActionBtn, { backgroundColor: '#10b981' }]}>
          <Text style={styles.dashboardActionBtnText}>Take Survey</Text>
          <FontAwesome name="arrow-right" size={12} color="#fff" />
        </View>
      </Pressable>

      {/* Vertical Navigation Items */}
      <View style={styles.navMenuCard}>
        {NAV_ITEMS.map((item, index) => {
          const isActive = activeTab === item.id;
          return (
            <View key={item.id}>
              <Pressable
                style={[styles.navItemBtn, isActive && styles.navItemBtnActive]}
                onPress={() => {
                  if (item.id === 'wishlist') {
                    router.push('/(tabs)/favorites');
                  } else {
                    setActiveTab(item.id);
                  }
                }}
              >
                <FontAwesome 
                  name={item.icon as any} 
                  size={16} 
                  color={isActive ? Theme.primary : Theme.textMuted} 
                  style={styles.navItemIcon}
                />
                <Text style={[styles.navItemText, isActive && styles.navItemTextActive]}>
                  {item.label}
                </Text>
                {isActive && (
                  <FontAwesome name="chevron-right" size={12} color={Theme.primary + '80'} style={{ marginLeft: 'auto' }} />
                )}
              </Pressable>
              {index < NAV_ITEMS.length - 1 && <View style={styles.navDivider} />}
            </View>
          );
        })}
        <View style={styles.navFooter}>
          <Text style={styles.memberSince}>
            MEMBER SINCE {new Date(session.user?.created_at as string || Date.now()).getFullYear()}
          </Text>
        </View>
      </View>

      {/* Main Tab Content */}
      <View style={styles.tabContentWrapper}>
        <Text style={styles.tabTitle}>{NAV_ITEMS.find(n => n.id === activeTab)?.label}</Text>
        <View style={styles.tabTitleDivider} />
        
        {activeTab === 'personal' && renderPersonalInfo()}
        {activeTab === 'kyc' && <KycVerificationSection accessToken={session.access_token!} userId={session.user?.id || ''} />}
        {activeTab === 'orders' && <OrderHistorySection accessToken={session.access_token!} />}
        {activeTab === 'transactions' && <TransactionHistorySection accessToken={session.access_token!} />}
        {activeTab === 'support' && <SupportSection accessToken={session.access_token!} />}
        {activeTab === 'settings' && renderSettings()}
      </View>

      {/* Theme Toggle Button at Bottom */}
      <ThemeToggle style={{ marginTop: 24, alignSelf: 'center' }} />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F5F7', 
  },
  content: { 
    paddingHorizontal: 16,
  },
  // Unauth
  unauthTitle: { fontSize: 24, fontWeight: '700', color: Theme.text },
  unauthSubtitle: { fontSize: 15, color: Theme.textSecondary, marginBottom: 24 },
  primaryBtn: { backgroundColor: Theme.primary, paddingVertical: 16, borderRadius: Theme.radiusMd, alignItems: 'center', marginBottom: 12, ...Theme.shadowSm },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { backgroundColor: '#fff', paddingVertical: 14, borderRadius: Theme.radiusMd, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: Theme.inputBorder },
  secondaryBtnText: { fontSize: 16, color: Theme.text },
  linkBtn: { alignItems: 'center', paddingVertical: 12 },
  linkBtnText: { fontSize: 15, color: Theme.link },
  
  // Header
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Theme.primary, // Using primary since we don't have CSS gradients easily here
    marginBottom: 16,
  },
  userHeaderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Theme.shadowSm,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.primary + '20',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadowSm,
  },
  verifiedMiniBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 1,
    ...Theme.shadowSm,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: Theme.textMuted,
  },
  badgeWrapper: {
    backgroundColor: Theme.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.textSecondary,
  },

  // Nav Menu
  navMenuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Theme.shadowSm,
    overflow: 'hidden',
    marginBottom: 20,
  },
  navItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  navItemBtnActive: {
    backgroundColor: Theme.primary + '10',
  },
  navItemIcon: {
    width: 20,
    textAlign: 'center',
    marginRight: 12,
  },
  navItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.textSecondary,
  },
  navItemTextActive: {
    color: Theme.primary,
    fontWeight: '700',
  },
  navDivider: {
    height: 1,
    backgroundColor: Theme.inputBorder,
    marginLeft: 48,
  },
  navFooter: {
    borderTopWidth: 1,
    borderTopColor: Theme.inputBorder,
    paddingVertical: 16,
    alignItems: 'center',
  },
  memberSince: {
    fontSize: 10,
    color: Theme.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Tab Content
  tabContentWrapper: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    padding: 20,
    ...Theme.shadowSm,
    minHeight: 300,
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.text,
  },
  tabTitleDivider: {
    height: 1,
    backgroundColor: Theme.inputBorder,
    marginVertical: 16,
  },
  tabContentInner: {
    gap: 16,
  },

  // Info card / Forms
  infoCard: {
    gap: 16,
  },
  field: { 
    gap: 6 
  },
  fieldLabel: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: Theme.textSecondary, 
  },
  fieldValue: { 
    fontSize: 15, 
    fontWeight: '500', 
    color: Theme.text 
  },
  fieldInput: { 
    backgroundColor: Theme.backgroundSecondary, 
    borderRadius: 12, 
    padding: 14, 
    fontSize: 15, 
    color: Theme.text, 
    borderWidth: 1, 
    borderColor: Theme.inputBorder 
  },
  fieldHint: { 
    fontSize: 11, 
    color: Theme.textMuted 
  },
  editActions: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 8 
  },
  cancelEditBtn: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: Theme.inputBorder, 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  cancelEditText: { 
    fontWeight: '600', 
    color: Theme.textSecondary 
  },
  saveBtn: { 
    flex: 1, 
    backgroundColor: Theme.primary, 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  saveBtnText: { 
    color: '#fff', 
    fontWeight: '600' 
  },
  editProfileBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    backgroundColor: Theme.primary, 
    paddingVertical: 14, 
    borderRadius: 12, 
    marginTop: 8 
  },
  editProfileBtnText: { 
    color: '#fff', 
    fontWeight: '700' 
  },
  
  // Settings
  settingsTitle: { fontSize: 16, fontWeight: '700', color: Theme.text },
  settingsDesc: { fontSize: 13, color: Theme.textMuted },
  dangerCard: { backgroundColor: '#fef2f2', borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', padding: 16, gap: 0 },
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  dangerLabel: { fontSize: 14, fontWeight: '700', color: Theme.text },
  dangerDesc: { fontSize: 12, color: Theme.textMuted },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#fecaca', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  dangerBtnText: { fontSize: 13, fontWeight: '700', color: Theme.error },
  dangerDivider: { height: 1, backgroundColor: '#fecaca', marginVertical: 8 },
  dashboardCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    padding: 16,
    gap: 14,
    marginBottom: 20,
    ...Theme.shadowSm,
  },
  dashboardCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dashboardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadowSm,
  },
  dashboardCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.text,
  },
  dashboardCardSubtitle: {
    fontSize: 12,
    color: Theme.textMuted,
    marginTop: 2,
  },
  dashboardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Theme.primary,
    paddingVertical: 12,
    borderRadius: 12,
    ...Theme.shadowSm,
  },
  dashboardActionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  // Role cards
  rolesSection: {
    marginBottom: 20,
    gap: 12,
  },
  rolesSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Theme.text,
    letterSpacing: -0.3,
  },
  rolesSectionSubtitle: {
    fontSize: 13,
    color: Theme.textMuted,
    marginBottom: 4,
  },
  roleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 16,
    gap: 12,
    ...Theme.shadowSm,
  },
  roleCardApproved: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  roleCardPending: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  roleCardRejected: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadowSm,
  },
  roleCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.text,
  },
  roleCardDesc: {
    fontSize: 12,
    color: Theme.textMuted,
    marginTop: 2,
  },
  roleApprovedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleApprovedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  rejectionReasonBox: {
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  rejectionReasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 2,
  },
  rejectionReasonText: {
    fontSize: 12,
    color: '#7f1d1d',
    lineHeight: 18,
  },
  roleActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    ...Theme.shadowSm,
  },
  roleActionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
