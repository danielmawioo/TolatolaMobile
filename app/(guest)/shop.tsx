import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiGet } from '@/src/services/api';
import { Theme } from '@/constants/Theme';
import { Skeleton } from '@/components/Skeleton';
import { OptimizedImage } from '@/components/OptimizedImage';
import { EmptyState } from '@/components/EmptyState';
import { gap } from '@/constants/layout';
import type { Product } from '@/src/types';
import { COPY } from '@/constants/copy';

/**
 * Guest/browse shop: product listing, category filter, search.
 * GET /categories, GET /products (or filtered).
 */
export default function GuestShopScreen() {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        apiGet<{ categories?: { id: string; name: string }[] }>('/categories').catch(() => ({ categories: [] })),
        apiGet<{ products?: Product[] } | Product[]>('/products').catch(() => []),
      ]);
      setCategories(catRes?.categories || []);
      const receivedProducts = (prodRes as { products?: Product[] })?.products ?? (Array.isArray(prodRes) ? prodRes : []);
      setProducts(receivedProducts);
    } catch {
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Shop</Text>
      </View>

      <View style={styles.categoryRow}>
        <Pressable
          style={[styles.chip, !selectedCategory && styles.chipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>All</Text>
        </Pressable>
        {categories.map((c) => (
          <Pressable
            key={c.id}
            style={[styles.chip, selectedCategory === c.id && styles.chipActive]}
            onPress={() => setSelectedCategory(c.id)}
          >
            <Text style={[styles.chipText, selectedCategory === c.id && styles.chipTextActive]}>{c.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
          {renderHeader()}
          <View style={styles.grid}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.card}>
                <Skeleton width="100%" height={140} borderRadius={8} style={{ marginBottom: 12 }} />
                <Skeleton width="80%" height={14} style={{ marginBottom: 8 }} />
                <Skeleton width="50%" height={18} />
              </View>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + 16,
              paddingBottom: 48 + insets.bottom,
              paddingHorizontal: 16,
            },
          ]}
          ListHeaderComponent={renderHeader}
          renderItem={({ item: p }: { item: Product }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/(guest)/product/${p.id}`)}
            >
              <OptimizedImage source={p.image_url} width="100%" aspectRatio={1} style={{ marginBottom: 8 }} />
              <Text style={styles.cardName} numberOfLines={2}>{p.name}</Text>
              <Text style={styles.cardPrice}>TSh {p.price?.toLocaleString() || '—'}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="search"
              title={COPY.empty.shopProducts}
              message="Try another category or check back later."
              actionLabel="Browse home"
              onAction={() => router.push('/(guest)/home')}
              style={{ marginTop: 24 }}
            />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  content: { paddingBottom: 24 },
  headerContent: { marginBottom: 16 },
  header: {},
  backText: { fontSize: 16, color: Theme.link },
  title: { fontSize: 24, fontWeight: '700', color: Theme.text, marginTop: 8 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, marginBottom: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: Theme.background,
    borderRadius: 20,
    ...Theme.shadowSm,
  },
  chipActive: { backgroundColor: Theme.primary },
  chipText: { fontSize: 14, color: Theme.text },
  chipTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 16 },
  card: {
    width: '48%',
    backgroundColor: Theme.background,
    borderRadius: Theme.radiusMd,
    padding: 12,
    ...Theme.shadowSm,
  },
  cardImage: { width: '100%', aspectRatio: 1, backgroundColor: Theme.inputBg, borderRadius: 8, marginBottom: 8 },
  cardName: { fontSize: 14, color: Theme.text, marginBottom: 4 },
  cardPrice: { fontSize: 14, fontWeight: '600', color: Theme.primary },
});
