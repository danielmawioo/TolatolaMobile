import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, RefreshControl, ScrollView, Dimensions, TextInput, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { apiGet, apiPost } from '@/src/services/api';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/src/hooks/useThemeColors';
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
import { pickImageSafe, requestImagePermissions } from '@/src/lib/imagePicker';

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
 * Displays top navbar, categories bar, product grid using ProductCard, Image Search, and Location/Price Filters.
 */
export default function GuestShopScreen() {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const params = useLocalSearchParams<{
    categoryId?: string;
    category?: string;
    search?: string;
    imageBase64?: string;
    mimeType?: string;
  }>();
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

  // Filter States (Location, Min Price, Max Price)
  const [locationQuery, setLocationQuery] = useState<string>('');
  const [minPriceQuery, setMinPriceQuery] = useState<string>('');
  const [maxPriceQuery, setMaxPriceQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Image Search States
  const [isImageSearching, setIsImageSearching] = useState<boolean>(false);
  const [imageSearchResults, setImageSearchResults] = useState<Product[] | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<string>('');
  const [imageKeywords, setImageKeywords] = useState<string[]>([]);

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
      if (minPriceQuery) queryParams.append('minPrice', minPriceQuery);
      if (maxPriceQuery) queryParams.append('maxPrice', maxPriceQuery);

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

      if (!selectedCategory && !searchQuery && !locationQuery && !minPriceQuery && !maxPriceQuery) {
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
        if (minPriceQuery) {
          const min = Number(minPriceQuery);
          if (!isNaN(min)) filtered = filtered.filter(p => (p.price || 0) >= min);
        }
        if (maxPriceQuery) {
          const max = Number(maxPriceQuery);
          if (!isNaN(max)) filtered = filtered.filter(p => (p.price || 0) <= max);
        }
        setProducts(filtered);
      } else {
        setProducts([]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, locationQuery, minPriceQuery, maxPriceQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Image search execution helper
  const handleImageSearch = useCallback(async (base64Data: string, mimeType?: string) => {
    setIsImageSearching(true);
    setImageSearchResults(null);
    setImageAnalysis('');
    setImageKeywords([]);

    try {
      const formattedBase64 = base64Data.startsWith('data:')
        ? base64Data
        : `data:${mimeType || 'image/jpeg'};base64,${base64Data}`;

      const res = await apiPost<{
        data?: Product[];
        analysis?: string;
        keywords?: string[];
        total?: number;
      }>('/products/search-by-image', { image: formattedBase64 });

      setImageSearchResults(res.data || []);
      if (res.analysis) setImageAnalysis(res.analysis);
      if (res.keywords) setImageKeywords(res.keywords);
    } catch (err) {
      console.error('[Image Search Error]', err);
      setImageSearchResults([]);
      Alert.alert('Image search failed', 'Could not analyze your image. Please try again.');
    } finally {
      setIsImageSearching(false);
    }
  }, []);

  // Run image search if redirected with imageBase64 param
  useEffect(() => {
    if (params.imageBase64) {
      handleImageSearch(params.imageBase64, params.mimeType);
    }
  }, [params.imageBase64, params.mimeType, handleImageSearch]);

  const triggerImagePicker = () => {
    Alert.alert(
      'Search by Image',
      'Upload a photo to find matching products using TOLATOLA AI',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const ok = await requestImagePermissions();
            if (!ok) return;
            const picked = await pickImageSafe(true);
            if (picked?.base64) {
              handleImageSearch(picked.base64, picked.mimeType);
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const ok = await requestImagePermissions();
            if (!ok) return;
            const picked = await pickImageSafe(false);
            if (picked?.base64) {
              handleImageSearch(picked.base64, picked.mimeType);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const handleClearImageSearch = () => {
    setImageSearchResults(null);
    setImageAnalysis('');
    setImageKeywords([]);
    setIsImageSearching(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (imageSearchResults !== null) {
      handleClearImageSearch();
    }
    await fetchData();
    setRefreshing(false);
  }, [fetchData, imageSearchResults]);

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

  const activeFilterCount =
    (locationQuery.trim() ? 1 : 0) +
    (minPriceQuery.trim() ? 1 : 0) +
    (maxPriceQuery.trim() ? 1 : 0);

  const isImageSearchMode = isImageSearching || imageSearchResults !== null;
  const displayProducts = isImageSearchMode ? (imageSearchResults || []) : products;

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
    if (isImageSearchMode) {
      return (
        <View style={{ marginBottom: 16 }}>
          {isImageSearching && (
            <View style={styles.aiAnalyzingCard}>
              <ActivityIndicator size="large" color="#F59E0B" style={{ marginBottom: 12 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <FontAwesome name="camera" size={16} color="#F59E0B" />
                <Text style={styles.aiAnalyzingTitle}>AI is Analyzing Your Image...</Text>
              </View>
              <Text style={styles.aiAnalyzingDesc}>
                TOLATOLA AI is identifying product features, category, and visual details to find matching products for you.
              </Text>
            </View>
          )}

          {!isImageSearching && (
            <View style={styles.imageResultsCard}>
              <View style={styles.imageResultsHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                  <View style={styles.cameraIconBox}>
                    <FontAwesome name="camera" size={16} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <FontAwesome name="sparkles" size={14} color="#F59E0B" />
                      <Text style={styles.imageResultsTitle}>Image Search Results</Text>
                    </View>
                    {imageAnalysis ? (
                      <Text style={styles.imageResultsAnalysis}>
                        AI identified: <Text style={{ fontWeight: '800', color: Theme.textPrimary }}>{imageAnalysis}</Text>
                      </Text>
                    ) : null}
                    {imageKeywords.length > 0 && (
                      <View style={styles.keywordPillsRow}>
                        {imageKeywords.slice(0, 6).map((kw, i) => (
                          <View key={i} style={styles.keywordPill}>
                            <Text style={styles.keywordPillText}>{kw.toUpperCase()}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    <Text style={styles.imageResultsCount}>
                      {displayProducts.length} {displayProducts.length === 1 ? 'product' : 'products'} found
                    </Text>
                  </View>
                </View>
                <Pressable onPress={handleClearImageSearch} style={styles.clearImageBtn} hitSlop={10}>
                  <FontAwesome name="times" size={16} color={Theme.textMuted} />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      );
    }

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

  const userType = session?.user?.user_type || (session?.user as any)?.role;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      {/* ===== Top Navbar – Row 1 ===== */}
      <View style={[styles.headerContainer, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
        <View style={styles.headerTop}>
          <Pressable style={styles.logoGroup} onPress={() => router.push('/(tabs)')}>
            <View style={[styles.logoBox, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <OptimizedImage source="https://tolatola.co/logo-new.png" width="100%" height="100%" resizeMode="contain" />
            </View>
            <Text style={[styles.logoTitle, { color: theme.primary }]}>TOLA.</Text>
          </Pressable>
          <View style={styles.headerRight}>
            {/* Show dashboard buttons for ALL approved roles */}
            {((session?.user as any)?.vendor?.kyc_status === 'approved' || userType === 'vendor') && (
              <Pressable 
                style={({ pressed }) => [styles.dashboardBtn, pressed && { opacity: 0.75 }]} 
                onPress={() => router.push('/(vendor)/dashboard' as any)}
                hitSlop={10}
              >
                <FontAwesome name="dashboard" size={13} color="#fff" />
                <Text style={styles.dashboardBtnLabel}>Seller Hub</Text>
              </Pressable>
            )}
            {((session?.user as any)?.transporter?.kyc_status === 'approved' || userType === 'transporter') && (
              <Pressable 
                style={({ pressed }) => [styles.dashboardBtn, { backgroundColor: '#10b981' }, pressed && { opacity: 0.75 }]} 
                onPress={() => router.push('/(transporter)/dashboard' as any)}
                hitSlop={10}
              >
                <FontAwesome name="truck" size={13} color="#fff" />
                <Text style={styles.dashboardBtnLabel}>Transporter</Text>
              </Pressable>
            )}
            {userType === 'admin' && (
              <Pressable 
                style={({ pressed }) => [styles.dashboardBtn, pressed && { opacity: 0.75 }]} 
                onPress={() => router.push(getRoleRedirectPath('admin') as any)}
                hitSlop={10}
              >
                <FontAwesome name="gears" size={13} color="#fff" />
                <Text style={styles.dashboardBtnLabel}>Admin</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.shopTextBtn, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '40' }, pressed && { opacity: 0.7 }]}
              onPress={() => {}}
              hitSlop={10}
            >
              <FontAwesome name="shopping-bag" size={14} color={theme.primary} />
              <Text style={[styles.shopTextBtnLabel, { color: theme.primary }]}>Shop</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.iconButton, { backgroundColor: theme.iconBg }, pressed && { opacity: 0.7 }, { marginRight: 4 }]}
              onPress={() => router.push('/(tabs)/favorites')}
              hitSlop={10}
            >
              <FontAwesome name="heart-o" size={20} color={theme.primary} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.iconButton, { backgroundColor: theme.iconBg }, pressed && { opacity: 0.7 }]}
              onPress={() => router.push('/(tabs)/cart')}
              hitSlop={10}
            >
              <FontAwesome name="shopping-cart" size={22} color={theme.primary} />
              {cartItems.length > 0 && (
                <View style={[styles.badge, { borderColor: theme.background }]}>
                  <Text style={styles.badgeText}>{cartItems.length > 99 ? '99+' : cartItems.length}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Navbar – Row 2: Track Order + Search (with Camera & Sliders) */}
        <View style={styles.headerRow2}>
          <Pressable
            style={({ pressed }) => [styles.trackOrderBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push('/(guest)/track')}
          >
            <FontAwesome name="map-marker" size={14} color="#fff" />
            <Text style={styles.trackOrderBtnText}>Track Order</Text>
          </Pressable>
          <View style={[styles.headerSearchBar, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
            <FontAwesome name="search" size={14} color={theme.textMuted} />
            <TextInput
              style={[styles.headerSearchInput, { color: theme.text }]}
              placeholder="Search products..."
              placeholderTextColor={theme.textMuted}
              value={searchInput}
              onChangeText={setSearchInput}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {/* Camera Button for Image Search */}
            <Pressable
              onPress={triggerImagePicker}
              style={{ paddingHorizontal: 6, paddingVertical: 5 }}
              hitSlop={8}
            >
              <FontAwesome name="camera" size={15} color="#F59E0B" />
            </Pressable>
            {/* Filter Toggle */}
            <Pressable
              onPress={() => setShowFilters(!showFilters)}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 5,
                borderRadius: 8,
                backgroundColor: showFilters ? Theme.primary : 'transparent',
                position: 'relative',
              }}
              hitSlop={8}
            >
              <FontAwesome name="sliders" size={14} color={showFilters ? '#fff' : activeFilterCount > 0 ? Theme.primary : Theme.textMuted} />
              {activeFilterCount > 0 && !showFilters && (
                <View style={styles.filterBadgeMini}>
                  <Text style={styles.filterBadgeMiniText}>{activeFilterCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Expandable Location & Price Filter Drawer */}
        {showFilters && (
          <View style={styles.filtersPanel}>
            <View style={styles.filterRow}>
              <FontAwesome name="map-marker" size={14} color={Theme.primary} style={{ width: 18 }} />
              <TextInput
                style={styles.filterInput}
                placeholder="Filter by location (e.g. Dar es Salaam, Pwani...)"
                placeholderTextColor={Theme.textMuted}
                value={locationQuery}
                onChangeText={setLocationQuery}
                returnKeyType="done"
              />
              {locationQuery.trim() !== '' && (
                <Pressable onPress={() => setLocationQuery('')} style={{ padding: 4 }}>
                  <FontAwesome name="times-circle" size={14} color={Theme.textMuted} />
                </Pressable>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={[styles.filterRow, { flex: 1 }]}>
                <FontAwesome name="money" size={13} color="#10B981" style={{ width: 18 }} />
                <TextInput
                  style={styles.filterInput}
                  placeholder="Min Price (TZS)"
                  placeholderTextColor={Theme.textMuted}
                  keyboardType="numeric"
                  value={minPriceQuery}
                  onChangeText={setMinPriceQuery}
                  returnKeyType="done"
                />
              </View>
              <View style={[styles.filterRow, { flex: 1 }]}>
                <FontAwesome name="money" size={13} color="#10B981" style={{ width: 18 }} />
                <TextInput
                  style={styles.filterInput}
                  placeholder="Max Price (TZS)"
                  placeholderTextColor={Theme.textMuted}
                  keyboardType="numeric"
                  value={maxPriceQuery}
                  onChangeText={setMaxPriceQuery}
                  returnKeyType="done"
                />
              </View>
            </View>
            <View style={styles.filterActions}>
              <Pressable
                style={[styles.filterBtn, { backgroundColor: Theme.primary }]}
                onPress={() => {
                  handleSearch();
                  fetchData();
                }}
              >
                <FontAwesome name="search" size={12} color="#fff" />
                <Text style={styles.filterBtnText}>Apply Filters</Text>
              </Pressable>
              {activeFilterCount > 0 && (
                <Pressable
                  style={[styles.filterBtn, { backgroundColor: Theme.backgroundTertiary }]}
                  onPress={() => {
                    setLocationQuery('');
                    setMinPriceQuery('');
                    setMaxPriceQuery('');
                    fetchData();
                  }}
                >
                  <Text style={[styles.filterBtnText, { color: Theme.textMuted }]}>Reset</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>

      {isOffline && <OfflineBanner onRetry={fetchData} />}

      {/* ===== Categories Nav Bar ===== */}
      {!isImageSearchMode && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.catNav, { backgroundColor: theme.background, borderBottomColor: theme.border }]}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
        >
          <Pressable style={styles.catCircleItem} onPress={() => handleCategorySelect(null)}>
            <View style={[styles.catCircle, !selectedCategory && styles.catCircleActive]}>
              <FontAwesome name="th-large" size={20} color={!selectedCategory ? '#fff' : Theme.primary} />
            </View>
            <Text style={[styles.catCircleLabel, { color: theme.textSecondary }, !selectedCategory && styles.catCircleLabelActive]}>All</Text>
          </Pressable>
          {categories.filter((c: any) => !c.parent_id).sort((a: any, b: any) => {
            const isAService = a.slug === "services" || a.name?.toLowerCase() === "services"
            const isBService = b.slug === "services" || b.name?.toLowerCase() === "services"
            if (isAService && !isBService) return 1
            if (!isAService && isBService) return -1
            return 0
          }).map(c => {
            const isSelected = selectedCategory === c.id;
            return (
              <Pressable key={c.id} style={styles.catCircleItem} onPress={() => handleCategorySelect(c.id)}>
                <View style={[styles.catCircle, { backgroundColor: theme.catCircleBg, borderColor: theme.catCircleBorder }, isSelected && styles.catCircleActive]}>
                  <OptimizedImage source={getCategoryImages(c)} width="100%" height="100%" style={{ borderRadius: 18 }} />
                </View>
                <Text style={[styles.catCircleLabel, { color: theme.textSecondary }, isSelected && styles.catCircleLabelActive]} numberOfLines={2}>{c.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Subcategory pills bar */}
      {!isImageSearchMode && (() => {
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
      {loading && !isImageSearchMode ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : isOffline && displayProducts.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <OfflineMessage type="products" onRetry={fetchData} />
        </View>
      ) : (
        <FlatList
          data={displayProducts}
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
            isImageSearchMode ? (
              <View style={styles.imageEmptyCard}>
                <View style={styles.imageEmptyIconBox}>
                  <FontAwesome name="camera" size={28} color={Theme.textMuted} />
                </View>
                {imageAnalysis ? (
                  <Text style={styles.imageEmptyAnalysis}>
                    We identified: <Text style={{ fontWeight: '800', color: Theme.textPrimary }}>{imageAnalysis}</Text>
                  </Text>
                ) : null}
                <Text style={styles.imageEmptyTitle}>No similar products found</Text>
                <Text style={styles.imageEmptySub}>Try uploading a different photo with clearer product details.</Text>
                <Pressable onPress={handleClearImageSearch} style={styles.backToShopBtn}>
                  <Text style={styles.backToShopText}>Back to Shop</Text>
                </Pressable>
              </View>
            ) : (
              <EmptyState
                icon="search"
                title={COPY.empty.shopProducts}
                message="Try another category or check back later."
                actionLabel="Clear Filters"
                onAction={() => {
                  setSearchQuery('');
                  setSearchInput('');
                  setLocationQuery('');
                  setMinPriceQuery('');
                  setMaxPriceQuery('');
                  setSelectedCategory(null);
                  router.setParams({ categoryId: '', search: '', category: '' });
                }}
                style={{ marginTop: 24 }}
              />
            )
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />
          }
        />
      )}
    </View>
  );
}

// Rename helper function inside file to avoid conflicts
function getCategoryImages(cat: any) {
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

const styles = StyleSheet.create({
  container: { flex: 1 },

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
    color: Theme.primary,
    letterSpacing: 1.5,
    lineHeight: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadowSm,
  },
  dashboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Theme.primary,
    ...Theme.shadowSm,
  },
  dashboardBtnLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
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
    paddingHorizontal: 12,
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
  filterBadgeMini: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Theme.accentRed,
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeMiniText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },

  /* ===== Expandable Filter Panel ===== */
  filtersPanel: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
  },
  filterInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Theme.textPrimary,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  /* ===== Image Search Components ===== */
  aiAnalyzingCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAnalyzingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  aiAnalyzingDesc: {
    fontSize: 12,
    color: '#B45309',
    textAlign: 'center',
    lineHeight: 18,
  },
  imageResultsCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 14,
  },
  imageResultsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cameraIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageResultsTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#78350F',
  },
  imageResultsAnalysis: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 2,
  },
  keywordPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  keywordPill: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  keywordPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#78350F',
  },
  imageResultsCount: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '700',
    marginTop: 6,
  },
  clearImageBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageEmptyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
  },
  imageEmptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  imageEmptyAnalysis: {
    fontSize: 13,
    color: Theme.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  imageEmptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.textPrimary,
  },
  imageEmptySub: {
    fontSize: 12,
    color: Theme.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  backToShopBtn: {
    marginTop: 16,
    backgroundColor: Theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backToShopText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },

  /* ===== Categories Nav ===== */
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

