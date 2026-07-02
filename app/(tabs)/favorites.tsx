import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';
import { COPY } from '@/constants/copy';
import { EmptyState } from '@/components/EmptyState';
import { ProductCard } from '@/components/ProductCard';
import { useAuth } from '@/src/contexts/AuthContext';
import { useCart } from '@/src/contexts/CartContext';
import { apiGet, apiDelete } from '@/src/services/api';
import type { Product } from '@/src/types';

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, session } = useAuth();
  const { items: cartItems, addItem } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = useCallback(async (showLoading = true) => {
    if (!isAuthenticated || !session?.access_token) {
      setProducts([]);
      return;
    }
    if (showLoading) setLoading(true);
    try {
      const res = await apiGet<{ data: Array<{ products: Product }> }>('/profile/favorites', session.access_token);
      // Filter out any null/undefined products safely
      const items = (res?.data || [])
        .map(item => item.products)
        .filter(p => !!p);
      setProducts(items);
    } catch (err) {
      console.error('[FAVORITES] Error fetching favorites:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, session?.access_token]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites(true);
    } else {
      setProducts([]);
    }
  }, [isAuthenticated, fetchFavorites]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFavorites(false);
    setRefreshing(false);
  }, [fetchFavorites]);

  const handleToggleLike = async (productId: string) => {
    if (!session?.access_token) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Optimistically remove from list
    setProducts(prev => prev.filter(p => p.id !== productId));
    
    try {
      await apiDelete(`/products/${productId}/like`, session.access_token);
    } catch (err) {
      console.error('[FAVORITES] Error unliking product:', err);
      // Re-fetch on error to restore the list
      fetchFavorites(false);
    }
  };

  const renderProduct = ({ item: p }: { item: Product }) => (
    <View style={styles.productCardWrapper}>
      <ProductCard
        product={p}
        style={{ width: '100%', marginRight: 0 }}
        isLiked={true}
        isInCart={cartItems.some(i => i.product_id === p.id)}
        onAddToCart={addItem}
        onToggleLike={handleToggleLike}
      />
    </View>
  );

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20, paddingHorizontal: 20, justifyContent: 'center' }]}>
        <View style={styles.unauthCard}>
          <View style={styles.unauthIconContainer}>
            <FontAwesome name="heart" size={32} color={Theme.primary} />
          </View>
          <Text style={styles.unauthTitle}>Curate Your Favorites</Text>
          <Text style={styles.unauthDescription}>
            Sign in to synchronize your curated collection of premium products across all your devices.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.loginBtn, pressed && { opacity: 0.9 }]}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginBtnText}>Log In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Wishlist</Text>
        <Text style={styles.subtitle}>
          {products.length} {products.length === 1 ? 'item' : 'items'} saved
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 100 + insets.bottom },
          ]}
          renderItem={renderProduct}
          ListEmptyComponent={
            <EmptyState
              icon="heart-o"
              title={COPY.empty.wishlistTitle}
              message={COPY.empty.wishlistMessage}
              actionLabel={COPY.empty.wishlistAction}
              onAction={() => router.push('/(tabs)/shop')}
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
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  // Unauthenticated Styling
  unauthCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  unauthIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Theme.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  unauthTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  unauthDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  loginBtn: {
    width: '100%',
    backgroundColor: Theme.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
