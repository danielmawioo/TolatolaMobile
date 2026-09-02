import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { getRoleRedirectPath } from '@/src/lib/roleRedirect';
import { Theme } from '@/constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { OrderHistorySection } from '@/src/components/profile/OrderHistorySection';
import { TransactionHistorySection } from '@/src/components/profile/TransactionHistorySection';
import { SupportSection } from '@/src/components/profile/SupportSection';
import { KycVerificationSection } from '@/src/components/profile/KycVerificationSection';
import { UnauthenticatedProfileView } from '@/src/components/profile/UnauthenticatedProfileView';
import { ProfileHeaderCard } from '@/src/components/profile/ProfileHeaderCard';
import { BusinessRolesSection } from '@/src/components/profile/BusinessRolesSection';
import { PersonalInfoSection } from '@/src/components/profile/PersonalInfoSection';
import { AccountSettingsSection } from '@/src/components/profile/AccountSettingsSection';
import { ThemeToggle } from '@/src/components/ThemeToggle';
import { useProfileData } from '@/src/hooks/useProfileData';

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
  const { session, logout, setSession } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');

  const {
    refreshing,
    handleRefresh,
    editing,
    setEditing,
    loading,
    formData,
    setFormData,
    passwordData,
    setPasswordData,
    changingPw,
    handleLogout,
    handleUpdateProfile,
    handlePasswordChange,
    handleDeleteAccount,
  } = useProfileData({ session, setSession, logout });

  // Unauthenticated view
  if (!session) {
    return <UnauthenticatedProfileView />;
  }

  const userName = (session.user?.full_name as string) || (session.user as any)?.name || 'User';
  const userEmail = session.user?.email || '';
  const userType = (session.user?.user_type as string) || (session.user as any)?.role || 'customer';
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  // KYC status check from nested session object or profile fallback
  const rawKycStatus = (session.user as any)?.kyc?.kyc_status || (session.user as any)?.kyc_status;

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
      <ProfileHeaderCard
        userName={userName}
        userEmail={userEmail}
        initials={initials}
        profileImageUrl={session.user?.profile_image_url as string | undefined}
        rawKycStatus={rawKycStatus}
      />

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
      <BusinessRolesSection />

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
        
        {activeTab === 'personal' && (
          <PersonalInfoSection
            editing={editing}
            setEditing={setEditing}
            formData={formData}
            setFormData={setFormData}
            loading={loading}
            onSave={handleUpdateProfile}
            userName={userName}
            userEmail={userEmail}
            userType={userType}
            phone={String(session.user?.phone || '')}
          />
        )}
        {activeTab === 'kyc' && <KycVerificationSection accessToken={session.access_token!} userId={session.user?.id || ''} />}
        {activeTab === 'orders' && <OrderHistorySection accessToken={session.access_token!} />}
        {activeTab === 'transactions' && <TransactionHistorySection accessToken={session.access_token!} />}
        {activeTab === 'support' && <SupportSection accessToken={session.access_token!} />}
        {activeTab === 'settings' && (
          <AccountSettingsSection
            passwordData={passwordData}
            setPasswordData={setPasswordData}
            changingPw={changingPw}
            onChangePassword={handlePasswordChange}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
            userEmail={userEmail}
          />
        )}
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
  // Header
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Theme.primary, // Using primary since we don't have CSS gradients easily here
    marginBottom: 16,
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

  // Dashboard / promo cards
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
});
