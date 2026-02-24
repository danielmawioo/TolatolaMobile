import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';

const TABS = ['Overview', 'Orders', 'Wallet', 'Subscription', 'Shop'] as const;

export default function VendorDashboardScreen() {
  const { session, logout } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TolaTola Vendor</Text>
        <Pressable onPress={() => logout().then(() => router.replace('/(guest)/home'))}>
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
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {tab === 'Overview' && (
          <>
            <Text style={styles.sectionTitle}>Overview / Products</Text>
            <Text style={styles.placeholder}>Shop summary, product cards. Add product, Edit product.</Text>
            <Pressable style={styles.btn} onPress={() => {}}><Text style={styles.btnText}>Create shop</Text></Pressable>
          </>
        )}
        {tab === 'Orders' && <Text style={styles.placeholder}>GET /shops/:shopId/orders. List by status.</Text>}
        {tab === 'Wallet' && <Text style={styles.placeholder}>Balance, payouts, request payout.</Text>}
        {tab === 'Subscription' && <Text style={styles.placeholder}>Current plan, upgrade/pay.</Text>}
        {tab === 'Shop' && <Text style={styles.placeholder}>Shop name, description, address. Edit shop.</Text>}
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
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: Theme.primary },
  tabText: { fontSize: 14, color: Theme.text },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 48 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Theme.text, marginBottom: 12 },
  placeholder: { color: Theme.textMuted, marginBottom: 16 },
  btn: { backgroundColor: Theme.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', alignSelf: 'flex-start' },
  btnText: { color: '#fff', fontWeight: '600' },
});
