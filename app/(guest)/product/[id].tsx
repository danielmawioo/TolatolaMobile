import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, ActivityIndicator, FlatList } from 'react-native';
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
  const [selectedColor, setSelectedColor] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const [testimonyY, setTestimonyY] = useState(0);

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

        if (actualProduct?.colors && Array.isArray(actualProduct.colors) && actualProduct.colors.length > 0) {
          setSelectedColor(actualProduct.colors[0]);
        }
        if (actualProduct?.sizes && Array.isArray(actualProduct.sizes) && actualProduct.sizes.length > 0) {
          setSelectedSize(actualProduct.sizes[0]);
        }
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    apiGet<{ data: Product[] }>(`/products/${id}/recommendations`)
      .then(res => setRecommendations(res?.data || []))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedColor]);

  const scrollToTestimony = () => {
    if (scrollViewRef.current && testimonyY > 0) {
      scrollViewRef.current.scrollTo({ y: testimonyY - 20, animated: true });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const isFashion = product?.categories?.name?.toLowerCase() === "fashion" ||
                    product?.category_name?.toLowerCase() === "fashion" ||
                    (product?.colors && product.colors.length > 0) ||
                    (product?.sizes && product.sizes.length > 0);

  const resolvedPrice = (isFashion && selectedSize && product?.size_prices?.[selectedSize])
    ? Number(product.size_prices[selectedSize])
    : ((isFashion && selectedColor?.price) ? Number(selectedColor.price) : Number(product?.price || 0));

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const productWithResolvedPrice = {
      ...product,
      price: resolvedPrice
    };
    await addItem(productWithResolvedPrice, quantity, selectedColor, selectedSize || undefined);
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

  const galleryImages = [...images];
  if (selectedColor?.image && !galleryImages.includes(selectedColor.image)) {
    galleryImages.unshift(selectedColor.image);
  }

  const averageRating = reviews.length > 0 
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
    : 5.0;

  const isInCart = items.some(item => 
    item.product_id === product.id &&
    (!product.colors || !Array.isArray(product.colors) || product.colors.length === 0 || item.selected_color?.name === selectedColor?.name) &&
    (!product.sizes || !Array.isArray(product.sizes) || product.sizes.length === 0 || item.selected_size === selectedSize)
  );
  const isSoldOut = product.stock_quantity === 0;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
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
            {galleryImages.map((img, idx) => (
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
            {Number(product?.stock_quantity ?? product?.stock ?? 0) > 0 && (
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
          <Pressable onPress={scrollToTestimony} style={styles.ratingRow}>
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
          </Pressable>

          <Text style={styles.name}>{product.name}</Text>

          <View style={styles.verifiedRow}>
            <FontAwesome name="check-circle" size={14} color={Theme.primary} />
            <Text style={styles.verifiedText}>VERIFIED BY TOLA</Text>
          </View>

          <Text style={styles.desc}>{product.description}</Text>

          {/* Color & Size Selector */}
          {(product.colors && Array.isArray(product.colors) && product.colors.length > 0) && (
            <View style={styles.selectorSection}>
              <Text style={styles.selectorTitle}>CHOOSE COLOR{selectedColor?.price ? ` (TZS ${selectedColor.price.toLocaleString()})` : ""}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorList}>
                {product.colors.map((color: any, idx: number) => {
                  const isSelected = selectedColor?.name === color.name;
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => {
                        setSelectedColor(color);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[
                        styles.colorBubbleContainer,
                        isSelected && styles.colorBubbleSelected
                      ]}
                    >
                      <View style={styles.colorImageWrapper}>
                        {color.image ? (
                           <OptimizedImage source={color.image} width={40} aspectRatio={1} style={styles.colorRoundImage} />
                        ) : (
                          <View style={[styles.colorRoundPlaceholder, { backgroundColor: color.name.toLowerCase() }]} />
                        )}
                      </View>
                      <Text style={[styles.colorBubbleText, isSelected && styles.colorBubbleTextActive]} numberOfLines={1}>
                        {color.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {(product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) && (
            <View style={styles.selectorSection}>
              <Text style={styles.selectorTitle}>CHOOSE SIZE</Text>
              <View style={styles.sizeGrid}>
                {product.sizes.map((size: string, idx: number) => {
                  const isSelected = selectedSize === size;
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => {
                        setSelectedSize(size);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[
                        styles.sizeBadge,
                        isSelected && styles.sizeBadgeSelected,
                        { flexDirection: 'column', alignItems: 'center', gap: 2 }
                      ]}
                    >
                      <Text style={[styles.sizeBadgeText, isSelected && styles.sizeBadgeTextActive]}>
                        {size}
                      </Text>
                      {product.size_prices?.[size] && (
                        <Text style={{
                          fontSize: 8,
                          fontWeight: 'bold',
                          color: isSelected ? Theme.primary : '#64748b'
                        }}>
                          TZS {product.size_prices[size].toLocaleString()}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

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
              <Text style={styles.price}>{resolvedPrice?.toLocaleString() || '0'}</Text>
              <Text style={styles.currency}>{(product.currency || 'TZS') + (product.weight_unit ? ` / ${product.weight_unit}` : '')}</Text>
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
                <Text style={styles.stockText}>Min Order: {product.moq || 1} {product.weight_unit || product.unit || 'Units'}</Text>
                <Text style={styles.stockText}>{product.stock_quantity || 0} {product.weight_unit || product.unit || 'Units'} in inventory</Text>
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
            <View style={styles.metadataHeaderContainer}>
              <View style={styles.metadataHeaderIndicator} />
              <Text style={styles.metadataTitle}>PRODUCT DETAILS</Text>
            </View>
            <View style={styles.metadataList}>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Identifier (SKU)</Text>
                <View style={styles.metadataTag}>
                  <Text style={styles.metadataTagText}>{product.sku || 'N/A'}</Text>
                </View>
              </View>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Category</Text>
                <View style={styles.metadataTag}>
                  <Text style={styles.metadataTagText}>{product.categories?.name || 'Inventory'}</Text>
                </View>
              </View>

              {/* Vehicle Specifications */}
              {product.vehicle_section === 'vehicle' && (
                <>
                  {product.brand && (
                    <View style={styles.metadataRow}>
                      <Text style={styles.metadataLabel}>Brand / Make</Text>
                      <Text style={styles.metadataValue}>{product.brand}</Text>
                    </View>
                  )}
                  {product.model && (
                    <View style={styles.metadataRow}>
                      <Text style={styles.metadataLabel}>Model</Text>
                      <Text style={styles.metadataValue}>{product.model}</Text>
                    </View>
                  )}
                  {product.year && (
                    <View style={styles.metadataRow}>
                      <Text style={styles.metadataLabel}>Year</Text>
                      <Text style={styles.metadataValue}>{product.year}</Text>
                    </View>
                  )}
                  {product.mileage != null && (
                    <View style={styles.metadataRow}>
                      <Text style={styles.metadataLabel}>Mileage</Text>
                      <Text style={styles.metadataValue}>{product.mileage.toLocaleString()} km</Text>
                    </View>
                  )}
                  {product.transmission && (
                    <View style={styles.metadataRow}>
                      <Text style={styles.metadataLabel}>Transmission</Text>
                      <Text style={styles.metadataValue}>{product.transmission}</Text>
                    </View>
                  )}
                  {product.fuel_type && (
                    <View style={styles.metadataRow}>
                      <Text style={styles.metadataLabel}>Fuel Type</Text>
                      <Text style={styles.metadataValue}>{product.fuel_type}</Text>
                    </View>
                  )}
                  {product.engine_size && (
                    <View style={styles.metadataRow}>
                      <Text style={styles.metadataLabel}>Engine Size</Text>
                      <Text style={styles.metadataValue}>{product.engine_size}</Text>
                    </View>
                  )}
                  {product.condition && (
                    <View style={styles.metadataRow}>
                      <Text style={styles.metadataLabel}>Condition</Text>
                      <Text style={styles.metadataValue}>{product.condition}</Text>
                    </View>
                  )}
                </>
              )}

              {/* Spare Parts Specifications */}
              {product.vehicle_section === 'spare_part' && (
                <>
                  {product.brand && (
                    <View style={styles.metadataRow}>
                      <Text style={styles.metadataLabel}>Brand</Text>
                      <Text style={styles.metadataValue}>{product.brand}</Text>
                    </View>
                  )}
                  {product.part_number && (
                    <View style={styles.metadataRow}>
                      <Text style={styles.metadataLabel}>Part Number</Text>
                      <Text style={styles.metadataValue}>{product.part_number}</Text>
                    </View>
                  )}
                  {product.compatibility && (
                    <View style={styles.metadataRow}>
                      <Text style={styles.metadataLabel}>Compatible Vehicles</Text>
                      <Text style={styles.metadataValue}>{product.compatibility}</Text>
                    </View>
                  )}
                  {product.condition && (
                    <View style={styles.metadataRow}>
                      <Text style={styles.metadataLabel}>Condition</Text>
                      <Text style={styles.metadataValue}>{product.condition}</Text>
                    </View>
                  )}
                </>
              )}

              {/* Ready to Eat Specifications */}
              {(product.dietary_info || product.prep_time) && (
                <>
                  {product.dietary_info && (
                    <View style={styles.metadataRow}>
                      <Text style={styles.metadataLabel}>Dietary Info</Text>
                      <Text style={styles.metadataValue}>{product.dietary_info}</Text>
                    </View>
                  )}
                  {product.prep_time && (
                    <View style={styles.metadataRow}>
                      <Text style={styles.metadataLabel}>Prep Time</Text>
                      <Text style={styles.metadataValue}>{product.prep_time}</Text>
                    </View>
                  )}
                </>
              )}

              {/* Drinks Specifications */}
              {product.drink_section && (
                <View style={styles.metadataRow}>
                  <Text style={styles.metadataLabel}>Drink Type</Text>
                  <Text style={styles.metadataValue}>
                    {product.drink_section === 'alcoholic' ? 'Alcoholic' : 'Non-Alcoholic'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Reviews */}
          <View style={styles.reviewsSection} onLayout={(e) => setTestimonyY(e.nativeEvent.layout.y)}>
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

          {/* Cross-Selling Recommendations */}
          {recommendations.length > 0 && (
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
                  <Pressable
                    style={styles.recCard}
                    onPress={() => router.push(`/(guest)/product/${rec.id}`)}
                  >
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
          )}

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
  backBtnFloat: { position: 'absolute', top: 16, left: 16, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  muted: { color: Theme.textMuted, padding: 24, textAlign: 'center' },
  content: { paddingBottom: 24 },
  
  galleryContainer: { width: width - 32, marginHorizontal: 16, aspectRatio: 1, position: 'relative', backgroundColor: '#fafaf9', borderRadius: 24, overflow: 'hidden' },
  badgeOverlay: { position: 'absolute', top: 16, right: 16, gap: 8, zIndex: 5, alignItems: 'flex-end' },
  premiumBadge: { backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  premiumBadgeText: { fontSize: 8, fontWeight: '900', color: '#1c1917', letterSpacing: 1 },
  dispatchBadge: { backgroundColor: 'rgba(15,23,42,0.9)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  dispatchBadgeText: { fontSize: 8, fontWeight: '900', color: '#ffffff', letterSpacing: 1 },
  pagination: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.15)' },
  activeDot: { backgroundColor: Theme.primary, width: 12 },
  
  infoContainer: { padding: 20, gap: 20, paddingTop: 16 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6, borderWidth: 1, borderColor: '#fde68a' },
  stars: { flexDirection: 'row', gap: 1 },
  ratingText: { fontSize: 9, fontWeight: '800', color: '#b45309', letterSpacing: 0.5 },
  gradeBadge: { backgroundColor: 'rgba(37,99,235,0.08)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginLeft: 4, borderWidth: 1, borderColor: 'rgba(37,99,235,0.15)' },
  gradeText: { fontSize: 8, fontWeight: '900', color: Theme.primary, letterSpacing: 0.5 },
  
  name: { fontSize: 26, fontWeight: '800', color: '#0f172a', lineHeight: 32, letterSpacing: -0.5 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, backgroundColor: '#dbeafe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' },
  verifiedText: { fontSize: 9, fontWeight: '900', color: '#1e40af', letterSpacing: 0.5 },
  desc: { fontSize: 15, color: '#475569', lineHeight: 22, fontWeight: '500' },
  
  soldOutBox: { backgroundColor: '#fef2f2', borderColor: '#fee2e2', borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  soldOutIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  soldOutTitle: { fontSize: 10, fontWeight: '900', color: '#b91c1c', letterSpacing: 1.5 },
  soldOutSub: { fontSize: 12, fontWeight: '700', color: 'rgba(220,38,38,0.6)' },
  
  priceCard: { backgroundColor: '#ffffff', borderColor: '#f1f5f9', borderWidth: 1, borderRadius: 24, padding: 20, gap: 20, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.03, shadowRadius: 16, elevation: 3 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  price: { fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  currency: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.5 },
  
  quantitySection: { gap: 12 },
  quantityBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 16, borderColor: '#e2e8f0', borderWidth: 1 },
  quantityLabel: { fontSize: 9, fontWeight: '800', color: '#64748b', letterSpacing: 1 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  qBtn: { width: 34, height: 34, backgroundColor: '#ffffff', borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cbd5e1', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  qText: { fontSize: 16, fontWeight: '800', minWidth: 20, textAlign: 'center', color: '#0f172a' },
  stockInfo: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  stockText: { fontSize: 9, fontWeight: '700', color: '#64748b', fontStyle: 'italic' },
  
  protectRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  protectInfo: { flex: 1 },
  protectTitle: { fontSize: 9, fontWeight: '900', color: '#0f172a', letterSpacing: 0.5 },
  protectSub: { fontSize: 9, color: '#64748b', fontWeight: '500', marginTop: 1 },
  
  policyGrid: { flexDirection: 'row', gap: 10 },
  policyCard: { flex: 1, backgroundColor: '#f8fafc', padding: 16, borderRadius: 20, borderColor: '#e2e8f0', borderWidth: 1 },
  policyLabel: { fontSize: 8, fontWeight: '900', color: '#64748b', letterSpacing: 1 },
  policyValue: { fontSize: 11, fontWeight: '700', color: '#0f172a', marginTop: 3 },
  
  merchantCard: { backgroundColor: '#0f172a', padding: 20, borderRadius: 24, gap: 16, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 4 },
  merchantHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  merchantIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  merchantLabel: { fontSize: 8, fontWeight: '900', color: Theme.primary, letterSpacing: 1 },
  merchantName: { fontSize: 16, fontWeight: '800', color: '#ffffff', letterSpacing: 3, opacity: 0.6 },
  merchantStatus: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1e293b' },
  merchantStatusLabel: { fontSize: 8, fontWeight: '900', color: '#475569', letterSpacing: 1.5 },
  merchantStatusValue: { fontSize: 8, fontWeight: '900', color: Theme.primary, letterSpacing: 1 },
  merchantDisclaimer: { backgroundColor: 'rgba(30,41,59,0.5)', padding: 12, borderRadius: 12, fontSize: 9, color: '#94a3b8', fontStyle: 'italic', lineHeight: 14, borderWidth: 1, borderColor: '#1e293b' },
  
  metadataSection: { backgroundColor: '#ffffff', borderRadius: 24, padding: 20, borderColor: '#f1f5f9', borderWidth: 1, marginTop: 16, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.02, shadowRadius: 16, elevation: 2 },
  metadataHeaderContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 12 },
  metadataHeaderIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: Theme.primary },
  metadataTitle: { fontSize: 10, fontWeight: '900', color: '#0f172a', letterSpacing: 1.5 },
  metadataList: { gap: 4 },
  metadataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  metadataLabel: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  metadataValue: { fontSize: 12, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' },
  metadataTag: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  metadataTagText: { fontSize: 11, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' },
  
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
  
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  addBtn: { backgroundColor: '#0B5ED7', height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#0B5ED7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  selectorSection: { gap: 8, marginTop: 4 },
  selectorTitle: { fontSize: 9, fontWeight: '800', color: '#64748b', letterSpacing: 1.5 },
  colorList: { gap: 10, paddingVertical: 4 },
  colorBubbleContainer: { alignItems: 'center', gap: 4, width: 60 },
  colorBubbleSelected: { opacity: 1 },
  colorImageWrapper: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: 'transparent', borderStyle: 'solid', padding: 2, alignItems: 'center', justifyContent: 'center' },
  colorRoundImage: { borderRadius: 19 },
  colorRoundPlaceholder: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#e2e8f0' },
  colorBubbleText: { fontSize: 9, fontWeight: '600', color: '#64748b', textAlign: 'center' },
  colorBubbleTextActive: { fontWeight: '800', color: Theme.primary },
  
  sizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sizeBadge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff' },
  sizeBadgeSelected: { borderColor: Theme.primary, backgroundColor: '#eff6ff' },
  sizeBadgeText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  sizeBadgeTextActive: { fontWeight: '800', color: Theme.primary },

  recsSection: { gap: 12, marginTop: 24 },
  recsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recsTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
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
