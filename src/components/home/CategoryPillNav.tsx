import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { OptimizedImage } from '@/components/OptimizedImage';
import { resolveCategoryImage } from '@/src/constants/categoryImages';
import { sortTopLevelCategories } from '@/src/hooks/useHomeScreenData';
import type { useThemeColors } from '@/src/hooks/useThemeColors';

type ThemeColors = ReturnType<typeof useThemeColors>;

interface CategoryPillNavProps {
  theme: ThemeColors;
  categories: any[];
}

export function CategoryPillNav({ theme, categories }: CategoryPillNavProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.catNav, { backgroundColor: theme.background, borderBottomColor: theme.border }]}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
    >
      <Pressable style={styles.catCircleItem} onPress={() => router.push('/(tabs)/shop')}>
        <View style={[styles.catCircle, styles.catCircleActive]}>
          <FontAwesome name="th-large" size={20} color="#fff" />
        </View>
        <Text style={[styles.catCircleLabel, styles.catCircleLabelActive, { color: theme.primary }]}>All</Text>
      </Pressable>
      {sortTopLevelCategories(categories).map((c: any) => (
        <Pressable key={c.id} style={styles.catCircleItem} onPress={() => router.push(`(tabs)/shop?category=${c.id}` as any)}>
          <View style={[styles.catCircle, { backgroundColor: theme.catCircleBg, borderColor: theme.catCircleBorder }]}>
            <OptimizedImage source={resolveCategoryImage(c)} width="100%" height="100%" style={{ borderRadius: 18 }} />
          </View>
          <Text style={[styles.catCircleLabel, { color: theme.textSecondary }]} numberOfLines={2}>{c.name}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  catNav: { borderBottomWidth: 1, borderBottomColor: Theme.inputBorder, paddingVertical: 14, backgroundColor: '#fff' },
  catCircleItem: { alignItems: 'center', width: 68 },
  catCircle: { width: 60, height: 60, borderRadius: 18, backgroundColor: Theme.inputBg, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Theme.inputBorder },
  catCircleActive: { backgroundColor: Theme.primary, borderColor: Theme.primary },
  catCircleLabel: { fontSize: 11, fontWeight: '700', color: Theme.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 14 },
  catCircleLabelActive: { color: Theme.primary, fontWeight: '800' },
});
