import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, Share, Platform } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { OptimizedImage } from '@/components/OptimizedImage';
import type { Product } from '@/src/types';

interface ProductCardProps {
  product: Product;
  badge?: { text: string; variant: 'new' | 'deal' };
  isLiked?: boolean;
  isInCart?: boolean;
  onAddToCart?: (product: Product) => void;
  onToggleLike?: (productId: string) => void;
  onShare?: (product: Product) => void;
  style?: ViewStyle;
}

export function ProductCard({
  product,
  badge,
  isLiked,
  isInCart,
  onAddToCart,
  onToggleLike,
  onShare,
  style,
}: ProductCardProps) {
  const stock = product.stock_quantity ?? product.stock ?? 1;
  const isSoldOut = stock === 0;

  const shop = product.shops as { region?: string; district?: string } | undefined;
  const locationParts = [shop?.region, shop?.district].filter(Boolean);
  const locationLabel = locationParts.length > 0 ? locationParts.join(", ") : null;
  const distanceKm = product.distance_km as number | undefined;

  const handlePress = () => {
    router.push(`/(guest)/product/${product.id}`);
  };

  const handleShare = async () => {
    if (onShare) {
      onShare(product);
      return;
    }
    try {
      const productUrl = `https://tolatola.co/product/${product.id}`;
      const shareMessage = `Angalia bidhaa hii nzuri kwenye Tola: ${product.name}\n\nNunua sasa kupitia: ${productUrl}`;
      await Share.share({
        message: shareMessage,
        title: product.name,
      });
    } catch (error) {
      console.error('[SHARE] Error sharing product:', error);
    }
  };

  return (
    <Pressable style={[styles.card, style]} onPress={handlePress}>
      <View style={styles.imageContainer}>
        <OptimizedImage
          source={(product.images && Array.isArray(product.images) && product.images.length > 0) ? (product.images[0] as string) : product.image_url}
          width="100%"
          aspectRatio={4 / 3}
          style={[styles.image, isSoldOut && styles.soldOutImage]}
        />
        
        {isSoldOut && (
          <View style={styles.soldOutOverlay}>
            <View style={styles.soldOutBadge}>
              <Text style={styles.soldOutText}>Sold Out</Text>
            </View>
          </View>
        )}

        <View style={styles.badgesContainer}>
          {badge ? (
            <View style={[styles.badge, badge.variant === 'new' ? styles.badgeNew : styles.badgeDeal]}>
              <Text style={styles.badgeText}>{badge.text}</Text>
            </View>
          ) : <View />}

          {Number(product.compare_at_price ?? 0) > Number(product.price ?? 0) && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                {Math.round((((Number(product.compare_at_price ?? 0)) - Number(product.price ?? 0)) / Number(product.compare_at_price ?? 1)) * 100)}% OFF
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.verifiedRow}>
          <View style={styles.verifiedTag}>
            <FontAwesome name="check-circle" size={10} color={Theme.success} />
            <Text style={styles.verifiedText}>Verified by TOLA</Text>
          </View>
          <View style={styles.statsRow}>
            {(Number(product.sales_count) || 0) > 0 && !isSoldOut && (
              <View style={styles.soldBadge}>
                <Text style={styles.soldBadgeText}>{String(product.sales_count)} Sold</Text>
              </View>
            )}
            {product.quality_grade && (
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeText}>Grade {String(product.quality_grade)}</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <FontAwesome name="shopping-bag" size={10} color="#2563EB" />
            <Text style={styles.metaText}>MOQ: {product.moq || 1} {product.weight_unit || product.unit || 'Units'}</Text>
          </View>
          <View style={styles.metaItem}>
            <FontAwesome name="truck" size={10} color={Theme.success} />
            <Text style={styles.metaText}>{product.delivery_available !== false ? 'Delivery' : 'Pickup'}</Text>
          </View>
        </View>

        <View style={styles.priceContainer}>
          <View>
            <Text style={styles.price}>
              {product.price?.toLocaleString()} <Text style={styles.currency}>TZS{product.weight_unit ? ` / ${product.weight_unit}` : ''}</Text>
            </Text>
            {Number(product.compare_at_price ?? 0) > Number(product.price ?? 0) && (
              <Text style={styles.oldPrice}>{Number(product.compare_at_price)?.toLocaleString()} TZS</Text>
            )}
          </View>
          <View style={styles.locationContainer}>
            {distanceKm !== undefined && distanceKm !== null && distanceKm !== Infinity && (
              <View style={styles.distanceBadge}>
                <FontAwesome name="map-marker" size={10} color={Theme.primary} style={{ marginRight: 2 }} />
                <Text style={styles.distanceText}>
                  {distanceKm < 1 ? '< 1 km' : `${Math.round(distanceKm)} km`}
                </Text>
              </View>
            )}
            {locationLabel && (
              <View style={styles.locationLabelRow}>
                <FontAwesome name="map-marker" size={10} color={Theme.textMuted} style={{ marginRight: 2 }} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {locationLabel}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.cartButton, isInCart && styles.inCartButton, isSoldOut && styles.disabledButton]}
            onPress={() => !isSoldOut && onAddToCart?.(product)}
            disabled={isSoldOut}
          >
            {isSoldOut ? (
              <Text style={styles.cartButtonTextDisabled}>Sold Out</Text>
            ) : isInCart ? (
              <>
                <FontAwesome name="check" size={12} color={Theme.success} style={{ marginRight: 6 }} />
                <Text style={styles.inCartText}>In Cart</Text>
              </>
            ) : (
              <>
                <FontAwesome name="shopping-cart" size={12} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.cartButtonText}>Cart</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.actionIcon, isLiked && styles.likedIcon]}
            onPress={() => onToggleLike?.(product.id)}
          >
            <FontAwesome name={isLiked ? 'heart' : 'heart-o'} size={14} color={isLiked ? Theme.error : Theme.textMuted} />
          </Pressable>

          <Pressable style={styles.actionIcon} onPress={handleShare}>
            <FontAwesome name="share" size={14} color={Theme.textMuted} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: 220,
    marginRight: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.backgroundSecondary,
    ...Theme.shadowSm,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    position: 'relative',
    backgroundColor: Theme.inputBg,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  soldOutImage: {
    opacity: 0.6,
  },
  soldOutOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutBadge: {
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    transform: [{ rotate: '-12deg' }],
  },
  soldOutText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  badgesContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeNew: {
    backgroundColor: 'rgba(26, 86, 219, 0.9)',
  },
  badgeDeal: {
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  discountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: Theme.error,
    fontSize: 9,
    fontWeight: '900',
  },
  content: {
    padding: 12,
    flex: 1,
  },
  verifiedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 9,
    color: Theme.success,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  soldBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  soldBadgeText: {
    color: '#15803d',
    fontSize: 8,
    fontWeight: '800',
  },
  gradeBadge: {
    backgroundColor: Theme.inputBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gradeText: {
    color: Theme.textSecondary,
    fontSize: 8,
    fontWeight: '800',
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.text,
    lineHeight: 18,
    marginBottom: 8,
    minHeight: 36,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.textSecondary,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  locationContainer: {
    alignItems: 'flex-end',
    gap: 2,
    maxWidth: 90,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 86, 219, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  distanceText: {
    fontSize: 8,
    fontWeight: '900',
    color: Theme.primary,
  },
  locationLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 8,
    fontWeight: '700',
    color: Theme.textMuted,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B5ED7',
  },
  currency: {
    fontSize: 10,
    fontWeight: '600',
  },
  oldPrice: {
    fontSize: 11,
    color: Theme.textMuted,
    textDecorationLine: 'line-through',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: Theme.inputBorder,
    paddingTop: 12,
  },
  cartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    height: 36,
  },
  inCartButton: {
    backgroundColor: Theme.inputBg,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  disabledButton: {
    backgroundColor: Theme.inputBg,
  },
  cartButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  inCartText: {
    color: Theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  cartButtonTextDisabled: {
    color: Theme.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likedIcon: {
    borderColor: Theme.error,
    backgroundColor: 'rgba(220, 38, 38, 0.05)',
  },
});
