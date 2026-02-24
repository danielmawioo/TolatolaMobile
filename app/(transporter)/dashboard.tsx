import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';

const TABS = ['Assignments', 'Payments', 'Withdrawals', 'Membership', 'Profile'] as const;

export default function TransporterDashboardScreen() {
  const { logout } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Assignments');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TolaTola Transporter</Text>
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
        {tab === 'Assignments' && <Text style={styles.placeholder}>Available, Accepted, In transit, Completed. Accept assignment, update status.</Text>}
        {tab === 'Payments' && <Text style={styles.placeholder}>Payments list, available vs pending balance.</Text>}
        {tab === 'Withdrawals' && <Text style={styles.placeholder}>Request withdrawal (payment method, phone).</Text>}
        {tab === 'Membership' && <Text style={styles.placeholder}>Current plan, upgrade/pay.</Text>}
        {tab === 'Profile' && <Text style={styles.placeholder}>Edit: full name, phone, address; vehicle type, license plate. Update location (PUT /transporters/me/location).</Text>}
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
  placeholder: { color: Theme.textMuted },
});
