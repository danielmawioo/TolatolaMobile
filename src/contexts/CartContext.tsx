import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { apiGet, apiPost, apiDelete } from '@/src/services/api';

const CART_STORAGE_KEY = '@tolatola/cart';

export type CartItem = {
  id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  shop_id?: string;
};

type CartState = {
  items: CartItem[];
  isLoading: boolean;
};

type CartContextValue = CartState & {
  addItem: (product: any, quantity?: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  totalAmount: number;
  itemCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { session, isAuthenticated } = useAuth();
  const [state, setState] = useState<CartState>({
    items: [],
    isLoading: true,
  });

  // Load cart from Storage (for guests) or API (for users)
  const loadCart = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true }));
    try {
      if (isAuthenticated && session?.access_token) {
        // Sync with API
        const data = await apiGet<{ items: CartItem[] }>('/cart', session.access_token);
        setState({ items: data.items || [], isLoading: false });
      } else {
        // Load from local storage
        const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
        const items = raw ? JSON.parse(raw) : [];
        setState({ items, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
      setState(s => ({ ...s, isLoading: false }));
    }
  }, [isAuthenticated, session?.access_token]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const saveLocalCart = async (items: CartItem[]) => {
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  };

  const addItem = useCallback(async (product: any, quantity = 1) => {
    try {
      if (isAuthenticated && session?.access_token) {
        await apiPost('/cart/items', { product_id: product.id, quantity }, session.access_token);
        await loadCart();
      } else {
        setState(prev => {
          const existingIndex = prev.items.findIndex(i => i.product_id === product.id);
          let newItems;
          if (existingIndex > -1) {
            newItems = [...prev.items];
            newItems[existingIndex].quantity += quantity;
          } else {
            const newItem: CartItem = {
              id: Date.now().toString(), // local fallback ID
              product_id: product.id,
              name: product.name,
              price: product.price || 0,
              quantity,
              image_url: product.image_url,
              shop_id: product.shop_id,
            };
            newItems = [...prev.items, newItem];
          }
          saveLocalCart(newItems);
          return { ...prev, items: newItems };
        });
      }
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  }, [isAuthenticated, session?.access_token, loadCart]);

  const removeItem = useCallback(async (itemId: string) => {
    try {
      if (isAuthenticated && session?.access_token) {
        await apiDelete(`/cart/items/${itemId}`, session.access_token);
        await loadCart();
      } else {
        setState(prev => {
          const newItems = prev.items.filter(i => i.id !== itemId);
          saveLocalCart(newItems);
          return { ...prev, items: newItems };
        });
      }
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  }, [isAuthenticated, session?.access_token, loadCart]);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity < 1) return removeItem(itemId);
    try {
      if (isAuthenticated && session?.access_token) {
        await apiPost(`/cart/items/${itemId}/quantity`, { quantity }, session.access_token);
        await loadCart();
      } else {
        setState(prev => {
          const newItems = prev.items.map(i => i.id === itemId ? { ...i, quantity } : i);
          saveLocalCart(newItems);
          return { ...prev, items: newItems };
        });
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  }, [isAuthenticated, session?.access_token, loadCart, removeItem]);

  const clearCart = useCallback(async () => {
    try {
      if (isAuthenticated && session?.access_token) {
        await apiDelete('/cart', session.access_token);
        await loadCart();
      } else {
        await AsyncStorage.removeItem(CART_STORAGE_KEY);
        setState(prev => ({ ...prev, items: [] }));
      }
    } catch (error) {
      console.error('Failed to clear cart:', error);
    }
  }, [isAuthenticated, session?.access_token, loadCart]);

  const totalAmount = useMemo(() => {
    return state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [state.items]);

  const itemCount = useMemo(() => {
    return state.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [state.items]);

  const value = useMemo(() => ({
    ...state,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalAmount,
    itemCount,
  }), [state, addItem, removeItem, updateQuantity, clearCart, totalAmount, itemCount]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
