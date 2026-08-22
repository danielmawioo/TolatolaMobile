import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/src/services/api';
import { getCachedData, setCachedData, CACHE_KEYS } from '@/src/services/cache';
import { logger } from '@/src/lib/logger';
import type { Product } from '@/src/types';

interface UseShopScreenDataParams {
  initialCategory?: string | null;
  initialSearch?: string;
}

/**
 * Owns category/product fetching, search + location/price filtering, refresh,
 * and the offline-cache fallback for the guest shop screen.
 */
export function useShopScreenData({ initialCategory = null, initialSearch = '' }: UseShopScreenDataParams = {}) {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [searchInput, setSearchInput] = useState<string>(initialSearch);

  // Filter States (Location, Min Price, Max Price)
  const [locationQuery, setLocationQuery] = useState<string>('');
  const [minPriceQuery, setMinPriceQuery] = useState<string>('');
  const [maxPriceQuery, setMaxPriceQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);

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
      logger.warn('Failed to fetch shop data, trying cache...', err);
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleSearch = useCallback(() => {
    setSearchQuery(searchInput.trim());
  }, [searchInput]);

  const handleCategorySelect = useCallback((catId: string | null) => {
    setSelectedCategory(catId);
    setLoading(true);
  }, []);

  const activeFilterCount =
    (locationQuery.trim() ? 1 : 0) +
    (minPriceQuery.trim() ? 1 : 0) +
    (maxPriceQuery.trim() ? 1 : 0);

  return {
    categories,
    products,
    loading,
    refreshing,
    isOffline,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    searchInput,
    setSearchInput,
    locationQuery,
    setLocationQuery,
    minPriceQuery,
    setMinPriceQuery,
    maxPriceQuery,
    setMaxPriceQuery,
    showFilters,
    setShowFilters,
    activeFilterCount,
    fetchData,
    onRefresh,
    handleSearch,
    handleCategorySelect,
  };
}
