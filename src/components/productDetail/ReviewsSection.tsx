import React from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import type { ProductReview } from '@/src/hooks/useProductDetailData';

interface ReviewsSectionProps {
  reviews: ProductReview[];
  onLayout: (event: LayoutChangeEvent) => void;
}

/**
 * "Client Testimony" section: review list or an empty-state message. Reports
 * its own layout Y position via onLayout so the screen can scroll to it.
 */
export function ReviewsSection({ reviews, onLayout }: ReviewsSectionProps) {
  return (
    <View style={styles.reviewsSection} onLayout={onLayout}>
      <View style={styles.reviewsHeader}>
        <FontAwesome name="comments" size={24} color={Theme.primary} />
        <Text style={styles.reviewsTitle}>Client Testimony</Text>
      </View>
      <View style={styles.divider} />

      {reviews.length === 0 ? (
        <View style={styles.emptyReviews}>
          <Text style={styles.emptyReviewsText}>No public testimonials yet for this inventory node.</Text>
        </View>
      ) : (
        reviews.map(review => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewerAvatar}>
                <Text style={styles.reviewerInitials}>{review.users?.full_name?.[0] || '?'}</Text>
              </View>
              <View style={styles.reviewerInfo}>
                <Text style={styles.reviewerName}>{review.users?.full_name || 'Merchant Client'}</Text>
                <Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</Text>
              </View>
              <View style={styles.reviewStars}>
                {[...Array(5)].map((_, i) => (
                  <FontAwesome key={i} name="star" size={12} color={i < review.rating ? '#fbbf24' : '#f3f4f6'} />
                ))}
              </View>
            </View>
            <Text style={styles.reviewText}>&quot;{review.comment}&quot;</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  reviewsSection: { gap: 16, marginTop: 16 },
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewsTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  divider: { height: 1, backgroundColor: '#f1f5f9' },
  emptyReviews: { padding: 24, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  emptyReviewsText: { fontSize: 11, fontWeight: '600', color: '#64748b', fontStyle: 'italic', textAlign: 'center' },
  reviewCard: { padding: 16, backgroundColor: '#ffffff', borderRadius: 20, borderColor: '#e2e8f0', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.01, shadowRadius: 4, elevation: 1, gap: 12 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewerAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  reviewerInitials: { fontSize: 10, fontWeight: '800', color: '#64748b' },
  reviewerInfo: { flex: 1, marginLeft: 10 },
  reviewerName: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  reviewDate: { fontSize: 8, fontWeight: '600', color: '#64748b', fontStyle: 'italic' },
  reviewStars: { flexDirection: 'row', gap: 1 },
  reviewText: { fontSize: 12, fontWeight: '500', color: '#475569', lineHeight: 18 },
});
