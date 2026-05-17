import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';

const TABS = ['Analytics', 'Vendor KYC', 'Transporter KYC', 'Product approval', 'Orders', 'Payouts', 'Support', 'Promotions'] as const;

export default function AdminDashboardScreen() {
  const { logout } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Analytics');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin</Text>
        <Pressable onPress={() => logout().then(() => router.replace('/(tabs)'))}>
          <Text style={styles.logout}>Logout</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]} numberOfLines={1}>{t}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Text style={styles.placeholder}>Admin dashboard – {tab}. Require admin role. Implement per web: analytics, KYC approvals, product approval, orders, transactions, payouts, support tickets, promotions, vendor/transporter/customer management.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: Theme.background, borderBottomWidth: 1, borderBottomColor: Theme.inputBorder },
  title: { fontSize: 18, fontWeight: '700', color: Theme.text },
  logout: { fontSize: 15, color: Theme.link },
  tabScroll: { backgroundColor: Theme.background, maxHeight: 48 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: Theme.primary },
  tabText: { fontSize: 13, color: Theme.text },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 48 },
  placeholder: { color: Theme.textMuted },
});
