import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { gap, sectionGap, scaleByWidth, scaleByHeight } from '@/constants/layout';
import { OptimizedImage } from '@/components/OptimizedImage';
import { ScreenSafeLayout } from '@/components/ScreenSafeLayout';

const SIDEBAR_MIN_WIDTH = 88;
const SIDEBAR_MAX_WIDTH = 100;
const SIDEBAR_RATIO = 0.26;
const BREAKPOINT_NARROW = 380;
const GRID_COLUMNS_WIDE = 3;
const GRID_COLUMNS_NARROW = 2;
const MIN_TOUCH_TARGET = 44;

/** Main category ids – must match keys in CATEGORY_SECTIONS (tola.co) */
const MAIN_CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'fmcg', label: 'Fast Moving Consumer Goods' },
  { id: 'agriculture', label: 'Agriculture' },
  { id: 'construction', label: 'Construction & Hardware' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'food', label: 'Food & Beverages' },
];

/** TOLA-style product for category rows */
type CategoryProduct = { id: string; name: string; price: number; image?: string | null };
type Section = { title: string; products: CategoryProduct[] };

/** Sub-sections and products per main category (TOLA – tola.co) */
const CATEGORY_SECTIONS: Record<string, Section[]> = {
  all: [
    {
      title: 'POPULAR',
      products: [
        { id: 'p1', name: 'Bell pepper', price: 2500 },
        { id: 'p2', name: 'Carrot', price: 2500 },
        { id: 'p3', name: 'Fresh Beef Steak', price: 26000 },
        { id: 'p4', name: 'Fresh green corn', price: 8000 },
        { id: 'p5', name: 'Fresh octopus', price: 16000 },
        { id: 'p6', name: 'Fresh water fish', price: 12000 },
        { id: 'p7', name: 'Fresh ripe tomatoes', price: 3500 },
        { id: 'p8', name: 'Garlic', price: 4500 },
      ],
    },
  ],
  fmcg: [
    {
      title: 'FAST MOVING CONSUMER GOODS',
      products: [
        { id: 'g1', name: 'Cooking Oil 1L', price: 4500 },
        { id: 'g2', name: 'Rice 2kg', price: 3200 },
        { id: 'g3', name: 'Sugar 1kg', price: 1800 },
        { id: 'g4', name: 'Soap', price: 1200 },
      ],
    },
  ],
  agriculture: [
    {
      title: 'AGRICULTURE',
      products: [
        { id: 'a1', name: 'Bell pepper', price: 2500 },
        { id: 'a2', name: 'Carrot', price: 2500 },
        { id: 'a3', name: 'Fresh green corn', price: 8000 },
        { id: 'a4', name: 'Fresh ripe tomatoes', price: 3500 },
        { id: 'a5', name: 'Garlic', price: 4500 },
        { id: 'a6', name: 'Mahindi mabichi', price: 6000 },
      ],
    },
  ],
  construction: [
    {
      title: 'CONSTRUCTION & HARDWARE',
      products: [
        { id: 'c1', name: 'Cement 50kg', price: 18000 },
        { id: 'c2', name: 'Steel bars', price: 25000 },
        { id: 'c3', name: 'Paint 4L', price: 35000 },
      ],
    },
  ],
  vehicles: [
    {
      title: 'VEHICLES',
      products: [
        { id: 'v1', name: 'Spare parts', price: 45000 },
        { id: 'v2', name: 'Engine oil', price: 28000 },
      ],
    },
  ],
  electronics: [
    {
      title: 'ELECTRONICS',
      products: [
        { id: 'e1', name: 'Smartphones', price: 249000 },
        { id: 'e2', name: 'Power Banks', price: 25000 },
        { id: 'e3', name: 'Chargers', price: 8500 },
      ],
    },
  ],
  food: [
    {
      title: 'FOOD & BEVERAGES',
      products: [
        { id: 'f1', name: 'Fresh Beef Steak', price: 26000 },
        { id: 'f2', name: 'Fresh octopus', price: 16000 },
        { id: 'f3', name: 'Fresh water fish', price: 12000 },
        { id: 'f4', name: 'Houngary choma sausage', price: 15000 },
        { id: 'f5', name: 'Bell pepper', price: 2500 },
        { id: 'f6', name: 'Fresh ripe tomatoes', price: 3500 },
      ],
    },
  ],
};

export default function CategoriesScreen() {
  const [selectedId, setSelectedId] = useState(MAIN_CATEGORIES[0].id);
  const [search, setSearch] = useState('');
  const contentScrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const sidebarWidth = Math.min(
    SIDEBAR_MAX_WIDTH,
    Math.max(SIDEBAR_MIN_WIDTH, width * SIDEBAR_RATIO)
  );
  const contentAreaWidth = width - sidebarWidth;
  const columns = width < BREAKPOINT_NARROW ? GRID_COLUMNS_NARROW : GRID_COLUMNS_WIDE;
  const gapBetween = gap.sm;
  const cardWidth = (contentAreaWidth - (columns - 1) * gapBetween) / columns;

  const sections = useMemo(
    () => CATEGORY_SECTIONS[selectedId] ?? CATEGORY_SECTIONS.all,
    [selectedId]
  );

  useEffect(() => {
    contentScrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [selectedId]);

  return (
    <ScreenSafeLayout edges={['top']}>
      <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <FontAwesome name="search" size={scaleByWidth(18)} color={Theme.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search on TOLA"
          placeholderTextColor={Theme.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Two columns: sidebar + content */}
      <View style={styles.body}>
        <ScrollView
          style={[styles.sidebar, { width: sidebarWidth }]}
          contentContainerStyle={styles.sidebarContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {MAIN_CATEGORIES.map((cat) => {
            const isSelected = cat.id === selectedId;
            return (
              <Pressable
                key={cat.id}
                style={({ pressed }) => [
                  styles.sidebarItem,
                  isSelected && styles.sidebarItemActive,
                  pressed && styles.sidebarItemPressed,
                ]}
                onPress={() => setSelectedId(cat.id)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                {isSelected && <View style={styles.sidebarBar} />}
                <Text
                  style={[styles.sidebarLabel, isSelected && styles.sidebarLabelActive]}
                  numberOfLines={2}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          ref={contentScrollRef}
          style={styles.content}
          contentContainerStyle={[styles.contentInner, { paddingBottom: height * 0.12 + insets.bottom }]}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {sections.map((section, idx) => (
            <View key={`${selectedId}-${idx}`} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle} numberOfLines={1}>
                  {section.title}
                </Text>
                <Pressable
                  onPress={() => router.push('/(guest)/shop')}
                  hitSlop={12}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.seeAll}>SEE ALL</Text>
                </Pressable>
              </View>
              {section.products.length === 0 ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptyText}>No products in this section yet.</Text>
                </View>
              ) : (
                <View style={[styles.productGrid, { gap: gapBetween }]}>
                  {section.products.map((p) => (
                    <Pressable
                      key={p.id}
                      style={({ pressed }) => [
                        styles.productCard,
                        { width: cardWidth },
                        pressed && styles.productCardPressed,
                      ]}
                      onPress={() => router.push(`/(guest)/product/${p.id}`)}
                    >
                      <View style={styles.productImage}>
                        <OptimizedImage source={p.image ?? null} width="100%" aspectRatio={1} />
                      </View>
                      <Text style={styles.productName} numberOfLines={2}>
                        {p.name}
                      </Text>
                      <Text style={styles.productPrice}>TSh {p.price.toLocaleString()}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
    </ScreenSafeLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.inputBg,
    marginTop: scaleByHeight(8),
    marginBottom: gap.sm,
    paddingHorizontal: scaleByWidth(14),
    paddingVertical: scaleByHeight(12),
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  searchIcon: { marginRight: gap.sm },
  searchInput: { flex: 1, fontSize: scaleByWidth(16), color: Theme.text, paddingVertical: 0 },
  body: { flex: 1, flexDirection: 'row', minWidth: 0 },
  sidebar: {
    backgroundColor: Theme.backgroundSecondary,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Theme.inputBorder,
  },
  sidebarContent: {
    paddingVertical: gap.xs,
    paddingBottom: scaleByHeight(120),
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: scaleByHeight(12),
    paddingLeft: gap.sm,
    paddingRight: gap.xs,
  },
  sidebarItemActive: { backgroundColor: Theme.background },
  sidebarItemPressed: { opacity: 0.7 },
  sidebarBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: Theme.primary,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  sidebarLabel: {
    fontSize: scaleByWidth(12),
    color: Theme.textSecondary,
    flex: 1,
    lineHeight: scaleByWidth(16),
  },
  sidebarLabelActive: {
    fontWeight: '700',
    color: Theme.text,
  },
  content: { flex: 1, minWidth: 0 },
  contentInner: {},
  section: { marginBottom: sectionGap },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: gap.sm,
    gap: gap.sm,
  },
  sectionTitle: {
    flex: 1,
    fontSize: scaleByWidth(13),
    fontWeight: '700',
    color: Theme.text,
    letterSpacing: 0.3,
  },
  seeAll: { fontSize: scaleByWidth(12), fontWeight: '600', color: Theme.primary },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  productCard: {
    backgroundColor: Theme.background,
    borderRadius: scaleByWidth(10),
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.inputBorder,
  },
  productCardPressed: { opacity: 0.85 },
  productImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Theme.inputBg,
  },
  productName: {
    fontSize: scaleByWidth(12),
    color: Theme.text,
    paddingHorizontal: gap.xs,
    paddingTop: gap.xs,
    paddingBottom: 2,
    lineHeight: scaleByWidth(16),
  },
  productPrice: {
    fontSize: scaleByWidth(13),
    fontWeight: '700',
    color: Theme.primary,
    paddingHorizontal: gap.xs,
    paddingBottom: gap.sm,
  },
  emptySection: {
    paddingVertical: scaleByHeight(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: scaleByWidth(14),
    color: Theme.textMuted,
  },
});
