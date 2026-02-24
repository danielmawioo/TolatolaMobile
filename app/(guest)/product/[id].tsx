import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiGet } from '@/src/services/api';
import { Theme } from '@/constants/Theme';

export default function GuestProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<{ id: string; name: string; price?: number; description?: string; shop_id?: string } | null>(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await apiGet(`/products/${id}`);
        setProduct(data as any);
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const insets = useSafeAreaInsets();

  if (loading || !product) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()}><Text style={styles.backText}>← Back</Text></Pressable>
        <Text style={styles.muted}>{loading ? 'Loading…' : 'Product not found'}</Text>
      </View>
    );
  }

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
      <Pressable onPress={() => router.back()}><Text style={styles.backText}>← Back</Text></Pressable>
      <View style={styles.imagePlaceholder} />
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.price}>{product.price != null ? `$${product.price}` : '—'}</Text>
      {product.description ? <Text style={styles.desc}>{product.description}</Text> : null}
      {product.shop_id ? (
        <Pressable style={styles.shopLink} onPress={() => router.push(`/(guest)/shop-detail/${product.shop_id}`)}>
          <Text style={styles.shopLinkText}>View shop</Text>
        </Pressable>
      ) : null}
      <Pressable style={styles.addBtn}><Text style={styles.addBtnText}>Add to cart (login required)</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  content: { paddingBottom: 24 },
  backText: { fontSize: 16, color: Theme.link, marginBottom: 16 },
  muted: { color: Theme.textMuted, padding: 24 },
  imagePlaceholder: { width: '100%', aspectRatio: 1, backgroundColor: Theme.inputBg, borderRadius: 12, marginBottom: 16 },
  name: { fontSize: 22, fontWeight: '700', color: Theme.text, marginBottom: 8 },
  price: { fontSize: 20, fontWeight: '600', color: Theme.primary, marginBottom: 16 },
  desc: { fontSize: 15, color: Theme.textSecondary, lineHeight: 22, marginBottom: 20 },
  shopLink: { marginBottom: 20 },
  shopLinkText: { fontSize: 15, color: Theme.link },
  addBtn: { backgroundColor: Theme.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
