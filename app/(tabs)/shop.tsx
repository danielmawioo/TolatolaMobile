import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, RefreshControl, ScrollView, Dimensions, TextInput, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { apiGet } from '@/src/services/api';
import { Theme } from '@/constants/Theme';
import { OptimizedImage } from '@/components/OptimizedImage';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { useAuth } from '@/src/contexts/AuthContext';
import { useCart } from '@/src/contexts/CartContext';
import { getRoleRedirectPath } from '@/src/lib/roleRedirect';
import type { Product } from '@/src/types';
import { COPY } from '@/constants/copy';
import { getCachedData, setCachedData, CACHE_KEYS } from '@/src/services/cache';
import { OfflineBanner } from '@/components/OfflineBanner';
import { OfflineMessage } from '@/components/OfflineMessage';

const { width } = Dimensions.get('window');

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

/**
 * Guest/browse shop: product listing with full header parity to the website.
 * Displays top navbar, categories bar, and product grid using ProductCard.
 */
export default function GuestShopScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ categoryId?: string; category?: string; search?: string }>();
  const { isAuthenticated, session } = useAuth();
  const { items: cartItems, addItem } = useCart();

  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    params.categoryId || params.category || null
  );
  const [searchQuery, setSearchQuery] = useState<string>(params.search || '');
  const [searchInput, setSearchInput] = useState<string>(params.search || '');
  const [locationQuery, setLocationQuery] = useState<string>('');
  const [showLocationFilter, setShowLocationFilter] = useState<boolean>(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const getCategoryImage = (cat: any) => {
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
  };

  const fetchData = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      if (selectedCategory) queryParams.append('category', selectedCategory);
      if (searchQuery) queryParams.append('search', searchQuery);
      if (locationQuery) queryParams.append('location', locationQuery);

      const prodUrl = queryParams.toString() ? `/products?${queryParams.toString()}` : '/products';

      const [catRes, prodRes] = await Promise.all([
        apiGet<{ categories?: any[]; data?: any[] }>('/categories'),
        apiGet<{ products?: Product[]; data?: Product[] } | Product[]>(prodUrl),
      ]);

      const cats = (catRes as any)?.data || (catRes as any)?.categories || [];
      const prods = (prodRes as any)?.data || (prodRes as any)?.products || (Array.isArray(prodRes) ? prodRes : []);

      setCategories(cats);
      setProducts(prods);
      setIsOffline(false);

      if (!selectedCategory && !searchQuery) {
        await setCachedData(CACHE_KEYS.SHOP_PRODUCTS, prods);
      }
      await setCachedData(CACHE_KEYS.CATEGORIES, cats);
    } catch (err) {
      console.log('Failed to fetch shop data, trying cache...', err);
      setIsOffline(true);

      const cachedCats = await getCachedData<any[]>(CACHE_KEYS.CATEGORIES);
      const cachedProds = await getCachedData<Product[]>(CACHE_KEYS.SHOP_PRODUCTS);

      if (cachedCats) setCategories(cachedCats);

      if (cachedProds) {
        let filtered = [...cachedProds];
        if (selectedCategory) {
          filtered = filtered.filter(p => (p as any).category_id === selectedCategory || (p as any).category?.id === selectedCategory);
        }
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(p => p.name?.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query));
        }
        setProducts(filtered);
      } else {
        setProducts([]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
  };

  const toggleLike = (id: string) => {
    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCategorySelect = (catId: string | null) => {
    setSelectedCategory(catId);
    setLoading(true);
  };

  // We use percentage width in styles to ensure 2 items per row instead of fixed calculations

  const renderProduct = ({ item: p }: { item: Product }) => (
    <View style={styles.productCardWrapper}>
      <ProductCard
        product={p}
        style={{ width: '100%', marginRight: 0 }}
        isLiked={likedIds.has(p.id)}
        isInCart={cartItems.some(i => i.product_id === p.id)}
        onAddToCart={addItem}
        onToggleLike={toggleLike}
      />
    </View>
  );

  const renderSearchResults = () => {
    if (!searchQuery) return null;
    return (
      <View style={styles.searchResultsHeader}>
        <Text style={styles.searchResultsText}>
          {products.length} {products.length === 1 ? 'product' : 'products'} found for "{searchQuery}"
        </Text>
        <Pressable onPress={() => { setSearchQuery(''); setSearchInput(''); setSelectedCategory(null); }} style={styles.clearSearchBtn}>
          <Text style={styles.clearSearchText}>Clear</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ===== Top Navbar – Row 1 (same as home) ===== */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <Pressable style={styles.logoGroup} onPress={() => router.push('/(tabs)')}>
            <View style={styles.logoBox}>
              <OptimizedImage source="https://tolatola.co/logo-new.png" width="100%" height="100%" resizeMode="contain" />
            </View>
            <View>
              <Text style={styles.logoTitle}>TOLA.</Text>
              <Text style={styles.logoSubtitle}>YOUR TRADE PARTNER</Text>
            </View>
          </Pressable>
          <View style={styles.headerRight}>
            <Pressable
              style={({ pressed }) => [styles.shopTextBtn, pressed && { opacity: 0.7 }]}
              onPress={() => {}}
              hitSlop={10}
            >
              <FontAwesome name="shopping-bag" size={14} color={Theme.primary} />
              <Text style={styles.shopTextBtnLabel}>Shop</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }, { marginRight: 12 }]}
              onPress={() => router.push('/(tabs)/favorites')}
              hitSlop={10}
            >
              <FontAwesome name="heart-o" size={20} color={Theme.primary} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
              onPress={() => router.push('/(tabs)/cart')}
              hitSlop={10}
            >
              <FontAwesome name="shopping-cart" size={22} color={Theme.primary} />
              {cartItems.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartItems.length > 99 ? '99+' : cartItems.length}</Text>
                </View>
              )}
            </Pressable>

          </View>
        </View>

        {/* Navbar – Row 2: Track Order + Search */}
        <View style={styles.headerRow2}>
          <Pressable
            style={({ pressed }) => [styles.trackOrderBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push('/(guest)/track')}
          >
            <FontAwesome name="map-marker" size={14} color="#fff" />
            <Text style={styles.trackOrderBtnText}>Track Order</Text>
          </Pressable>
          <View style={styles.headerSearchBar}>
            <FontAwesome name="search" size={14} color={Theme.textMuted} />
            <TextInput
              style={styles.headerSearchInput}
              placeholder="Search products..."
              placeholderTextColor={Theme.textMuted}
              value={searchInput}
              onChangeText={setSearchInput}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <Pressable
              onPress={() => setShowLocationFilter(!showLocationFilter)}
              style={{ padding: 4 }}
            >
              <FontAwesome name="sliders" size={14} color={locationQuery ? Theme.primary : Theme.textMuted} />
            </Pressable>
          </View>
        </View>

        {/* Inline Location Filter Row */}
        {showLocationFilter && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 16,
            paddingBottom: 8,
            backgroundColor: '#F8FAFC',
          }}>
            <FontAwesome name="map-marker" size={14} color={Theme.primary} />
            <TextInput
              style={{
                flex: 1,
                height: 36,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                borderRadius: 10,
                paddingHorizontal: 12,
                fontSize: 13,
                fontWeight: '600',
                backgroundColor: '#fff',
                color: Theme.textPrimary,
              }}
              placeholder="Filter by location (e.g. Pwani, Arusha...)"
              placeholderTextColor={Theme.textMuted}
              value={locationQuery}
              onChangeText={setLocationQuery}
              onSubmitEditing={() => {
                handleSearch();
                fetchData();
              }}
              returnKeyType="search"
            />
            {locationQuery.trim() !== '' && (
              <Pressable
                onPress={() => {
                  setLocationQuery('');
                  fetchData();
                }}
                style={{ padding: 4 }}
              >
                <FontAwesome name="times-circle" size={16} color={Theme.textMuted} />
              </Pressable>
            )}
          </View>
        )}
      </View>

      {isOffline && <OfflineBanner onRetry={fetchData} />}

      {/* ===== Categories Nav Bar (same as home/website) ===== */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catNav}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        <Pressable
          style={[styles.catPill, !selectedCategory && styles.catPillActive]}
          onPress={() => handleCategorySelect(null)}
        >
          <FontAwesome name="th-large" size={12} color={!selectedCategory ? '#fff' : Theme.textSecondary} />
          <Text style={[styles.catPillText, !selectedCategory && styles.catPillTextActive]}>ALL CATEGORIES</Text>
        </Pressable>
        {categories.filter((c: any) => !c.parent_id).sort((a: any, b: any) => {
          const isAService = a.slug === "services" || a.name?.toLowerCase() === "services"
          const isBService = b.slug === "services" || b.name?.toLowerCase() === "services"
          if (isAService && !isBService) return 1
          if (!isAService && isBService) return -1
          return 0
        }).map(c => (
          <Pressable
            key={c.id}
            style={[styles.catPill, selectedCategory === c.id && styles.catPillActive]}
            onPress={() => handleCategorySelect(c.id)}
          >
            <View style={styles.catPillImgBox}>
              <OptimizedImage source={getCategoryImage(c)} width="100%" height="100%" />
            </View>
            <Text style={[styles.catPillText, selectedCategory === c.id && styles.catPillTextActive]}>{c.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Subcategory pills bar */}
      {(() => {
        const activeCat = categories.find(c => c.id === selectedCategory);
        const parentCat = activeCat?.parent_id
          ? categories.find(c => c.id === activeCat.parent_id)
          : activeCat;
        const subCats = parentCat ? categories.filter(c => c.parent_id === parentCat.id) : [];
        if (subCats.length === 0 || !parentCat) return null;
        return (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.catNav, { paddingTop: 0, paddingBottom: 8, borderBottomWidth: 0 }]}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            <Pressable
              style={[styles.catPill, selectedCategory === parentCat.id && styles.catPillActive]}
              onPress={() => handleCategorySelect(parentCat.id)}
            >
              <Text style={[styles.catPillText, selectedCategory === parentCat.id && styles.catPillTextActive]}>All {parentCat.name}</Text>
            </Pressable>
            {subCats.map((sub: any) => (
              <Pressable
                key={sub.id}
                style={[styles.catPill, selectedCategory === sub.id && styles.catPillActive]}
                onPress={() => handleCategorySelect(sub.id)}
              >
                <Text style={[styles.catPillText, selectedCategory === sub.id && styles.catPillTextActive]}>{sub.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        );
      })()}

      {/* ===== Products Grid ===== */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : isOffline && products.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <OfflineMessage type="products" onRetry={fetchData} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 48 + insets.bottom },
          ]}
          ListHeaderComponent={renderSearchResults}
          renderItem={renderProduct}
          ListEmptyComponent={
            <EmptyState
              icon="search"
              title={COPY.empty.shopProducts}
              message="Try another category or check back later."
              actionLabel="Clear Filters"
              onAction={() => {
                setSearchQuery('');
                setSearchInput('');
                setSelectedCategory(null);
                router.setParams({ categoryId: '', search: '', category: '' });
              }}
              style={{ marginTop: 24 }}
            />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  /* ===== Top Navbar ===== */
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBorder,
    backgroundColor: 'rgba(255,255,255,0.95)',
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Theme.inputBg,
    ...Theme.shadowSm,
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Theme.text,
    lineHeight: 20,
  },
  logoSubtitle: {
    fontSize: 8,
    fontWeight: '900',
    color: Theme.primary,
    letterSpacing: 1.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadowSm,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Theme.accentRed,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },

  shopTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.primary + '15',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Theme.primary + '40',
  },
  shopTextBtnLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.primary,
  },
  headerRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  trackOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    ...Theme.shadowSm,
  },
  trackOrderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  headerSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.inputBg,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    height: 40,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: Theme.text,
    paddingVertical: 0,
  },

  /* ===== Categories Nav ===== */
  catNav: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBorder,
    paddingVertical: 16,
    backgroundColor: '#fff',
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 16,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    gap: 8,
  },
  catPillActive: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
    ...Theme.shadowSm,
  },
  catPillText: { fontSize: 11, fontWeight: '700', color: Theme.textSecondary },
  catPillTextActive: { color: '#fff' },
  catPillImgBox: { width: 20, height: 20, borderRadius: 6, overflow: 'hidden', backgroundColor: Theme.inputBg },

  /* ===== Search Results Header ===== */
  searchResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  searchResultsText: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.text,
    flex: 1,
  },
  clearSearchBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: Theme.backgroundTertiary,
    borderRadius: 12,
  },
  clearSearchText: {
    fontSize: 12,
    color: Theme.textMuted,
    fontWeight: '600',
  },

  /* ===== Products Grid ===== */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Theme.textMuted,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productCardWrapper: {
    width: '48%',
  },
});
