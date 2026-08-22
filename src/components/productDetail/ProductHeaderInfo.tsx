import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import type { Product } from '@/src/types';

interface ProductHeaderInfoProps {
  product: Product;
  averageRating: number;
  reviewsCount: number;
  productLocation: string | null;
  onPressRating: () => void;
}

/**
 * Rating summary row, product name, verified/location badges, and description
 * shown at the top of the product detail buy box.
 */
export function ProductHeaderInfo({
  product,
  averageRating,
  reviewsCount,
  productLocation,
  onPressRating,
}: ProductHeaderInfoProps) {
  return (
    <>
      <Pressable onPress={onPressRating} style={styles.ratingRow}>
        <View style={styles.stars}>
          {[...Array(5)].map((_, i) => (
            <FontAwesome
              key={i}
              name="star"
              size={14}
              color={i < Math.round(averageRating) ? '#fbbf24' : '#e5e7eb'}
            />
          ))}
        </View>
        <Text style={styles.ratingText}>
          {averageRating.toFixed(1)} RATING / {reviewsCount} REVIEWS
        </Text>
        {product.quality_grade && (
          <View style={styles.gradeBadge}>
            <Text style={styles.gradeText}>GRADE {product.quality_grade}</Text>
          </View>
        )}
      </Pressable>

      <Text style={styles.name}>{product.name}</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <View style={styles.verifiedRow}>
          <FontAwesome name="check-circle" size={14} color={Theme.primary} />
          <Text style={styles.verifiedText}>VERIFIED BY TOLA</Text>
        </View>
        {productLocation && (
          <View style={[styles.verifiedRow, { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }]}>
            <FontAwesome name="map-marker" size={14} color={Theme.primary} />
            <Text style={[styles.verifiedText, { color: '#334155' }]}>{productLocation.toUpperCase()}</Text>
          </View>
        )}
      </View>

      <Text style={styles.desc}>{product.description}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  ratingRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6, borderWidth: 1, borderColor: '#fde68a' },
  stars: { flexDirection: 'row', gap: 1 },
  ratingText: { fontSize: 9, fontWeight: '800', color: '#b45309', letterSpacing: 0.5 },
  gradeBadge: { backgroundColor: 'rgba(37,99,235,0.08)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginLeft: 4, borderWidth: 1, borderColor: 'rgba(37,99,235,0.15)' },
  gradeText: { fontSize: 8, fontWeight: '900', color: Theme.primary, letterSpacing: 0.5 },
  name: { fontSize: 26, fontWeight: '800', color: '#0f172a', lineHeight: 32, letterSpacing: -0.5 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, backgroundColor: '#dbeafe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' },
  verifiedText: { fontSize: 9, fontWeight: '900', color: '#1e40af', letterSpacing: 0.5 },
  desc: { fontSize: 15, color: '#475569', lineHeight: 22, fontWeight: '500' },
});
