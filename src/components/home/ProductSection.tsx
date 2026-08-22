import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Theme } from '@/constants/Theme';
import { ProductCard } from '@/components/ProductCard';
import type { Product } from '@/src/types';
import type { CartItem } from '@/src/contexts/CartContext';
import type { useThemeColors } from '@/src/hooks/useThemeColors';

type ThemeColors = ReturnType<typeof useThemeColors>;

interface ProductSectionProps {
  theme: ThemeColors;
  subtitle?: string;
  titleMain: string;
  titleItalic: string;
  italicColor: string;
  products: Product[];
  badge: { text: string; variant: 'new' | 'deal' | 'hot' };
  likedIds: Set<string>;
  cartItems: CartItem[];
  onAddToCart: (product: Product) => void;
  onToggleLike: (productId: string) => void;
}

/**
 * Generic horizontally-scrolling product carousel section, used for the
 * "Supply Chain Matches", "Recommended For You", "Handpicked for You",
 * "Most Selling" and "Best Deals" sections on the home screen. They all
 * share the same header + horizontal ProductCard list structure and only
 * differ in copy, badge and italic accent color.
 */
export function ProductSection({
  theme,
  subtitle,
  titleMain,
  titleItalic,
  italicColor,
  products,
  badge,
  likedIds,
  cartItems,
  onAddToCart,
  onToggleLike,
}: ProductSectionProps) {
  if (products.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          {subtitle && <Text style={[styles.sectionSub, { color: theme.primary }]}>{subtitle}</Text>}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {titleMain}
            <Text style={{ color: italicColor, fontStyle: 'italic' }}>{titleItalic}</Text>
          </Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/shop')}><Text style={styles.seeAll}>See All</Text></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            badge={badge}
            isLiked={likedIds.has(p.id)}
            isInCart={cartItems.some((i) => i.product_id === p.id)}
            onAddToCart={onAddToCart}
            onToggleLike={onToggleLike}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, paddingHorizontal: 16 },
  sectionSub: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: Theme.primary, letterSpacing: 1, marginBottom: 2, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: Theme.text },
  seeAll: { fontSize: 13, fontWeight: '700', color: Theme.primary },
  horizontalList: { paddingLeft: 16, paddingRight: 16 },
});
