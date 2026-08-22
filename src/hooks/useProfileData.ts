import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { apiGet, apiPatch, apiPost } from '@/src/services/api';
import { logger } from '@/src/lib/logger';
import type { Session } from '@/src/contexts/AuthContext';

interface UseProfileDataParams {
  session: Session | null;
  setSession: (session: Session | null) => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Owns the profile fetch/refresh flow, the personal-info edit form, and the
 * account settings actions (password change, logout, delete account) for the
 * profile screen.
 */
export function useProfileData({ session, setSession, logout }: UseProfileDataParams) {
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
          },
        });
      }
    } catch (err) {
      logger.info('Error fetching fresh profile:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return {
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
  };
}
