import React from 'react';
import { View, Text, Pressable, ViewStyle, Share } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { styles } from '@/components/ProductCard.styles';
import { ProductBadges } from '@/components/ProductBadges';
import { OptimizedImage } from '@/components/OptimizedImage';
import type { Product } from '@/src/types';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { logger } from '@/src/lib/logger';

interface ProductCardProps {
  product: Product;
  badge?: { text: string; variant: 'new' | 'deal' | 'hot' };
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
  const theme = useThemeColors();
  const stock = product.stock_quantity ?? product.stock ?? 1;
  const isSoldOut = stock === 0;

  const shop = product.shops as { region?: string; district?: string } | undefined;
  const locationParts = [shop?.region, shop?.district].filter(Boolean);
  const locationLabel = locationParts.length > 0 ? locationParts.join(', ') : null;
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
      logger.error('[SHARE] Error sharing product:', error);
    }
  };

  const priceColor = theme.isDark ? '#60A5FA' : '#0B5ED7';

  return (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
        },
        style,
      ]}
      onPress={handlePress}
    >
      <View style={[styles.imageContainer, { backgroundColor: theme.inputBg }]}>
        <OptimizedImage
          source={
            product.images && Array.isArray(product.images) && product.images.length > 0
              ? (product.images[0] as string)
              : product.image_url
          }
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

        <ProductBadges
          badge={badge}
          compareAtPrice={product.compare_at_price as number | string | null | undefined}
          price={product.price}
          isDark={theme.isDark}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.verifiedRow}>
          <View style={styles.verifiedTag}>
            <FontAwesome name="check-circle" size={10} color={Theme.success} />
            <Text style={styles.verifiedText}>Verified by TOLA</Text>
          </View>
          <View style={styles.statsRow}>
            {(Number(product.sales_count) || 0) > 0 && !isSoldOut && (
              <View style={[styles.soldBadge, theme.isDark && { backgroundColor: 'rgba(22, 163, 74, 0.2)' }]}>
                <Text style={[styles.soldBadgeText, theme.isDark && { color: '#4ade80' }]}>
                  {String(product.sales_count)} Sold
                </Text>
              </View>
            )}
            {product.quality_grade && (
              <View style={[styles.gradeBadge, { backgroundColor: theme.inputBg }]}>
                <Text style={[styles.gradeText, { color: theme.textSecondary }]}>
                  Grade {String(product.quality_grade)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
          {product.name}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <FontAwesome name="shopping-bag" size={10} color={theme.isDark ? '#60A5FA' : '#2563EB'} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
              MOQ: {product.moq || 1} {product.weight_unit || product.unit || 'Units'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <FontAwesome name="truck" size={10} color={Theme.success} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
              {product.delivery_available !== false ? 'Delivery' : 'Pickup'}
            </Text>
          </View>
        </View>

        <View style={styles.priceContainer}>
          <View>
            <Text style={[styles.price, { color: priceColor }]}>
              {product.price?.toLocaleString()}{' '}
              <Text style={[styles.currency, { color: theme.textSecondary }]}>
                TZS{product.weight_unit ? ` / ${product.weight_unit}` : ''}
              </Text>
            </Text>
            {Number(product.compare_at_price ?? 0) > Number(product.price ?? 0) && (
              <Text style={[styles.oldPrice, { color: theme.textMuted }]}>
                {Number(product.compare_at_price)?.toLocaleString()} TZS
              </Text>
            )}
          </View>
          <View style={styles.locationContainer}>
            {distanceKm !== undefined && distanceKm !== null && distanceKm !== Infinity && (
              <View style={[styles.distanceBadge, theme.isDark && { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}>
                <FontAwesome name="map-marker" size={10} color={theme.primary} style={{ marginRight: 2 }} />
                <Text style={[styles.distanceText, { color: theme.primary }]}>
                  {distanceKm < 1 ? '< 1 km' : `${Math.round(distanceKm)} km`}
                </Text>
              </View>
            )}
            {locationLabel && (
              <View style={styles.locationLabelRow}>
                <FontAwesome name="map-marker" size={10} color={theme.textMuted} style={{ marginRight: 2 }} />
                <Text style={[styles.locationText, { color: theme.textMuted }]} numberOfLines={1}>
                  {locationLabel}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.actionsRow, { borderTopColor: theme.border }]}>
          <Pressable
            style={[
              styles.cartButton,
              isInCart && [styles.inCartButton, { backgroundColor: theme.inputBg, borderColor: theme.border }],
              isSoldOut && [styles.disabledButton, { backgroundColor: theme.inputBg }],
            ]}
            onPress={() => !isSoldOut && onAddToCart?.(product)}
            disabled={isSoldOut}
          >
            {isSoldOut ? (
              <Text style={[styles.cartButtonTextDisabled, { color: theme.textMuted }]}>Sold Out</Text>
            ) : isInCart ? (
              <>
                <FontAwesome name="check" size={12} color={Theme.success} style={{ marginRight: 6 }} />
                <Text style={[styles.inCartText, { color: theme.textSecondary }]}>In Cart</Text>
              </>
            ) : (
              <>
                <FontAwesome name="shopping-cart" size={12} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.cartButtonText}>Cart</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.actionIcon, { borderColor: theme.border }, isLiked && styles.likedIcon]}
            onPress={() => onToggleLike?.(product.id)}
          >
            <FontAwesome name={isLiked ? 'heart' : 'heart-o'} size={14} color={isLiked ? Theme.error : theme.textMuted} />
          </Pressable>

          <Pressable style={[styles.actionIcon, { borderColor: theme.border }]} onPress={handleShare}>
            <FontAwesome name="share" size={14} color={theme.textMuted} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
