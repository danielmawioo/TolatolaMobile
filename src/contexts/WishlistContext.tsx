import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getProductImageUrl } from '@/src/lib/productImage';
import { getShopIdForNavigation } from '@/src/lib/shopNavigation';
import type { Product } from '@/src/types';
import { logger } from '@/src/lib/logger';

const STORAGE_KEY = '@tolatola/wishlist_items_v1';

export type WishlistEntry = {
  productId: string;
  name: string;
  price: number;
  image_url?: string;
  shop_id?: string;
};

function productToEntry(p: Product): WishlistEntry {
  const shopId = p.shop_id ?? getShopIdForNavigation(p);
  return {
    productId: String(p.id),
    name: p.name ?? 'Product',
    price: typeof p.price === 'number' ? p.price : Number(p.price) || 0,
    image_url: getProductImageUrl(p) ?? undefined,
    shop_id: shopId,
  };
}

type WishlistContextValue = {
  items: WishlistEntry[];
  isLoading: boolean;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) {
            setItems(
              parsed.filter(
                (row): row is WishlistEntry =>
                  row != null &&
                  typeof row === 'object' &&
                  typeof (row as WishlistEntry).productId === 'string'
              )
            );
          }
        }
      } catch (e) {
        logger.warn('[Wishlist] load failed', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: WishlistEntry[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      logger.warn('[Wishlist] save failed', e);
    }
  }, []);

  const isInWishlist = useCallback(
    (productId: string) => items.some((i) => i.productId === String(productId)),
    [items]
  );

  const toggleWishlist = useCallback(
    async (product: Product) => {
      const pid = String(product.id);
      let next: WishlistEntry[] = [];
      setItems((prev) => {
        const exists = prev.some((i) => i.productId === pid);
        next = exists ? prev.filter((i) => i.productId !== pid) : [...prev, productToEntry(product)];
        return next;
      });
      await persist(next);
    },
    [persist]
  );

  const removeFromWishlist = useCallback(
    async (productId: string) => {
      const pid = String(productId);
      let next: WishlistEntry[] = [];
      setItems((prev) => {
        next = prev.filter((i) => i.productId !== pid);
        return next;
      });
      await persist(next);
    },
    [persist]
  );

  const value = useMemo(
    () => ({
      items,
      isLoading,
      isInWishlist,
      toggleWishlist,
      removeFromWishlist,
    }),
    [items, isLoading, isInWishlist, toggleWishlist, removeFromWishlist]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
