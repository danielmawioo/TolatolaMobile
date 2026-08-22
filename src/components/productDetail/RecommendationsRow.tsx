import React from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { OptimizedImage } from '@/components/OptimizedImage';
import { Theme } from '@/constants/Theme';
import type { Product } from '@/src/types';

interface RecommendationsRowProps {
  recommendations: Product[];
}

/**
 * "You May Also Like" horizontal cross-sell row. Renders nothing when there
 * are no recommendations.
 */
export function RecommendationsRow({ recommendations }: RecommendationsRowProps) {
  if (recommendations.length === 0) return null;

  return (
    <View style={styles.recsSection}>
      <View style={styles.recsHeader}>
        <FontAwesome name="line-chart" size={20} color={Theme.primary} />
        <Text style={styles.recsTitle}>You May Also Like</Text>
      </View>
      <View style={styles.divider} />
      <FlatList
        data={recommendations}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingRight: 16 }}
        renderItem={({ item: rec }) => (
          <Pressable style={styles.recCard} onPress={() => router.push(`/(guest)/product/${rec.id}`)}>
            <View style={styles.recImageContainer}>
              <OptimizedImage
                source={(rec.images && Array.isArray(rec.images) && rec.images.length > 0) ? rec.images[0] as string : rec.image_url}
                width={160}
                aspectRatio={4 / 3}
                style={styles.recImage}
              />
            </View>
            <View style={styles.recContent}>
              <View style={styles.recVerifiedTag}>
                <FontAwesome name="check-circle" size={10} color={Theme.success} />
                <Text style={styles.recVerifiedText}>Verified</Text>
              </View>
              <Text style={styles.recName} numberOfLines={2}>{rec.name}</Text>
              <Text style={styles.recPrice}>
                {rec.price?.toLocaleString()} <Text style={styles.recCurrency}>TZS{rec.weight_unit ? ` / ${rec.weight_unit}` : ''}</Text>
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  recsSection: { gap: 12, marginTop: 24 },
  recsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recsTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  divider: { height: 1, backgroundColor: '#f1f5f9' },
  recCard: { width: 140, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9', ...Theme.shadowSm },
  recImageContainer: { width: 140, aspectRatio: 4 / 3, backgroundColor: '#f8fafc' },
  recImage: { width: '100%', height: '100%' },
  recContent: { padding: 8, gap: 2 },
  recVerifiedTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  recVerifiedText: { fontSize: 7, fontWeight: '800', color: Theme.success, textTransform: 'uppercase' },
  recName: { fontSize: 11, fontWeight: '600', color: '#0f172a', lineHeight: 14 },
  recPrice: { fontSize: 12, fontWeight: '800', color: '#0B5ED7' },
  recCurrency: { fontSize: 8, fontWeight: '600' },
});
