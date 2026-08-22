import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';

/**
 * Signed-out state for the profile tab: login/signup prompts plus the
 * market validation survey callout.
 */
export function UnauthenticatedProfileView() {
  const insets = useSafeAreaInsets();

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  content: {
    paddingHorizontal: 16,
  },
  unauthTitle: { fontSize: 24, fontWeight: '700', color: Theme.text },
  unauthSubtitle: { fontSize: 15, color: Theme.textSecondary, marginBottom: 24 },
  primaryBtn: { backgroundColor: Theme.primary, paddingVertical: 16, borderRadius: Theme.radiusMd, alignItems: 'center', marginBottom: 12, ...Theme.shadowSm },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { backgroundColor: '#fff', paddingVertical: 14, borderRadius: Theme.radiusMd, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: Theme.inputBorder },
  secondaryBtnText: { fontSize: 16, color: Theme.text },
  linkBtn: { alignItems: 'center', paddingVertical: 12 },
  linkBtnText: { fontSize: 15, color: Theme.link },
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
