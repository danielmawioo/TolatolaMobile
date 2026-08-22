import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/src/services/api';
import { getCachedData, setCachedData, CACHE_KEYS } from '@/src/services/cache';
import { logger } from '@/src/lib/logger';
import type { Product } from '@/src/types';
import * as Location from 'expo-location';

export interface SupplyChainProducts {
  matched: Product[];
  others: Product[];
}

export interface UserCoords {
  latitude: number;
  longitude: number;
}

/**
 * Returns the top-level (non-child) categories, sorted so "services" always
 * sorts last. Used by both the top category pill nav and the category grid
 * section on the home screen.
 */
export function sortTopLevelCategories(categories: any[]): any[] {
  return categories
    .filter((c: any) => !c.parent_id)
    .sort((a: any, b: any) => {
      const isAService = a.slug === 'services' || a.name?.toLowerCase() === 'services';
      const isBService = b.slug === 'services' || b.name?.toLowerCase() === 'services';
      if (isAService && !isBService) return 1;
      if (!isAService && isBService) return -1;
      return 0;
    });
}

interface UseHomeScreenDataParams {
  isAuthenticated: boolean;
  accessToken: string | null | undefined;
}

/**
 * Owns all data-fetching state for the guest/buyer home screen: categories,
 * promotions, products (with a personalized "for you" variant plus a
 * supply-chain-match notification when authenticated), the location used to
 * rank those products, offline/cache fallback, and a silent 60s refresh.
 */
export function useHomeScreenData({ isAuthenticated, accessToken }: UseHomeScreenDataParams) {
  const [categories, setCategories] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Smart Supply Chain matching states
  const [scNotification, setScNotification] = useState<any>(null);
  const [scProducts, setScProducts] = useState<SupplyChainProducts>({ matched: [], others: [] });
  const [userLocation, setUserLocation] = useState<UserCoords | null>(null);

  const fetchLocation = useCallback(async (): Promise<UserCoords | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (loc?.coords) {
          const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setUserLocation(coords);
          return coords;
        }
      }
    } catch (err) {
      logger.warn('Error getting location for ranking:', err);
    }
    return null;
  }, []);

  const loadCategoriesPromotionsAndProducts = useCallback(
    async (coords: UserCoords | null) => {
      const catPromise = apiGet<any>('/categories');
      const promoPromise = apiGet<any>('/promotions');

      let prodPromise: Promise<any>;
      let notifPromise: Promise<any> = Promise.resolve(null);

      if (isAuthenticated && accessToken) {
        const queryStr = coords ? `/products/for-you?userLat=${coords.latitude}&userLng=${coords.longitude}` : '/products/for-you';
        prodPromise = apiGet<any>(queryStr, accessToken);
        notifPromise = apiGet<any>('/notifications/supply-chain', accessToken);
      } else {
        prodPromise = apiGet<any>('/products');
      }

      const [catRes, promoRes, prodRes, notifRes] = await Promise.all([
        catPromise,
        promoPromise,
        prodPromise,
        notifPromise,
      ]);

      const cats = catRes?.data || catRes?.categories || [];
      const promos = promoRes?.data || [];
      setCategories(cats);
      setPromotions(promos);
      setIsOffline(false);

      // Save to cache
      await setCachedData(CACHE_KEYS.CATEGORIES, cats);
      await setCachedData(CACHE_KEYS.HOME_PROMOTIONS, promos);

      let prodsList: Product[] = [];
      if (isAuthenticated && prodRes?.data) {
        const matched = prodRes.data.matched || [];
        const others = prodRes.data.others || [];
        setScProducts({ matched, others });
        prodsList = [...matched, ...others];
        setProducts(prodsList);
      } else {
        prodsList = (prodRes as any)?.data || (prodRes as any)?.products || (Array.isArray(prodRes) ? prodRes : []);
        setProducts(prodsList);
        setScProducts({ matched: [], others: [] });
      }
      await setCachedData(CACHE_KEYS.HOME_PRODUCTS, prodsList);

      if (notifRes?.data && notifRes.data.length > 0) {
        setScNotification(notifRes.data[0]);
      } else {
        setScNotification(null);
      }
    },
    [isAuthenticated, accessToken]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let coords = userLocation;
      if (isAuthenticated && !coords) {
        coords = await fetchLocation();
      }
      await loadCategoriesPromotionsAndProducts(coords);
    } catch (e) {
      logger.warn('Error fetching home data, trying cache...', e);
      setIsOffline(true);

      const cachedCats = await getCachedData(CACHE_KEYS.CATEGORIES);
      const cachedPromos = await getCachedData(CACHE_KEYS.HOME_PROMOTIONS);
      const cachedProds = await getCachedData(CACHE_KEYS.HOME_PRODUCTS);

      if (cachedCats) setCategories(cachedCats);
      if (cachedPromos) setPromotions(cachedPromos);
      if (cachedProds) {
        setProducts(cachedProds);
        setScProducts({ matched: [], others: [] });
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, accessToken, userLocation, fetchLocation, loadCategoriesPromotionsAndProducts]);

  const fetchDataSilent = useCallback(async () => {
    try {
      const coords = userLocation;
      await loadCategoriesPromotionsAndProducts(coords);
    } catch (e) {
      logger.warn('Silent refresh failed:', e);
      setIsOffline(true);
    }
  }, [isAuthenticated, accessToken, userLocation, loadCategoriesPromotionsAndProducts]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Silent refresh interval for non-disruptive homepage updates (every 60s)
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      fetchDataSilent();
    }, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchDataSilent]);

  const featuredProducts = products.slice(0, 10);
  const bestSelling = [...products]
    .sort((a, b) => (Number(b.sales_count) || 0) - (Number(a.sales_count) || 0))
    .filter((p) => (Number(p.sales_count) || 0) > 0)
    .slice(0, 10);
  const bestDeals = products
    .filter((p) => p.compare_at_price && (p.compare_at_price as number) > (p.price ?? 0))
    .slice(0, 10);

  return {
    categories,
    promotions,
    products,
    loading,
    isOffline,
    scNotification,
    scProducts,
    userLocation,
    featuredProducts,
    bestSelling,
    bestDeals,
    fetchData,
  };
}
