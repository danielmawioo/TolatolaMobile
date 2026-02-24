import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
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
      <Text style={styles.title}>Orders</Text>
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No orders yet</Text>
        <Text style={styles.emptyText}>
          Your orders will appear here.
        </Text>
        <Pressable
          style={styles.demoBtn}
          onPress={() => router.push('/payment-success')}
        >
          <Text style={styles.demoBtnText}>View payment success (demo)</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  content: { paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: Theme.text, marginBottom: 20 },
  empty: {
    backgroundColor: Theme.background,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Theme.textSecondary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Theme.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  demoBtn: {
    backgroundColor: Theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  demoBtnText: { color: '#fff', fontWeight: '600' },
});
