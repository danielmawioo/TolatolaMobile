import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { gap, sectionGap, scaleByWidth } from '@/constants/layout';
import { OptimizedImage } from '@/components/OptimizedImage';
import { Skeleton } from '@/components/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiGet } from '@/src/services/api';

const QUICK_ACCESS = [
  { id: 'fmcg', label: 'FMCG', sub: '', icon: 'shopping-basket' },
  { id: 'agriculture', label: 'Agriculture', sub: '', icon: 'leaf' },
  { id: 'construction', label: 'Construction', sub: '& Hardware', icon: 'wrench' },
  { id: 'food', label: 'Food', sub: '& Beverages', icon: 'cutlery' },
];

const BANNER_SLIDES = 3;
const CAROUSEL_AUTO_INTERVAL_MS = 4000;

export default function HomeScreen() {
  const [search, setSearch] = useState('');
  const [countdown, setCountdown] = useState({ h: 0, m: 27, s: 17 });
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const carouselRef = useRef<ScrollView>(null);
  const bannerWidthRef = useRef(0);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const bannerWidth = width;
  bannerWidthRef.current = bannerWidth;
  const productCardWidth = width * 0.38;

  const fetchData = async () => {
    try {
      const [prodRes, bannerRes] = await Promise.all([
        apiGet<any>('/products'),
        apiGet<any>('/banners').catch(() => []), 
      ]);
      
      const receivedProducts = Array.isArray(prodRes) ? prodRes : (prodRes?.products || []);
      setProducts(receivedProducts);
      
      const receivedBanners = Array.isArray(bannerRes) ? bannerRes : (bannerRes?.banners || []);
      setBanners(receivedBanners);
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((c) => {
        let { h, m, s } = c;
        if (s > 0) return { ...c, s: s - 1 };
        if (m > 0) return { h, m: m - 1, s: 59 };
        if (h > 0) return { h: h - 1, m: 59, s: 59 };
        return c;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(() => {
      setCarouselIndex((prev) => {
        const next = (prev + 1) % banners.length;
        const w = bannerWidthRef.current;
        carouselRef.current?.scrollTo({ x: next * w, animated: true });
        return next;
      });
    }, CAROUSEL_AUTO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [banners.length]);

  const onBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const w = bannerWidthRef.current;
    if (w <= 0 || banners.length === 0) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / w);
    if (i >= 0 && i < banners.length) setCarouselIndex(i);
  };

  const handleCategoryPress = (categoryId: string) => {
    router.push({
      pathname: '/(guest)/shop',
      params: { categoryId }
    });
  };

  const renderRefreshControl = () => (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={renderRefreshControl()}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + scaleByWidth(8),
          paddingBottom: 100 + insets.bottom,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Search */}
      <View style={styles.searchWrap}>
        <FontAwesome name="search" size={18} color={Theme.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search on TOLA"
          placeholderTextColor={Theme.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Promo carousel */}
      {banners.length > 0 ? (
        <View>
          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onBannerScroll}
            scrollEventThrottle={32}
            style={styles.carousel}
            contentContainerStyle={styles.carouselContent}
            decelerationRate="fast"
          >
            {banners.map((banner, index) => (
              <View key={banner.id || index} style={[styles.banner, { width: bannerWidth }]}>
                <View style={styles.bannerInner}>
                  <Text style={styles.bannerTitle}>{banner.title || 'Special Offer'}</Text>
                  <Text style={styles.bannerProduct}>{banner.description || 'TOLA Fresh — Best prices'}</Text>
                  {banner.price && <Text style={styles.bannerPrice}>TSh {banner.price.toLocaleString()}</Text>}
                </View>
                {banner.image_url ? (
                  <OptimizedImage source={banner.image_url} width={scaleByWidth(120)} aspectRatio={1} />
                ) : (
                  <View style={styles.bannerPlaceholder} />
                )}
              </View>
            ))}
          </ScrollView>
          <View style={styles.dots}>
            {banners.map((_, i) => (
              <View key={i} style={[styles.dot, i === carouselIndex && styles.dotActive]} />
            ))}
          </View>
        </View>
      ) : (
        <View style={[styles.banner, { width: bannerWidth, marginBottom: sectionGap }]}>
           <View style={styles.bannerInner}>
            <Text style={styles.bannerTitle}>Welcome to TOLA</Text>
            <Text style={styles.bannerProduct}>Connecting buyers & transporters</Text>
          </View>
          <View style={styles.bannerPlaceholder} />
        </View>
      )}

      {/* Quick access / Categories */}
      <View style={styles.quickRow}>
        {QUICK_ACCESS.map((q) => (
          <Pressable key={q.id} style={styles.quickCard} onPress={() => handleCategoryPress(q.id)}>
            <View style={styles.quickIconWrap}>
              <FontAwesome name={q.icon as any} size={24} color={Theme.primary} />
            </View>
            <Text style={styles.quickLabel}>{q.label}</Text>
            {q.sub ? <Text style={styles.quickSub}>{q.sub}</Text> : null}
          </Pressable>
        ))}
      </View>

      {/* Flash Sales / Featured Products */}
      <View style={styles.flashHeader}>
        <FontAwesome name="bolt" size={18} color="#fff" />
        <Text style={styles.flashTitle}>FEATURED PRODUCTS</Text>
        <Pressable style={styles.seeAll} onPress={() => router.push('/(guest)/shop')}>
          <Text style={styles.seeAllText}>SEE ALL</Text>
        </Pressable>
      </View>

      {loading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flashScroll}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.productCard, { width: productCardWidth }]}>
              <Skeleton width="100%" height={productCardWidth - 32} borderRadius={8} style={{ marginBottom: 12 }} />
              <Skeleton width="80%" height={16} style={{ marginBottom: 8 }} />
              <Skeleton width="40%" height={20} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={products.slice(0, 10)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.flashScroll}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item: p }) => (
            <Pressable
              style={[styles.productCard, { width: productCardWidth }]}
              onPress={() => router.push(`/(guest)/product/${p.id}`)}
            >
              <View style={styles.productImage}>
                {p.discount > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>-{p.discount}%</Text>
                  </View>
                )}
                <OptimizedImage source={p.image_url} width="100%" aspectRatio={1} />
              </View>
              <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>
              <Text style={styles.productPrice}>TSh {p.price?.toLocaleString() || '—'}</Text>
              {p.stock != null ? (
                <View style={styles.stockBarWrap}>
                  <View style={[styles.stockBarFill, { width: `${Math.min(100, (p.stock / 50) * 100)}%` }]} />
                  <Text style={styles.stockBarText}>{p.stock} items left</Text>
                </View>
              ) : (
                <Text style={styles.stockBarText}>In Stock</Text>
              )}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No products found.</Text>}
        />
      )}

      {/* More products grid */}
      <Text style={styles.sectionTitle}>Popular products</Text>
      <View style={styles.productGrid}>
        {loading ? (
          [1, 2, 4, 5].map((i) => (
            <View key={i} style={[styles.gridCard, { width: (width - 20 * 2 - 12) / 2 }]}>
              <Skeleton width="100%" height={(width - 20 * 2 - 12) / 2 - 32} borderRadius={8} style={{ marginBottom: 12 }} />
              <Skeleton width="80%" height={14} style={{ marginBottom: 8 }} />
              <Skeleton width="50%" height={18} />
            </View>
          ))
        ) : (
          products.slice(0, 8).map((p) => (
            <Pressable
              key={p.id}
              style={[styles.gridCard, { width: (width - gap.md * 2 - gap.md) / 2 }]}
              onPress={() => router.push(`/(guest)/product/${p.id}`)}
            >
              <View style={styles.gridCardImage}>
                {p.discount > 0 && (
                  <View style={styles.discountBadgeSmall}>
                    <Text style={styles.discountTextSmall}>-{p.discount}%</Text>
                  </View>
                )}
                <OptimizedImage source={p.image_url} width="100%" aspectRatio={1} />
              </View>
              <Text style={styles.gridCardName} numberOfLines={2}>{p.name}</Text>
              <Text style={styles.gridCardPrice}>TSh {p.price?.toLocaleString() || '—'}</Text>
            </Pressable>
          ))
        )}
        {!loading && products.length === 0 && (
          <Text style={styles.emptyText}>No products available.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  content: { paddingBottom: 100 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.background,
    marginTop: scaleByWidth(12),
    marginBottom: gap.lg,
    paddingHorizontal: scaleByWidth(14),
    paddingVertical: scaleByWidth(12),
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  searchIcon: { marginRight: gap.sm },
  searchInput: { flex: 1, fontSize: scaleByWidth(16), color: Theme.text, padding: 0 },
  carousel: { marginBottom: gap.xs },
  carouselContent: { gap: 0 },
  banner: {
    marginRight: gap.md,
    borderRadius: scaleByWidth(12),
    overflow: 'hidden',
    backgroundColor: Theme.primary,
    minHeight: scaleByWidth(160),
    flexDirection: 'row',
  },
  bannerInner: { flex: 1, padding: gap.lg, justifyContent: 'center' },
  bannerTitle: { fontSize: scaleByWidth(18), fontWeight: '700', color: '#fff', marginBottom: 4 },
  bannerProduct: { fontSize: scaleByWidth(14), color: 'rgba(255,255,255,0.9)', marginBottom: 8 },
  bannerPrice: { fontSize: scaleByWidth(20), fontWeight: '700', color: '#fff' },
  bannerOldPrice: { fontSize: scaleByWidth(14), color: 'rgba(255,255,255,0.8)', textDecorationLine: 'line-through' },
  bannerPlaceholder: { width: scaleByWidth(120), backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, margin: gap.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: scaleByWidth(6), marginBottom: sectionGap, marginTop: 8 },
  dot: { width: scaleByWidth(8), height: scaleByWidth(8), borderRadius: scaleByWidth(4), backgroundColor: Theme.inputBorder },
  dotActive: { width: scaleByWidth(20), backgroundColor: Theme.primary },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: sectionGap,
    paddingHorizontal: gap.md,
  },
  quickCard: { alignItems: 'center', flex: 1 },
  quickIconWrap: {
    width: scaleByWidth(56),
    height: scaleByWidth(56),
    borderRadius: scaleByWidth(28),
    backgroundColor: Theme.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: gap.xs,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  quickLabel: { fontSize: scaleByWidth(12), fontWeight: '600', color: Theme.text },
  quickSub: { fontSize: scaleByWidth(10), color: Theme.primary, marginTop: 2 },
  flashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.primary,
    paddingVertical: scaleByWidth(12),
    paddingHorizontal: gap.lg,
    marginBottom: gap.md,
    gap: gap.xs,
  },
  flashTitle: { fontSize: scaleByWidth(14), fontWeight: '700', color: '#fff', flex: 1 },
  flashTimer: { fontSize: scaleByWidth(12), color: 'rgba(255,255,255,0.95)' },
  seeAll: { paddingVertical: 4, paddingHorizontal: 8 },
  seeAllText: { fontSize: scaleByWidth(12), fontWeight: '700', color: '#fff' },
  flashScrollView: { marginBottom: sectionGap },
  flashScroll: { gap: gap.md, paddingHorizontal: gap.md },
  productCard: {
    backgroundColor: Theme.background,
    borderRadius: scaleByWidth(12),
    padding: gap.md,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  productImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: gap.sm,
    position: 'relative',
  },
  soldBadge: {
    position: 'absolute',
    top: gap.xs,
    left: gap.xs,
    backgroundColor: Theme.soldBadge,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    zIndex: 1,
  },
  soldBadgeText: { color: '#fff', fontSize: scaleByWidth(11), fontWeight: '600' },
  discountBadge: {
    position: 'absolute',
    top: gap.xs,
    right: gap.xs,
    backgroundColor: Theme.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    zIndex: 1,
  },
  discountText: { color: '#fff', fontSize: scaleByWidth(12), fontWeight: '700' },
  productName: { fontSize: scaleByWidth(13), color: Theme.text, marginBottom: 4 },
  productPrice: { fontSize: scaleByWidth(15), fontWeight: '700', color: Theme.text },
  productOldPrice: { fontSize: scaleByWidth(12), color: Theme.textMuted, textDecorationLine: 'line-through', marginBottom: 6 },
  stockBarWrap: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.inputBorder,
    overflow: 'hidden',
    marginTop: 4,
  },
  stockBarFill: { height: '100%', backgroundColor: Theme.primary, borderRadius: 3 },
  stockBarText: { fontSize: scaleByWidth(10), color: Theme.textMuted, marginTop: 4 },
  sectionTitle: { fontSize: scaleByWidth(18), fontWeight: '700', color: Theme.text, marginBottom: gap.md, paddingHorizontal: gap.md },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: gap.md, paddingHorizontal: gap.md },
  gridCard: {
    backgroundColor: Theme.background,
    borderRadius: scaleByWidth(12),
    padding: gap.md,
    marginBottom: gap.md,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  gridCardImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: gap.sm,
    position: 'relative',
  },
  soldBadgeSmall: {
    position: 'absolute',
    top: gap.xs,
    left: gap.xs,
    backgroundColor: Theme.soldBadge,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
    zIndex: 1,
  },
  soldBadgeTextSmall: { color: '#fff', fontSize: scaleByWidth(10), fontWeight: '600' },
  discountBadgeSmall: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: Theme.primary,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    zIndex: 1,
  },
  discountTextSmall: { color: '#fff', fontSize: scaleByWidth(10), fontWeight: '700' },
  gridCardName: { fontSize: scaleByWidth(13), color: Theme.text, marginBottom: 4 },
  gridCardPrice: { fontSize: scaleByWidth(14), fontWeight: '700', color: Theme.primary },
  emptyText: { color: Theme.textMuted, textAlign: 'center', width: '100%', marginVertical: 20 },
});
