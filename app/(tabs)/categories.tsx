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
};

// Fallback category images (exactly matching the website)
const categoryImages: Record<string, string> = {
  "fast-moving-consumer-goods": "https://tolatola.co/category-fmcg.jpg",
  agriculture: "https://tolatola.co/fresh-vegetables-and-farming-crops.jpg",
  "construction-hardware": "https://tolatola.co/category-hardware.jpg",
  handicrafts: "https://tolatola.co/handmade-crafts-and-artisan-products.jpg",
  "food-beverages": "https://tolatola.co/delicious-food-and-beverages.jpg",
  textiles: "https://tolatola.co/colorful-fabrics-and-textiles.jpg",
  electronics: "https://tolatola.co/modern-electronics-smartphone-and-gadgets.jpg",
  "home-garden": "https://tolatola.co/home-decor-and-garden-plants.jpg",
  "health-beauty": "https://tolatola.co/beauty-and-skincare-products.jpg",
  services: "https://tolatola.co/professional-services-and-business.jpg",
  vehicles: "https://tolatola.co/category-vehicles.jpg",
  "ready-to-eat": "https://tolatola.co/delicious-food-and-beverages.jpg",
  "spare-parts": "https://tolatola.co/category-vehicles.jpg",
  drinks: "https://tolatola.co/delicious-food-and-beverages.jpg",
  default: "https://tolatola.co/placeholder.jpg",
};

function getCategoryImage(cat: Category): string {
  if (cat.image_url) return cat.image_url;
  if (cat.slug && categoryImages[cat.slug]) {
    return categoryImages[cat.slug];
  }
  const nameLower = (cat.name || '').toLowerCase();
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
  if (nameLower.includes('vehicle') || nameLower.includes('car') || nameLower.includes('auto') || nameLower.includes('motor')) return categoryImages.vehicles;
  if (nameLower.includes('handicraft') || nameLower.includes('craft')) return categoryImages.handicrafts;
  if (nameLower.includes('home') || nameLower.includes('garden')) return categoryImages["home-garden"];
  if (nameLower.includes('textile') || nameLower.includes('fabric') || nameLower.includes('cloth')) return categoryImages.textiles;
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

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

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
            <View style={[styles.grid, { gap: cardGap }]}>
              {filteredCategories.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={({ pressed }) => [
                    styles.card,
                    { width: cardWidth },
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => router.push(`/(tabs)/shop?category=${cat.id}`)}
                >
                  <View style={styles.imageContainer}>
                    <OptimizedImage
                      source={getCategoryImage(cat)}
                      width="100%"
                      aspectRatio={1.2}
                    />
                    
                    {/* Gradient Overlay for Text Readability */}
                    <View style={styles.gradientOverlay} />
                    
                    <View style={styles.cardContent}>
                      <Text style={styles.name} numberOfLines={2}>
                        {cat.name}
                      </Text>
                    </View>
                  </View>
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
  },
  card: {
    backgroundColor: Theme.background,
    borderRadius: Theme.radiusLg,
    overflow: 'hidden',
    ...Theme.shadowMd,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1.1,
    backgroundColor: Theme.inputBg,
    position: 'relative',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: scaleByWidth(12),
  },
  name: {
    fontSize: scaleByWidth(14),
    fontWeight: '800',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
