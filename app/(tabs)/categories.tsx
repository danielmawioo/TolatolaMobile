import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { gap, scaleByWidth, scaleByHeight } from '@/constants/layout';
import { OptimizedImage } from '@/components/OptimizedImage';
import { ScreenSafeLayout } from '@/components/ScreenSafeLayout';
import { apiGet } from '@/src/services/api';
import { getCachedData, setCachedData, CACHE_KEYS } from '@/src/services/cache';
import { OfflineBanner } from '@/components/OfflineBanner';
import { OfflineMessage } from '@/components/OfflineMessage';

type Category = {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  parent_id?: string | null;
};

// Fallback category images (exactly matching the website)
const categoryImages: Record<string, string> = {
  "fast-moving-consumer-goods": "https://tolatola.co/category-fmcg.jpg",
  agriculture: "https://tolatola.co/category-agriculture.jpg",
  "construction-hardware": "https://tolatola.co/category-hardware.jpg",
  handicrafts: "https://tolatola.co/category-handicrafts.jpg",
  "food-beverages": "https://tolatola.co/category-food-beverages.jpg",
  textiles: "https://tolatola.co/category-textiles.jpg",
  fashion: "https://tolatola.co/category-textiles.jpg",
  men: "https://images.unsplash.com/photo-1490578474895-699bc4e2cf59?auto=format&fit=crop&w=500&q=80",
  women: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=500&q=80",
  kids: "https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&w=500&q=80",
  electronics: "https://tolatola.co/category-electronics.jpg",
  "home-garden": "https://tolatola.co/category-home-garden.jpg",
  "health-beauty": "https://tolatola.co/category-health-beauty.jpg",
  services: "https://tolatola.co/category-services.jpg",
  vehicles: "https://tolatola.co/category-vehicles.jpg",
  "vehicles-sub": "https://tolatola.co/category-vehicles-sub.jpg",
  "ready-to-eat": "https://tolatola.co/category-ready-to-eat.jpg",
  "spare-parts": "https://tolatola.co/category-spare-parts.jpg",
  drinks: "https://tolatola.co/category-drinks.jpg",
  "non-alcoholic": "https://tolatola.co/category-non-alcoholic.jpg",
  alcoholic: "https://tolatola.co/category-alcoholic.jpg",
  motorcycles: "https://tolatola.co/category-motorcycles.jpg",
  default: "https://tolatola.co/placeholder.jpg",
};

function getCategoryImage(cat: Category): string {
  if (cat.image_url) return cat.image_url;
  if (cat.slug && categoryImages[cat.slug]) {
    return categoryImages[cat.slug];
  }
  const nameLower = (cat.name || '').toLowerCase();
  if (nameLower === 'men' || nameLower.includes("men's") || nameLower.includes('mens')) return categoryImages.men;
  if (nameLower === 'women' || nameLower.includes("women's") || nameLower.includes('womens')) return categoryImages.women;
  if (nameLower === 'kids' || nameLower.includes("kid's") || nameLower.includes('children')) return categoryImages.kids;
  if (nameLower.includes('ready to eat') || nameLower.includes('ready-to-eat')) return categoryImages["ready-to-eat"];
  if (nameLower.includes('spare') || nameLower.includes('part')) return categoryImages["spare-parts"];
  if (nameLower.includes('drink') || nameLower.includes('alcohol')) return categoryImages.drinks;
  if (nameLower.includes('agri') || nameLower.includes('farm')) return categoryImages.agriculture;
  if (nameLower.includes('food') || nameLower.includes('bev') || nameLower.includes('beverage')) return categoryImages["food-beverages"];
  if (nameLower.includes('construct') || nameLower.includes('hard') || nameLower.includes('hardware')) return categoryImages["construction-hardware"];
  if (nameLower.includes('electro')) return categoryImages.electronics;
  if (nameLower.includes('health') || nameLower.includes('beauty')) return categoryImages["health-beauty"];
  if (nameLower.includes('service')) return categoryImages.services;
  if (nameLower.includes('fmcg') || nameLower.includes('fast') || nameLower.includes('moving')) return categoryImages["fast-moving-consumer-goods"];
  if (nameLower.includes('motorcycle')) return categoryImages.motorcycles;
  if (nameLower.includes('vehicle') || nameLower.includes('car') || nameLower.includes('auto') || nameLower.includes('motor')) return categoryImages.vehicles;
  if (nameLower.includes('handicraft') || nameLower.includes('craft')) return categoryImages.handicrafts;
  if (nameLower.includes('home') || nameLower.includes('garden')) return categoryImages["home-garden"];
  if (nameLower.includes('textile') || nameLower.includes('fabric') || nameLower.includes('cloth') || nameLower.includes('fashion')) return categoryImages.textiles;
  return categoryImages.default;
}

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // 2 columns
  const numColumns = 2;
  const padding = scaleByWidth(14);
  const cardGap = gap.sm;
  const cardWidth = (width - padding * 2 - cardGap * (numColumns - 1)) / numColumns;

  async function loadCategories() {
    setLoading(true);
    try {
      const res = await apiGet<{ data: Category[] }>('/categories');
      if (res?.data) {
        // Use categories in the order returned by the API
        setCategories(res.data);
        setIsOffline(false);
        await setCachedData(CACHE_KEYS.CATEGORIES, res.data);
      }
    } catch (error) {
      console.error('Failed to load categories, trying cache', error);
      setIsOffline(true);
      const cached = await getCachedData<Category[]>(CACHE_KEYS.CATEGORIES);
      if (cached) {
        setCategories(cached);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  const filteredCategories = categories
    .filter((c) => !c.parent_id && c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const isAService = a.slug === "services" || a.name?.toLowerCase() === "services"
      const isBService = b.slug === "services" || b.name?.toLowerCase() === "services"
      if (isAService && !isBService) return 1
      if (!isAService && isBService) return -1
      return 0
    })

  return (
    <ScreenSafeLayout edges={['top']}>
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Explore Categories</Text>
          <Text style={styles.headerSubtitle}>Find exactly what you need</Text>
          
          <View style={styles.searchWrap}>
            <FontAwesome name="search" size={scaleByWidth(16)} color={Theme.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search categories..."
              placeholderTextColor={Theme.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} style={styles.clearBtn}>
                <FontAwesome name="times-circle" size={16} color={Theme.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {isOffline && <OfflineBanner onRetry={loadCategories} />}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Theme.primary} />
          </View>
        ) : isOffline && categories.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <OfflineMessage type="categories" onRetry={loadCategories} />
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + scaleByHeight(100), paddingHorizontal: padding }
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.grid}>
              {filteredCategories.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={({ pressed }) => [
                    styles.circleItem,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => router.push(`/(tabs)/shop?category=${cat.id}`)}
                >
                  <View style={styles.circleBox}>
                    <OptimizedImage
                      source={getCategoryImage(cat)}
                      width="100%"
                      height="100%"
                      style={{ borderRadius: scaleByWidth(24) }}
                    />
                  </View>
                  <Text style={styles.name} numberOfLines={2}>
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            
            {filteredCategories.length === 0 && (
              <View style={styles.empty}>
                <FontAwesome name="folder-open-o" size={48} color={Theme.textMuted} />
                <Text style={styles.emptyText}>No categories found.</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </ScreenSafeLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  header: {
    backgroundColor: Theme.background,
    paddingHorizontal: scaleByWidth(14),
    paddingTop: scaleByHeight(8),
    paddingBottom: scaleByHeight(16),
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBorder,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: scaleByWidth(24),
    fontWeight: '900',
    color: Theme.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: scaleByWidth(14),
    color: Theme.textSecondary,
    marginTop: 2,
    marginBottom: scaleByHeight(16),
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.backgroundSecondary,
    paddingHorizontal: scaleByWidth(12),
    height: scaleByHeight(44),
    borderRadius: Theme.radiusLg,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  searchIcon: { marginRight: gap.sm },
  searchInput: { 
    flex: 1, 
    fontSize: scaleByWidth(15), 
    color: Theme.text, 
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { flex: 1 },
  listContent: {
    paddingTop: scaleByHeight(16),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: scaleByHeight(22),
  },
  circleItem: {
    width: '33.33%',
    alignItems: 'center',
    paddingHorizontal: scaleByWidth(4),
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  circleBox: {
    width: scaleByWidth(90),
    height: scaleByWidth(90),
    borderRadius: scaleByWidth(24),
    overflow: 'hidden',
    backgroundColor: Theme.inputBg,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    ...Theme.shadowSm,
  },
  name: {
    fontSize: scaleByWidth(13),
    fontWeight: '700',
    color: Theme.text,
    textAlign: 'center',
    marginTop: scaleByHeight(8),
    lineHeight: scaleByHeight(16),
  },
  empty: {
    paddingVertical: scaleByHeight(40),
    alignItems: 'center',
    justifyContent: 'center',
    gap: gap.sm,
  },
  emptyText: {
    fontSize: scaleByWidth(15),
    color: Theme.textMuted,
    fontWeight: '500',
  },
});
