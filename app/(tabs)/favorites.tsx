import React from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';
import { COPY } from '@/constants/copy';
import { EmptyState } from '@/components/EmptyState';

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
          paddingHorizontal: gap.md,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Wishlist</Text>
      <EmptyState
        icon="heart-o"
        title={COPY.empty.wishlistTitle}
        message={COPY.empty.wishlistMessage}
        actionLabel={COPY.empty.wishlistAction}
        onAction={() => router.push('/(tabs)/shop')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  content: { paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: Theme.text, marginBottom: 20 },
});
