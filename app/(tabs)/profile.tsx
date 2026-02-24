import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';

/**
 * Account tab: show auth prompts when not logged in; profile when logged in.
 * Auth pages only when user needs them (e.g. to buy or view account).
 */
export default function ProfileScreen() {
  const { session, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    await logout();
    router.replace('/(tabs)');
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
      <Text style={styles.title}>Account</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{session.user?.full_name || '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{session.user?.email || '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Account type</Text>
          <Text style={styles.value}>{(session.user?.user_type as string) || '—'}</Text>
        </View>
      </View>

      <Pressable style={styles.ordersLink} onPress={() => router.push('/(tabs)/orders')}>
        <Text style={styles.ordersLinkText}>My orders</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  content: { paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: Theme.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: Theme.textSecondary, marginBottom: 24 },
  primaryBtn: {
    backgroundColor: Theme.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: {
    backgroundColor: Theme.background,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  secondaryBtnText: { fontSize: 16, color: Theme.text },
  linkBtn: { alignItems: 'center', paddingVertical: 12 },
  linkBtnText: { fontSize: 15, color: Theme.link },
  card: {
    backgroundColor: Theme.background,
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  row: { marginBottom: 14 },
  label: { fontSize: 12, color: Theme.textSecondary, marginBottom: 2 },
  value: { fontSize: 16, color: Theme.text, fontWeight: '500' },
  ordersLink: { marginBottom: 20 },
  ordersLinkText: { fontSize: 16, color: Theme.link },
  button: {
    backgroundColor: Theme.error,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.9 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
