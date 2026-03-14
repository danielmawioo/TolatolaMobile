import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiGet } from '@/src/services/api';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';

export default function GuestShopDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [shop, setShop] = useState<{ id: string; name: string; description?: string; address?: string; phone?: string } | null>(null);
  const [products, setProducts] = useState<{ id: string; name: string; price?: number }[]>([]);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [shopData, prodsData] = await Promise.all([
          apiGet(`/shops/${id}`),
          apiGet<{ products?: { id: string; name: string; price?: number }[] }>(`/shops/${id}/products`).catch(() => ({ products: [] })),
        ]);
        setShop(shopData as any);
        setProducts((prodsData as any)?.products || []);
      } catch {
        setShop(null);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const safePadding = {
    paddingTop: insets.top + 16,
    paddingBottom: 48 + insets.bottom,
    paddingHorizontal: gap.md,
  };

  if (loading || !shop) {
    return (
      <View style={[styles.container, safePadding]}>
        <Pressable onPress={() => router.back()}><Text style={styles.backText}>← Back</Text></Pressable>
        <Text style={styles.muted}>{loading ? 'Loading…' : 'Shop not found'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, safePadding]} showsVerticalScrollIndicator={false}>
      <Pressable onPress={() => router.back()}><Text style={styles.backText}>← Back</Text></Pressable>
      <Text style={styles.name}>{shop.name}</Text>
      {shop.description ? <Text style={styles.desc}>{shop.description}</Text> : null}
      {shop.address ? <Text style={styles.meta}>Address: {shop.address}</Text> : null}
      {shop.phone ? <Text style={styles.meta}>Phone: {shop.phone}</Text> : null}
      <Text style={styles.sectionTitle}>Products</Text>
      {products.map((p) => (
        <Pressable
          key={p.id}
          style={styles.productRow}
          onPress={() => router.push(`/(guest)/product/${p.id}`)}
        >
          <Text style={styles.productName}>{p.name}</Text>
          <Text style={styles.productPrice}>{p.price != null ? `TSh ${p.price.toLocaleString()}` : '—'}</Text>
        </Pressable>
      ))}
      {products.length === 0 && <Text style={styles.muted}>No products.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  content: { paddingBottom: 24 },
  backText: { fontSize: 16, color: Theme.link, marginBottom: 16 },
  muted: { color: Theme.textMuted, marginTop: 16 },
  name: { fontSize: 22, fontWeight: '700', color: Theme.text, marginBottom: 8 },
  desc: { fontSize: 15, color: Theme.textSecondary, marginBottom: 12 },
  meta: { fontSize: 14, color: Theme.textMuted, marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Theme.text, marginTop: 24, marginBottom: 12 },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBorder,
  },
  productName: { fontSize: 15, color: Theme.text },
  productPrice: { fontSize: 15, fontWeight: '600', color: Theme.primary },
});
