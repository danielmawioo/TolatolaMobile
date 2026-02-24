import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { apiGet } from '@/src/services/api';
import { Theme } from '@/constants/Theme';

/**
 * Guest/browse shop: product listing, category filter, search.
 * GET /categories, GET /products (or filtered).
 */
export default function GuestShopScreen() {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; price?: number; shop_id?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [catRes, prodRes] = await Promise.all([
          apiGet<{ categories?: { id: string; name: string }[] }>('/categories').catch(() => ({ categories: [] })),
          apiGet<{ products?: { id: string; name: string; price?: number; shop_id?: string }[] }>('/products').catch(() => ({ products: [] })),
        ]);
        setCategories(catRes?.categories || []);
        setProducts(prodRes?.products || (Array.isArray(prodRes) ? prodRes : []));
      } catch {
        setProducts([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedCategory]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 16,
          paddingBottom: 48 + insets.bottom,
        },
      ]}
    >
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

      {loading ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : (
        <View style={styles.grid}>
          {products.map((p) => (
            <Pressable
              key={p.id}
              style={styles.card}
              onPress={() => router.push(`/(guest)/product/${p.id}`)}
            >
              <View style={styles.cardImage} />
              <Text style={styles.cardName} numberOfLines={2}>{p.name}</Text>
              <Text style={styles.cardPrice}>{p.price != null ? `$${p.price}` : '—'}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {!loading && products.length === 0 && (
        <Text style={styles.muted}>No products yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  content: { paddingBottom: 24 },
  header: { marginBottom: 16 },
  backText: { fontSize: 16, color: Theme.link },
  title: { fontSize: 24, fontWeight: '700', color: Theme.text, marginTop: 8 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: Theme.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  chipActive: { backgroundColor: Theme.primary, borderColor: Theme.primary },
  chipText: { fontSize: 14, color: Theme.text },
  chipTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%',
    backgroundColor: Theme.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  cardImage: { width: '100%', aspectRatio: 1, backgroundColor: Theme.inputBg, borderRadius: 8, marginBottom: 8 },
  cardName: { fontSize: 14, color: Theme.text, marginBottom: 4 },
  cardPrice: { fontSize: 14, fontWeight: '600', color: Theme.primary },
  muted: { textAlign: 'center', color: Theme.textMuted, marginTop: 24 },
});
