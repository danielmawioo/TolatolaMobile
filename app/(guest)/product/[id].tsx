import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiGet } from '@/src/services/api';
import { Theme } from '@/constants/Theme';
import { OptimizedImage } from '@/components/OptimizedImage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';

export default function GuestProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<{
    id: string;
    name: string;
    price?: number;
    description?: string;
    shop_id?: string;
    image_url?: string;
    location?: string;
    moq?: string | number;
    delivery_available?: boolean;
    is_vendor_verified?: boolean;
    currency?: string;
  } | null>(null);
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
      
      <View style={styles.imageContainer}>
        <OptimizedImage source={product.image_url} width="100%" aspectRatio={1} />
        {product.is_vendor_verified && (
          <View style={styles.verifiedBadge}>
            <FontAwesome name="check-circle" size={16} color="#fff" />
            <Text style={styles.verifiedText}>Verified Vendor</Text>
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>
          {product.currency || 'TSh'} {product.price?.toLocaleString() || '—'}
        </Text>
        
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <FontAwesome name="map-marker" size={16} color={Theme.textSecondary} />
            <Text style={styles.metaLabel}>{product.location || 'Not specified'}</Text>
          </View>
          <View style={styles.metaItem}>
            <FontAwesome name="shopping-bag" size={16} color={Theme.textSecondary} />
            <Text style={styles.metaLabel}>MOQ: {product.moq || '1'}</Text>
          </View>
        </View>

        <View style={styles.deliveryRow}>
          <FontAwesome 
            name={product.delivery_available ? "truck" : "times-circle"} 
            size={18} 
            color={product.delivery_available ? Theme.success : Theme.error} 
          />
          <Text style={[styles.deliveryText, { color: product.delivery_available ? Theme.success : Theme.error }]}>
            {product.delivery_available ? 'Delivery Available' : 'No Delivery'}
          </Text>
        </View>

        {product.description ? (
          <View style={styles.descContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.desc}>{product.description}</Text>
          </View>
        ) : null}

        {product.shop_id ? (
          <Pressable 
            style={styles.shopLink} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/(guest)/shop-detail/${product.shop_id}`);
            }}
          >
            <View style={styles.shopLinkInner}>
              <FontAwesome name="university" size={18} color={Theme.link} />
              <Text style={styles.shopLinkText}>Visit Shop</Text>
            </View>
          </Pressable>
        ) : null}

        <Pressable 
          style={styles.addBtn}
          onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)}
        >
          <Text style={styles.addBtnText}>Add to cart (login required)</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  content: { paddingBottom: 24 },
  backText: { fontSize: 16, color: Theme.link, marginBottom: 16, paddingHorizontal: 16 },
  muted: { color: Theme.textMuted, padding: 24, textAlign: 'center' },
  imageContainer: { width: '100%', position: 'relative' },
  verifiedBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: Theme.verified,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  verifiedText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  infoContainer: { padding: 16 },
  name: { fontSize: 24, fontWeight: '700', color: Theme.text, marginBottom: 8 },
  price: { fontSize: 22, fontWeight: '700', color: Theme.primary, marginBottom: 16 },
  metaRow: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaLabel: { fontSize: 14, color: Theme.textSecondary },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  deliveryText: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Theme.text, marginBottom: 8 },
  descContainer: { marginBottom: 24 },
  desc: { fontSize: 15, color: Theme.textSecondary, lineHeight: 22 },
  shopLink: {
    backgroundColor: Theme.inputBg,
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  shopLinkInner: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  shopLinkText: { fontSize: 16, color: Theme.link, fontWeight: '600' },
  addBtn: { backgroundColor: Theme.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
