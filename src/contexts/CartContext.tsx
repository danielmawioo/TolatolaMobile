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
  shop_latitude?: number;
  shop_longitude?: number;
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

  // Load cart from Storage (client-side only for now as backend cart is a placeholder)
  const loadCart = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true }));
    try {
      const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
      const items = raw ? JSON.parse(raw) : [];
      setState({ items, isLoading: false });
    } catch (error) {
      console.error('Failed to load cart:', error);
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const saveLocalCart = async (items: CartItem[]) => {
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  };

  const addItem = useCallback(async (product: any, quantity = 1) => {
    try {
      // Optional: still acknowledge to backend if needed, but don't block or reload from it
      if (isAuthenticated && session?.access_token) {
        apiPost('/cart/items', { product_id: product.id, quantity }, session.access_token).catch(() => {});
      }
      
      setState(prev => {
        const existingIndex = prev.items.findIndex(i => i.product_id === product.id);
        let newItems;
        if (existingIndex > -1) {
          newItems = [...prev.items];
          newItems[existingIndex].quantity += quantity;
        } else {
          const imgUrl = (product.images && Array.isArray(product.images) && product.images.length > 0) 
            ? product.images[0] 
            : product.image_url;
            
          const newItem: CartItem = {
            id: Date.now().toString(),
            product_id: product.id,
            name: product.name,
            price: product.price || 0,
            quantity,
            image_url: imgUrl,
            shop_id: product.shop_id,
            shop_latitude: product.shops?.latitude ?? product.shop_latitude,
            shop_longitude: product.shops?.longitude ?? product.shop_longitude,
          };
          newItems = [...prev.items, newItem];
        }
        saveLocalCart(newItems);
        return { ...prev, items: newItems };
      });
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  }, [isAuthenticated, session?.access_token]);

  const removeItem = useCallback(async (itemId: string) => {
    try {
      setState(prev => {
        const newItems = prev.items.filter(i => i.id !== itemId);
        saveLocalCart(newItems);
        return { ...prev, items: newItems };
      });
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  }, []);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity < 1) return removeItem(itemId);
    try {
      setState(prev => {
        const newItems = prev.items.map(i => i.id === itemId ? { ...i, quantity } : i);
        saveLocalCart(newItems);
        return { ...prev, items: newItems };
      });
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  }, [removeItem]);

  const clearCart = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(CART_STORAGE_KEY);
      setState(prev => ({ ...prev, items: [] }));
    } catch (error) {
      console.error('Failed to clear cart:', error);
    }
  }, []);

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
