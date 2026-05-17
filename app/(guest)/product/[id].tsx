import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiGet } from '@/src/services/api';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';
import { OptimizedImage } from '@/components/OptimizedImage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { useCart } from '@/src/contexts/CartContext';
import type { Product } from '@/src/types';

const { width } = Dimensions.get('window');

type Review = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  users?: { full_name: string };
};

export default function GuestProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const insets = useSafeAreaInsets();
  const { addItem, items } = useCart();

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [productData, reviewsData] = await Promise.all([
          apiGet<{ data: Product }>(`/products/${id}`),
          apiGet<{ data: Review[] }>(`/products/${id}/reviews`).catch(() => ({ data: [] })),
        ]);
        const actualProduct = productData?.data || (productData as any);
        setProduct(actualProduct);
        setReviews(reviewsData?.data || []);
        setQuantity(actualProduct?.moq ? Number(actualProduct.moq) : 1);
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addItem(product, quantity);
    setAdding(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/(tabs)/cart');
  };

  if (loading || !product) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16, justifyContent: 'center', alignItems: 'center' }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome name="chevron-left" size={16} color={Theme.text} />
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator size="large" color={Theme.primary} />
        ) : (
          <Text style={styles.muted}>Product not found</Text>
        )}
      </View>
    );
  }

  const images = (product.images && Array.isArray(product.images) && product.images.length > 0)
    ? product.images
    : [product.image_url];

  const averageRating = reviews.length > 0 
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
    : 5.0;

  const isInCart = items.some(item => item.product_id === product.id);
  const isSoldOut = product.stock_quantity === 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 16), paddingBottom: 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cinematic Gallery */}
        <View style={styles.galleryContainer}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const slide = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
              if (slide !== activeImageIndex) setActiveImageIndex(slide);
            }}
            scrollEventThrottle={16}
          >
            {images.map((img, idx) => (
              <View key={idx} style={{ width: width - 32, aspectRatio: 1 }}>
                <OptimizedImage source={img} width="100%" aspectRatio={1} />
              </View>
            ))}
          </ScrollView>
          
          <Pressable onPress={() => router.back()} style={styles.backBtnFloat}>
            <FontAwesome name="chevron-left" size={16} color={Theme.text} />
          </Pressable>

          {/* Badges Overlay */}
          <View style={styles.badgeOverlay}>
            <View style={styles.premiumBadge}>
              <FontAwesome name="star" size={10} color={Theme.primary} style={{ marginRight: 6 }} />
              <Text style={styles.premiumBadgeText}>POPULAR</Text>
            </View>
            {product.stock_quantity > 0 && (
              <View style={styles.dispatchBadge}>
                <FontAwesome name="bolt" size={10} color={Theme.primary} style={{ marginRight: 6 }} />
                <Text style={styles.dispatchBadgeText}>INSTANT DISPATCH</Text>
              </View>
            )}
          </View>

          {images.length > 1 && (
            <View style={styles.pagination}>
              {images.map((_, idx) => (
                <View key={idx} style={[styles.dot, activeImageIndex === idx && styles.activeDot]} />
              ))}
            </View>
          )}
        </View>

        {/* Elite Buy Box */}
        <View style={styles.infoContainer}>
          <View style={styles.ratingRow}>
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
              {averageRating.toFixed(1)} RATING / {reviews.length} REVIEWS
            </Text>
            {product.quality_grade && (
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeText}>GRADE {product.quality_grade}</Text>
              </View>
            )}
          </View>

          <Text style={styles.name}>{product.name}</Text>

          <View style={styles.verifiedRow}>
            <FontAwesome name="check-circle" size={14} color={Theme.primary} />
            <Text style={styles.verifiedText}>VERIFIED BY TOLA</Text>
          </View>

          <Text style={styles.desc}>{product.description}</Text>

          {isSoldOut && (
            <View style={styles.soldOutBox}>
              <View style={styles.soldOutIcon}>
                <FontAwesome name="shopping-bag" size={20} color="#dc2626" />
              </View>
              <View>
                <Text style={styles.soldOutTitle}>SOLD OUT PROFILE</Text>
                <Text style={styles.soldOutSub}>This item is currently unavailable.</Text>
              </View>
            </View>
          )}

          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{product.price?.toLocaleString() || '0'}</Text>
              <Text style={styles.currency}>{product.currency || 'TZS'}</Text>
            </View>

            <View style={styles.quantitySection}>
              <View style={styles.quantityBox}>
                <Text style={styles.quantityLabel}>ORDER QUANTITY</Text>
                <View style={styles.quantityControls}>
                  <Pressable 
                    style={styles.qBtn}
                    onPress={() => setQuantity(Math.max(product.moq ? Number(product.moq) : 1, quantity - 1))}
                  >
                    <FontAwesome name="minus" size={14} color={Theme.text} />
                  </Pressable>
                  <Text style={styles.qText}>{quantity}</Text>
                  <Pressable 
                    style={styles.qBtn}
                    onPress={() => setQuantity(Math.min(Number(product.stock_quantity) || 99, quantity + 1))}
                  >
                    <FontAwesome name="plus" size={14} color={Theme.text} />
                  </Pressable>
                </View>
              </View>
              <View style={styles.stockInfo}>
                <Text style={styles.stockText}>Min Order: {product.moq || 1} {product.unit || 'Units'}</Text>
                <Text style={styles.stockText}>{product.stock_quantity || 0} Units in inventory</Text>
              </View>
            </View>

            <View style={styles.protectRow}>
              <FontAwesome name="shield" size={20} color={Theme.primary} />
              <View style={styles.protectInfo}>
                <Text style={styles.protectTitle}>TOLA PROTECT ENABLED</Text>
                <Text style={styles.protectSub}>100% Payment Protection Guaranteed.</Text>
              </View>
            </View>
          </View>

          {/* Logistics & Returns */}
          <View style={styles.policyGrid}>
            <View style={styles.policyCard}>
              <FontAwesome name="truck" size={20} color={Theme.primary} style={{ marginBottom: 12 }} />
              <Text style={styles.policyLabel}>LOGISTICS</Text>
              <Text style={styles.policyValue}>
                {product.delivery_available !== false ? 'Door-to-Door Delivery Available' : 'Self-Collection Only'}
              </Text>
            </View>
            <View style={styles.policyCard}>
              <FontAwesome name="refresh" size={20} color={Theme.primary} style={{ marginBottom: 12 }} />
              <Text style={styles.policyLabel}>RETURN POLICY</Text>
              <Text style={styles.policyValue}>7-Day Verification</Text>
            </View>
          </View>

          {/* Merchant Spotlight */}
          <View style={styles.merchantCard}>
            <View style={styles.merchantHeader}>
              <View style={styles.merchantIconBox}>
                <FontAwesome name="lock" size={24} color={Theme.primary} />
              </View>
              <View>
                <Text style={styles.merchantLabel}>VERIFIED MERCHANT</Text>
                <Text style={styles.merchantName}>XXXXXX XXXXXX</Text>
              </View>
            </View>
            <View style={styles.merchantStatus}>
              <Text style={styles.merchantStatusLabel}>IDENTITY STATUS</Text>
              <Text style={styles.merchantStatusValue}>VERIFIED BY TOLA</Text>
            </View>
            <Text style={styles.merchantDisclaimer}>
              Seller details are hidden to prevent off-platform deals and ensure secure trade. Identity will be revealed after order placement.
            </Text>
          </View>

          {/* Metadata */}
          <View style={styles.metadataSection}>
            <Text style={styles.metadataTitle}>METADATA ARCHITECTURE</Text>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Identifier (SKU)</Text>
              <Text style={styles.metadataValue}>{product.sku || 'N/A'}</Text>
            </View>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Category Node</Text>
              <Text style={styles.metadataValue}>{product.categories?.name || 'Inventory'}</Text>
            </View>
          </View>

          {/* Reviews */}
          <View style={styles.reviewsSection}>
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
                        <FontAwesome 
                          key={i} 
                          name="star" 
                          size={12} 
                          color={i < review.rating ? '#fbbf24' : '#f3f4f6'} 
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewText}>"{review.comment}"</Text>
                </View>
              ))
            )}
          </View>

        </View>
      </ScrollView>

      {/* Floating Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable 
          style={[
            styles.addBtn, 
            (adding || isSoldOut) && { opacity: 0.7 },
            isInCart && { backgroundColor: '#f5f5f4', borderColor: '#e7e5e4', borderWidth: 1 }
          ]}
          onPress={handleAddToCart}
          disabled={adding || isSoldOut}
        >
          {isSoldOut ? (
            <Text style={styles.addBtnText}>SOLD OUT</Text>
          ) : isInCart ? (
            <View style={styles.btnContent}>
              <FontAwesome name="check" size={16} color="#16a34a" />
              <Text style={[styles.addBtnText, { color: '#57534e' }]}>IN YOUR CART</Text>
            </View>
          ) : (
            <View style={styles.btnContent}>
              <FontAwesome name="shopping-cart" size={16} color={Theme.primary} />
              <Text style={styles.addBtnText}>{adding ? 'ADDING...' : 'ADD TO CART'}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingHorizontal: 16, marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f5f4', alignItems: 'center', justifyContent: 'center' },
  backBtnFloat: { position: 'absolute', top: 16, left: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  muted: { color: Theme.textMuted, padding: 24, textAlign: 'center' },
  content: { paddingBottom: 24 },
  
  galleryContainer: { width: width - 32, marginHorizontal: 16, aspectRatio: 1, position: 'relative', backgroundColor: '#fafaf9', borderRadius: 32, overflow: 'hidden' },
  badgeOverlay: { position: 'absolute', top: 16, right: 16, gap: 8, zIndex: 5, alignItems: 'flex-end' },
  premiumBadge: { backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  premiumBadgeText: { fontSize: 9, fontWeight: '900', color: '#1c1917', letterSpacing: 1.5 },
  dispatchBadge: { backgroundColor: 'rgba(28,25,23,0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  dispatchBadgeText: { fontSize: 9, fontWeight: '900', color: '#ffffff', letterSpacing: 1.5 },
  pagination: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.2)' },
  activeDot: { backgroundColor: Theme.primary, width: 12 },
  
  infoContainer: { padding: 24, gap: 24, paddingTop: 16 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  stars: { flexDirection: 'row', gap: 2 },
  ratingText: { fontSize: 9, fontWeight: '900', color: '#a8a29e', letterSpacing: 1.5 },
  gradeBadge: { borderWidth: 1, borderColor: 'rgba(240, 185, 11, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  gradeText: { fontSize: 9, fontWeight: '900', color: Theme.primary, letterSpacing: 1.5 },
  
  name: { fontSize: 36, fontWeight: '900', color: '#0c0a09', lineHeight: 40, letterSpacing: -1 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verifiedText: { fontSize: 9, fontWeight: '900', color: Theme.primary, letterSpacing: 1.5 },
  desc: { fontSize: 16, color: '#57534e', lineHeight: 24, fontWeight: '500' },
  
  soldOutBox: { backgroundColor: '#fef2f2', borderColor: '#fee2e2', borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  soldOutIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  soldOutTitle: { fontSize: 10, fontWeight: '900', color: '#b91c1c', letterSpacing: 1.5 },
  soldOutSub: { fontSize: 12, fontWeight: '700', color: 'rgba(220,38,38,0.6)' },
  
  priceCard: { backgroundColor: '#ffffff', borderColor: '#f5f5f4', borderWidth: 2, borderRadius: 32, padding: 24, gap: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.04, shadowRadius: 32, elevation: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  price: { fontSize: 36, fontWeight: '900', color: '#0c0a09', letterSpacing: -1 },
  currency: { fontSize: 10, fontWeight: '900', color: '#a8a29e', letterSpacing: 1.5 },
  
  quantitySection: { gap: 16 },
  quantityBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafaf9', padding: 16, borderRadius: 16, borderColor: '#f5f5f4', borderWidth: 1 },
  quantityLabel: { fontSize: 9, fontWeight: '900', color: '#a8a29e', letterSpacing: 1.5 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qBtn: { width: 32, height: 32, backgroundColor: '#ffffff', borderRadius: 8, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  qText: { fontSize: 18, fontWeight: '900', minWidth: 24, textAlign: 'center' },
  stockInfo: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  stockText: { fontSize: 9, fontWeight: '700', color: '#a8a29e', fontStyle: 'italic' },
  
  protectRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderTopWidth: 1, borderTopColor: '#f5f5f4', paddingTop: 20 },
  protectInfo: { flex: 1 },
  protectTitle: { fontSize: 10, fontWeight: '900', color: '#1c1917', letterSpacing: 1 },
  protectSub: { fontSize: 9, color: '#a8a29e', fontWeight: '500', marginTop: 2 },
  
  policyGrid: { flexDirection: 'row', gap: 12 },
  policyCard: { flex: 1, backgroundColor: '#fafaf9', padding: 20, borderRadius: 24, borderColor: '#f5f5f4', borderWidth: 1 },
  policyLabel: { fontSize: 9, fontWeight: '900', color: '#a8a29e', letterSpacing: 1.5 },
  policyValue: { fontSize: 12, fontWeight: '700', color: '#1c1917', marginTop: 4 },
  
  merchantCard: { backgroundColor: '#0c0a09', padding: 24, borderRadius: 32, gap: 20, marginTop: 32 },
  merchantHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  merchantIconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#1c1917', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#292524' },
  merchantLabel: { fontSize: 9, fontWeight: '900', color: Theme.primary, letterSpacing: 1.5 },
  merchantName: { fontSize: 20, fontWeight: '900', color: '#ffffff', letterSpacing: 4, opacity: 0.5 },
  merchantStatus: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  merchantStatusLabel: { fontSize: 9, fontWeight: '900', color: '#78716c', letterSpacing: 2 },
  merchantStatusValue: { fontSize: 9, fontWeight: '900', color: Theme.primary, letterSpacing: 1.5 },
  merchantDisclaimer: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, fontSize: 10, color: '#a8a29e', fontStyle: 'italic', lineHeight: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  
  metadataSection: { gap: 12, paddingHorizontal: 16 },
  metadataTitle: { fontSize: 9, fontWeight: '900', color: '#a8a29e', letterSpacing: 3, marginBottom: 4 },
  metadataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f4' },
  metadataLabel: { fontSize: 11, fontWeight: '700', color: '#a8a29e' },
  metadataValue: { fontSize: 11, fontWeight: '900', color: '#1c1917', textTransform: 'uppercase' },
  
  reviewsSection: { gap: 20, marginTop: 16 },
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reviewsTitle: { fontSize: 24, fontWeight: '900', color: '#0c0a09', letterSpacing: -0.5 },
  divider: { height: 1, backgroundColor: '#f5f5f4' },
  emptyReviews: { padding: 32, alignItems: 'center', backgroundColor: '#fafaf9', borderRadius: 32, borderWidth: 2, borderColor: '#f5f5f4', borderStyle: 'dashed' },
  emptyReviewsText: { fontSize: 12, fontWeight: '700', color: '#a8a29e', fontStyle: 'italic', textAlign: 'center' },
  reviewCard: { padding: 24, backgroundColor: '#ffffff', borderRadius: 24, borderColor: '#f5f5f4', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 2, gap: 16 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fafaf9', alignItems: 'center', justifyContent: 'center' },
  reviewerInitials: { fontSize: 11, fontWeight: '900', color: '#a8a29e' },
  reviewerInfo: { flex: 1, marginLeft: 12 },
  reviewerName: { fontSize: 13, fontWeight: '900', color: '#0c0a09' },
  reviewDate: { fontSize: 9, fontWeight: '700', color: '#a8a29e', fontStyle: 'italic' },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewText: { fontSize: 13, fontWeight: '500', color: '#57534e', lineHeight: 20 },
  
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f5f5f4' },
  addBtn: { backgroundColor: '#0c0a09', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
});
