import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { OptimizedImage } from '@/components/OptimizedImage';
import { Theme } from '@/constants/Theme';
import type { Product } from '@/src/types';
import type { ProductColor } from '@/src/hooks/useProductDetailData';

interface VariantSelectorProps {
  product: Product;
  selectedColor: ProductColor | null;
  onSelectColor: (color: ProductColor) => void;
  selectedSize: string | null;
  onSelectSize: (size: string) => void;
}

/**
 * Color swatch and size chip pickers for fashion-style products. Renders
 * nothing for a section when the product has no colors/sizes.
 */
export function VariantSelector({
  product,
  selectedColor,
  onSelectColor,
  selectedSize,
  onSelectSize,
}: VariantSelectorProps) {
  const hasColors = !!(product.colors && Array.isArray(product.colors) && product.colors.length > 0);
  const hasSizes = !!(product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0);

  if (!hasColors && !hasSizes) return null;

  return (
    <>
      {hasColors && (
        <View style={styles.selectorSection}>
          <Text style={styles.selectorTitle}>
            CHOOSE COLOR{selectedColor?.price ? ` (TZS ${selectedColor.price.toLocaleString()})` : ''}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorList}>
            {product.colors!.map((color, idx) => {
              const isSelected = selectedColor?.name === color.name;
              return (
                <Pressable
                  key={idx}
                  onPress={() => {
                    onSelectColor(color);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[styles.colorBubbleContainer, isSelected && styles.colorBubbleSelected]}
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

      {hasSizes && (
        <View style={styles.selectorSection}>
          <Text style={styles.selectorTitle}>CHOOSE SIZE</Text>
          <View style={styles.sizeGrid}>
            {product.sizes!.map((size, idx) => {
              const isSelected = selectedSize === size;
              return (
                <Pressable
                  key={idx}
                  onPress={() => {
                    onSelectSize(size);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.sizeBadge,
                    isSelected && styles.sizeBadgeSelected,
                    { flexDirection: 'column', alignItems: 'center', gap: 2 },
                  ]}
                >
                  <Text style={[styles.sizeBadgeText, isSelected && styles.sizeBadgeTextActive]}>{size}</Text>
                  {product.size_prices?.[size] && (
                    <Text
                      style={{
                        fontSize: 8,
                        fontWeight: 'bold',
                        color: isSelected ? Theme.primary : '#64748b',
                      }}
                    >
                      TZS {product.size_prices[size].toLocaleString()}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
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
});
