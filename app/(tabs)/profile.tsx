import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';
import { apiGet, apiPatch } from '@/src/services/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';

/**
 * Account tab: show auth prompts when not logged in; profile when logged in.
 * Auth pages only when user needs them (e.g. to buy or view account).
 */
export default function ProfileScreen() {
  const { session, logout, setSession } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
  });

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

  if (!session) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 16,
            paddingBottom: 100 + insets.bottom,
          },
        ]}
      >
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Sign in to save items, track orders, and manage your profile.</Text>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.primaryBtnText}>Log in</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={styles.secondaryBtnText}>Sign up</Text>
        </Pressable>
        <Pressable
          style={styles.linkBtn}
          onPress={() => router.push('/(guest)/track')}
        >
          <Text style={styles.linkBtnText}>Track order</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 16,
          paddingBottom: 100 + insets.bottom,
        },
      ]}
    >
      <View style={styles.headerRow}>
        {!editing ? (
          <Pressable onPress={() => setEditing(true)}>
            <Text style={styles.editLink}>Edit</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => setEditing(false)}>
            <Text style={styles.cancelLink}>Cancel</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Full Name</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={formData.full_name}
              onChangeText={(t) => setFormData(f => ({ ...f, full_name: t }))}
              placeholder="Your full name"
            />
          ) : (
            <Text style={styles.value}>{session.user?.full_name || '—'}</Text>
          )}
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={[styles.value, { color: Theme.textMuted }]}>{session.user?.email || '—'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Phone Number</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(t) => setFormData(f => ({ ...f, phone: t }))}
              placeholder="Your phone number"
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={styles.value}>{String(session.user?.phone || 'Not provided')}</Text>
          )}
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Account type</Text>
          <Text style={styles.value}>{(session.user?.user_type as string) || '—'}</Text>
        </View>

        {editing && (
          <Pressable 
            style={[styles.saveBtn, loading && { opacity: 0.7 }]} 
            onPress={handleUpdateProfile}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
          </Pressable>
        )}
      </View>

      <Pressable style={styles.menuItem} onPress={() => router.push('/(tabs)/orders')}>
        <View style={styles.menuItemInner}>
          <View style={styles.menuIcon}>
            <FontAwesome name="shopping-bag" size={18} color={Theme.primary} />
          </View>
          <Text style={styles.menuLabel}>My Orders</Text>
        </View>
        <FontAwesome name="chevron-right" size={14} color={Theme.textMuted} />
      </Pressable>

      <Pressable style={styles.menuItem} onPress={() => router.push('/(tabs)/favorites')}>
        <View style={styles.menuItemInner}>
          <View style={styles.menuIcon}>
            <FontAwesome name="heart" size={18} color={Theme.error} />
          </View>
          <Text style={styles.menuLabel}>Favorites</Text>
        </View>
        <FontAwesome name="chevron-right" size={14} color={Theme.textMuted} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
        onPress={handleLogout}
      >
        <FontAwesome name="sign-out" size={20} color={Theme.error} />
        <Text style={styles.logoutBtnText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  content: { paddingBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: Theme.text },
  editLink: { color: Theme.link, fontWeight: '600' },
  cancelLink: { color: Theme.textMuted },
  subtitle: { fontSize: 15, color: Theme.textSecondary, marginBottom: 24 },
  primaryBtn: { backgroundColor: Theme.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { backgroundColor: Theme.background, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: Theme.inputBorder },
  secondaryBtnText: { fontSize: 16, color: Theme.text },
  linkBtn: { alignItems: 'center', paddingVertical: 12 },
  linkBtnText: { fontSize: 15, color: Theme.link },
  card: { backgroundColor: Theme.background, borderRadius: 12, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: Theme.inputBorder },
  row: { marginBottom: 16 },
  label: { fontSize: 12, color: Theme.textSecondary, marginBottom: 4 },
  value: { fontSize: 16, color: Theme.text, fontWeight: '500' },
  input: { backgroundColor: Theme.backgroundSecondary, borderRadius: 8, padding: 12, fontSize: 16, color: Theme.text, borderWidth: 1, borderColor: Theme.inputBorder },
  saveBtn: { backgroundColor: Theme.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Theme.background, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: Theme.inputBorder },
  menuItemInner: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Theme.backgroundSecondary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuLabel: { fontSize: 16, color: Theme.text, fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 10, marginTop: 12 },
  logoutBtnPressed: { opacity: 0.7 },
  logoutBtnText: { color: Theme.error, fontSize: 16, fontWeight: '600' },
});
