import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

  // Mirrors `items` synchronously so mutation handlers can compute the next
  // array without depending on when React actually re-renders after
  // setState — the functional setState updater form runs asynchronously
  // relative to the code calling setItems, so persisting a value captured
  // from that updater's closure would race and persist stale data.
  const itemsRef = useRef<WishlistEntry[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) {
            const loaded = parsed.filter(
              (row): row is WishlistEntry =>
                row != null &&
                typeof row === 'object' &&
                typeof (row as WishlistEntry).productId === 'string'
            );
            itemsRef.current = loaded;
            setItems(loaded);
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
      const prev = itemsRef.current;
      const exists = prev.some((i) => i.productId === pid);
      const next = exists
        ? prev.filter((i) => i.productId !== pid)
        : [...prev, productToEntry(product)];
      itemsRef.current = next;
      setItems(next);
      await persist(next);
    },
    [persist]
  );

  const removeFromWishlist = useCallback(
    async (productId: string) => {
      const pid = String(productId);
      const next = itemsRef.current.filter((i) => i.productId !== pid);
      itemsRef.current = next;
      setItems(next);
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
