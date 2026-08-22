import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { OptimizedImage } from '@/components/OptimizedImage';
import { resolveCategoryImage } from '@/src/constants/categoryImages';
import { sortTopLevelCategories } from '@/src/hooks/useHomeScreenData';
import type { useThemeColors } from '@/src/hooks/useThemeColors';

type ThemeColors = ReturnType<typeof useThemeColors>;

interface CategoryGridProps {
  theme: ThemeColors;
  categories: any[];
}

export function CategoryGrid({ theme, categories }: CategoryGridProps) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionSub, { color: theme.primary }]}>Selections for you</Text>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Shop by <Text style={styles.italicPrimary}>Category</Text></Text>
      <View style={styles.catCircleGrid}>
        {sortTopLevelCategories(categories).slice(0, 12).map((cat: any) => (
          <Pressable key={cat.id} style={styles.catGridItem} onPress={() => router.push(`(tabs)/shop?category=${cat.id}` as any)}>
            <View style={[styles.catGridCircle, { backgroundColor: theme.catCircleBg, borderColor: theme.catCircleBorder }]}>
              <OptimizedImage source={resolveCategoryImage(cat)} width="100%" height="100%" style={{ borderRadius: 22 }} />
            </View>
            <Text style={[styles.catGridLabel, { color: theme.text }]} numberOfLines={2}>{cat.name}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => router.push('/(tabs)/shop')} style={styles.viewCatalogBtn}>
        <Text style={styles.viewCatalogText}>View Entire Catalog <FontAwesome name="arrow-right" size={12} /></Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 32 },
  sectionSub: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: Theme.primary, letterSpacing: 1, marginBottom: 2, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: Theme.text },
  italicPrimary: { color: Theme.primary, fontStyle: 'italic' },
  catCircleGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, paddingHorizontal: 16, rowGap: 20 },
  catGridItem: { width: '25%', alignItems: 'center', paddingHorizontal: 4 },
  catGridCircle: { width: 78, height: 78, borderRadius: 22, overflow: 'hidden', backgroundColor: Theme.inputBg, borderWidth: 1, borderColor: Theme.inputBorder, ...Theme.shadowSm },
  catGridLabel: { fontSize: 11, fontWeight: '700', color: Theme.text, textAlign: 'center', marginTop: 6, lineHeight: 14 },
  viewCatalogBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, padding: 12 },
  viewCatalogText: { fontSize: 13, fontWeight: '700', color: Theme.primary, gap: 4 },
});
