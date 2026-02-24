import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';

export default function FavoritesScreen() {
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
      <Text style={styles.title}>Favorites</Text>
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No saved products. Add from product detail.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  content: { paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: Theme.text, marginBottom: 20 },
  empty: { backgroundColor: Theme.background, borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyText: { color: Theme.textSecondary },
});
