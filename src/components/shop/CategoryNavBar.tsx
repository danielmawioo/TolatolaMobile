import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { OptimizedImage } from '@/components/OptimizedImage';
import { resolveCategoryImage } from '@/src/constants/categoryImages';

interface ThemeColors {
  background: string;
  border: string;
  textSecondary: string;
  catCircleBg: string;
  catCircleBorder: string;
}

interface NavCategory {
  id: string;
  parent_id?: string | null;
  name?: string;
  slug?: string;
  image_url?: string | null;
}

interface CategoryNavBarProps {
  categories: NavCategory[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  theme: ThemeColors;
}

/**
 * Top-level category circles row plus (when a parent category with children
 * is selected) a subcategory pills row underneath it.
 */
export function CategoryNavBar({ categories, selectedCategory, onSelectCategory, theme }: CategoryNavBarProps) {
  const activeCat = categories.find(c => c.id === selectedCategory);
  const parentCat = activeCat?.parent_id
    ? categories.find(c => c.id === activeCat.parent_id)
    : activeCat;
  const subCats = parentCat ? categories.filter(c => c.parent_id === parentCat.id) : [];

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.catNav, { backgroundColor: theme.background, borderBottomColor: theme.border }]}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
      >
        <Pressable style={styles.catCircleItem} onPress={() => onSelectCategory(null)}>
          <View style={[styles.catCircle, !selectedCategory && styles.catCircleActive]}>
            <FontAwesome name="th-large" size={20} color={!selectedCategory ? '#fff' : Theme.primary} />
          </View>
          <Text style={[styles.catCircleLabel, { color: theme.textSecondary }, !selectedCategory && styles.catCircleLabelActive]}>All</Text>
        </Pressable>
        {categories.filter((c) => !c.parent_id).sort((a, b) => {
          const isAService = a.slug === "services" || a.name?.toLowerCase() === "services"
          const isBService = b.slug === "services" || b.name?.toLowerCase() === "services"
          if (isAService && !isBService) return 1
          if (!isAService && isBService) return -1
          return 0
        }).map(c => {
          const isSelected = selectedCategory === c.id;
          return (
            <Pressable key={c.id} style={styles.catCircleItem} onPress={() => onSelectCategory(c.id)}>
              <View style={[styles.catCircle, { backgroundColor: theme.catCircleBg, borderColor: theme.catCircleBorder }, isSelected && styles.catCircleActive]}>
                <OptimizedImage source={resolveCategoryImage(c)} width="100%" height="100%" style={{ borderRadius: 18 }} />
              </View>
              <Text style={[styles.catCircleLabel, { color: theme.textSecondary }, isSelected && styles.catCircleLabelActive]} numberOfLines={2}>{c.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {subCats.length > 0 && parentCat && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.catNav, { paddingTop: 0, paddingBottom: 8, borderBottomWidth: 0 }]}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          <Pressable
            style={[styles.catPill, selectedCategory === parentCat.id && styles.catPillActive]}
            onPress={() => onSelectCategory(parentCat.id)}
          >
            <Text style={[styles.catPillText, selectedCategory === parentCat.id && styles.catPillTextActive]}>All {parentCat.name}</Text>
          </Pressable>
          {subCats.map((sub) => (
            <Pressable
              key={sub.id}
              style={[styles.catPill, selectedCategory === sub.id && styles.catPillActive]}
              onPress={() => onSelectCategory(sub.id)}
            >
              <Text style={[styles.catPillText, selectedCategory === sub.id && styles.catPillTextActive]}>{sub.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  catNav: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBorder,
    paddingVertical: 14,
    backgroundColor: '#fff',
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 16,
  },
  catCircleItem: { alignItems: 'center', width: 68 },
  catCircle: { width: 60, height: 60, borderRadius: 18, backgroundColor: Theme.inputBg, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Theme.inputBorder },
  catCircleActive: { backgroundColor: Theme.primary, borderColor: Theme.primary },
  catCircleLabel: { fontSize: 11, fontWeight: '700', color: Theme.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 14 },
  catCircleLabelActive: { color: Theme.primary, fontWeight: '800' },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: Theme.inputBg,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  catPillActive: { backgroundColor: Theme.primary, borderColor: Theme.primary },
  catPillText: { fontSize: 12, fontWeight: '700', color: Theme.textSecondary },
  catPillTextActive: { color: '#fff' },
});
