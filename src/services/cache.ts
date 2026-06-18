import AsyncStorage from '@react-native-async-storage/async-storage';

export const CACHE_KEYS = {
  CATEGORIES: 'tolatola_cache_categories',
  HOME_PRODUCTS: 'tolatola_cache_home_products',
  HOME_PROMOTIONS: 'tolatola_cache_home_promotions',
  SHOP_PRODUCTS: 'tolatola_cache_shop_products',
};

export async function setCachedData(key: string, data: any): Promise<void> {
  try {
    if (data !== undefined && data !== null) {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    }
  } catch (e) {
    console.error(`[CACHE] Error saving cache for key ${key}:`, e);
  }
}

export async function getCachedData<T = any>(key: string): Promise<T | null> {
  try {
    const val = await AsyncStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch (e) {
    console.error(`[CACHE] Error loading cache for key ${key}:`, e);
    return null;
  }
}
