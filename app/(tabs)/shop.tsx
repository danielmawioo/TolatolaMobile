import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/src/contexts/AuthContext';
import { useCart } from '@/src/contexts/CartContext';
import type { Product } from '@/src/types';
import { COPY } from '@/constants/copy';
import { OfflineBanner } from '@/components/OfflineBanner';
import { OfflineMessage } from '@/components/OfflineMessage';
import { useShopScreenData } from '@/src/hooks/useShopScreenData';
import { useImageProductSearch } from '@/src/hooks/useImageProductSearch';
import { ShopHeader } from '@/src/components/shop/ShopHeader';
import { CategoryNavBar } from '@/src/components/shop/CategoryNavBar';
import { ProductListHeader } from '@/src/components/shop/ProductListHeader';
import { ImageSearchEmptyState } from '@/src/components/shop/ImageSearchEmptyState';

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
  const { session } = useAuth();
  const { items: cartItems, addItem } = useCart();

  const shop = useShopScreenData({
    initialCategory: params.categoryId || params.category || null,
    initialSearch: params.search || '',
  });
  const imageSearch = useImageProductSearch(params.imageBase64, params.mimeType);

  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const onRefresh = async () => {
    if (imageSearch.imageSearchResults !== null) {
      imageSearch.handleClearImageSearch();
    }
    await shop.onRefresh();
  };

  const toggleLike = (id: string) => {
    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const displayProducts = imageSearch.isImageSearchMode ? (imageSearch.imageSearchResults || []) : shop.products;

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

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      <ShopHeader
        theme={theme}
        session={session}
        cartCount={cartItems.length}
        searchInput={shop.searchInput}
        onSearchInputChange={shop.setSearchInput}
        onSubmitSearch={shop.handleSearch}
        onCameraPress={imageSearch.triggerImagePicker}
        showFilters={shop.showFilters}
        onToggleFilters={() => shop.setShowFilters(!shop.showFilters)}
        activeFilterCount={shop.activeFilterCount}
        locationQuery={shop.locationQuery}
        onLocationChange={shop.setLocationQuery}
        minPriceQuery={shop.minPriceQuery}
        onMinPriceChange={shop.setMinPriceQuery}
        maxPriceQuery={shop.maxPriceQuery}
        onMaxPriceChange={shop.setMaxPriceQuery}
        onApplyFilters={() => {
          shop.handleSearch();
          shop.fetchData();
        }}
        onResetFilters={() => {
          shop.setLocationQuery('');
          shop.setMinPriceQuery('');
          shop.setMaxPriceQuery('');
          shop.fetchData();
        }}
      />

      {shop.isOffline && <OfflineBanner onRetry={shop.fetchData} />}

      {/* ===== Categories Nav Bar ===== */}
      {!imageSearch.isImageSearchMode && (
        <CategoryNavBar
          categories={shop.categories}
          selectedCategory={shop.selectedCategory}
          onSelectCategory={shop.handleCategorySelect}
          theme={theme}
        />
      )}

      {/* ===== Products Grid ===== */}
      {shop.loading && !imageSearch.isImageSearchMode ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : shop.isOffline && displayProducts.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <OfflineMessage type="products" onRetry={shop.fetchData} />
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
          ListHeaderComponent={
            <ProductListHeader
              isImageSearchMode={imageSearch.isImageSearchMode}
              isImageSearching={imageSearch.isImageSearching}
              imageAnalysis={imageSearch.imageAnalysis}
              imageKeywords={imageSearch.imageKeywords}
              displayProductsCount={displayProducts.length}
              onClearImageSearch={imageSearch.handleClearImageSearch}
              searchQuery={shop.searchQuery}
              productsCount={shop.products.length}
              onClearSearch={() => {
                shop.setSearchQuery('');
                shop.setSearchInput('');
                shop.setSelectedCategory(null);
              }}
            />
          }
          renderItem={renderProduct}
          ListEmptyComponent={
            imageSearch.isImageSearchMode ? (
              <ImageSearchEmptyState
                imageAnalysis={imageSearch.imageAnalysis}
                onBackToShop={imageSearch.handleClearImageSearch}
              />
            ) : (
              <EmptyState
                icon="search"
                title={COPY.empty.shopProducts}
                message="Try another category or check back later."
                actionLabel="Clear Filters"
                onAction={() => {
                  shop.setSearchQuery('');
                  shop.setSearchInput('');
                  shop.setLocationQuery('');
                  shop.setMinPriceQuery('');
                  shop.setMaxPriceQuery('');
                  shop.setSelectedCategory(null);
                  router.setParams({ categoryId: '', search: '', category: '' });
                }}
                style={{ marginTop: 24 }}
              />
            )
          }
          refreshControl={
            <RefreshControl refreshing={shop.refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
