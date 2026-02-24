import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';

export default function CartScreen() {
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
      <Text style={styles.title}>Cart</Text>
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Your cart is empty.</Text>
        <Pressable style={styles.btn} onPress={() => router.push('/(tabs)')}>
          <Text style={styles.btnText}>Continue shopping</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  content: { paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: Theme.text, marginBottom: 20 },
  empty: { backgroundColor: Theme.background, borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyText: { color: Theme.textSecondary, marginBottom: 16 },
  btn: { backgroundColor: Theme.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '600' },
});
