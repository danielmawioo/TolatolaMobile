import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '@/components/ProductCard.styles';

export type ProductBadge = { text: string; variant: 'new' | 'deal' | 'hot' };

interface ProductBadgesProps {
  badge?: ProductBadge;
  compareAtPrice?: number | string | null;
  price?: number | string | null;
  isDark?: boolean;
}

/** Promo badge + percent-off chip overlaid on a product image. */
export function ProductBadges({ badge, compareAtPrice, price, isDark }: ProductBadgesProps) {
  const compare = Number(compareAtPrice ?? 0);
  const current = Number(price ?? 0);
  const showDiscount = compare > current;

  return (
    <View style={styles.badgesContainer}>
      {badge ? (
        <View
          style={[
            styles.badge,
            badge.variant === 'new'
              ? styles.badgeNew
              : badge.variant === 'hot'
                ? styles.badgeHot
                : styles.badgeDeal,
          ]}
        >
          <Text style={styles.badgeText}>{badge.text}</Text>
        </View>
      ) : (
        <View />
      )}

      {showDiscount && (
        <View style={[styles.discountBadge, isDark && { backgroundColor: 'rgba(30, 41, 59, 0.95)' }]}>
          <Text style={styles.discountText}>
            {Math.round(((compare - current) / Number(compareAtPrice ?? 1)) * 100)}% OFF
          </Text>
        </View>
      )}
    </View>
  );
}
