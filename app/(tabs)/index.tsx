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
import type { Product, Banner } from '@/src/types';
import { COPY } from '@/constants/copy';

// tolatola.co: Shop by Category
const SHOP_BY_CATEGORY = [
  { id: 'fmcg', label: 'FMCG', icon: 'shopping-basket' as const, color: Theme.categoryFresh },
  { id: 'agriculture', label: 'Agriculture', icon: 'leaf' as const, color: Theme.categoryFresh },
  { id: 'construction', label: 'Construction & Hardware', icon: 'wrench' as const, color: Theme.categoryShipping },
  { id: 'vehicles', label: 'Vehicles', icon: 'car' as const, color: Theme.categoryServices },
  { id: 'electronics', label: 'Electronics', icon: 'laptop' as const, color: Theme.categoryElectronics },
  { id: 'food', label: 'Food & Beverages', icon: 'cutlery' as const, color: Theme.categoryShipping },
  { id: 'handicrafts', label: 'Handicrafts', icon: 'hand-spock-o' as const, color: Theme.categoryHandmade },
  { id: 'health', label: 'Health & Beauty', icon: 'heart' as const, color: Theme.categoryHealth },
  { id: 'home', label: 'Home & Garden', icon: 'home' as const, color: Theme.categoryFresh },
  { id: 'services', label: 'Services', icon: 'cogs' as const, color: Theme.categoryServices },
  { id: 'textiles', label: 'Textiles', icon: 'th-large' as const, color: Theme.categoryHandmade },
];

const BANNER_SLIDES = 3;
const CAROUSEL_AUTO_INTERVAL_MS = 4000;

export default function HomeScreen() {
  const [search, setSearch] = useState('');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carouselRef = useRef<ScrollView>(null);
  const bannerWidthRef = useRef(0);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const bannerWidth = width;
  bannerWidthRef.current = bannerWidth;
  const productCardWidth = width * 0.42;
  const categoryItemWidth = (width - gap.md * 2 - gap.sm * 3) / 4;

  const fetchData = async () => {
    try {
      const [prodRes, bannerRes] = await Promise.all([
        apiGet<{ products?: Product[] } | Product[]>('/products'),
        apiGet<{ banners?: Banner[] } | Banner[]>('/banners').catch(() => []),
      ]);

      const receivedProducts = (prodRes as { products?: Product[] })?.products ?? (Array.isArray(prodRes) ? prodRes : []);
      setProducts(receivedProducts);

      const receivedBanners = (bannerRes as { banners?: Banner[] })?.banners ?? (Array.isArray(bannerRes) ? bannerRes : []);
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
      params: { categoryId },
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
          paddingTop: insets.top + scaleByWidth(12),
          paddingBottom: 100 + insets.bottom,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* App header — tolatola.co branding */}
      <View style={styles.appHeader}>
        <Text style={styles.logo}>TOLA Tanzania</Text>
        <Text style={styles.tagline}>{COPY.tagline}</Text>
      </View>

      {/* Search — Jumia-style rounded bar */}
      <Pressable
        style={styles.searchWrap}
        onPress={() => router.push('/(guest)/shop')}
      >
        <FontAwesome name="search" size={18} color={Theme.textMuted} style={styles.searchIcon} />
        <Text style={styles.searchPlaceholder}>Search products, categories…</Text>
      </Pressable>

      {/* Hero carousel */}
      {banners.length > 0 ? (
        <View style={styles.carouselSection}>
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
              <View key={banner.id || index} style={[styles.bannerSlide, { width: bannerWidth }]}>
              <View style={[styles.banner, Theme.shadowMd]}>
                <View style={styles.bannerInner}>
                  <Text style={styles.bannerLabel}>Special Offer</Text>
                  <Text style={styles.bannerTitle}>{banner.title || 'TOLA Digital Trade'}</Text>
                  <Text style={styles.bannerSub}>{banner.description || 'Trade Smarter. Move Faster.'}</Text>
                  {banner.price != null && (
                    <Text style={styles.bannerPrice}>TSh {Number(banner.price).toLocaleString()}</Text>
                  )}
                </View>
                {banner.image_url ? (
                  <OptimizedImage source={banner.image_url} width={scaleByWidth(100)} aspectRatio={1} />
                ) : (
                  <View style={styles.bannerPlaceholder} />
                )}
              </View>
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
        <View style={[styles.banner, styles.bannerFallback, Theme.shadowMd]}>
          <View style={styles.bannerInner}>
            <Text style={styles.bannerLabel}>Welcome</Text>
            <Text style={styles.bannerTitle}>TOLA Pay</Text>
            <Text style={styles.bannerSub}>Turn Products into Deals. Deals into Deliveries.</Text>
          </View>
          <View style={styles.bannerPlaceholder} />
        </View>
      )}

      {/* Shop by Category — tolatola.co */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Shop by Category</Text>
          <Pressable onPress={() => router.push('/(guest)/shop')} hitSlop={12}>
            <Text style={styles.seeAll}>View catalog</Text>
          </Pressable>
        </View>
        <View style={styles.categoryGrid}>
          {SHOP_BY_CATEGORY.map((cat) => (
            <Pressable
              key={cat.id}
              style={({ pressed }) => [
                styles.categoryItem,
                { width: categoryItemWidth, backgroundColor: cat.color },
                pressed && styles.categoryItemPressed,
              ]}
              onPress={() => handleCategoryPress(cat.id)}
            >
              <View style={styles.categoryIconWrap}>
                <FontAwesome name={cat.icon} size={22} color={Theme.primary} />
              </View>
              <Text style={styles.categoryLabel} numberOfLines={2}>{cat.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Trust strip — tolatola.co: Verified Vendors. Guaranteed Quality. */}
      <View style={[styles.trustStrip, Theme.shadowSm]}>
        <View style={styles.trustItem}>
          <FontAwesome name="lock" size={20} color={Theme.primary} />
          <Text style={styles.trustText}>Secure Payments</Text>
        </View>
        <View style={styles.trustDivider} />
        <View style={styles.trustItem}>
          <FontAwesome name="check-circle" size={20} color={Theme.verified} />
          <Text style={styles.trustText}>Verified Vendors</Text>
        </View>
        <View style={styles.trustDivider} />
        <View style={styles.trustItem}>
          <FontAwesome name="truck" size={20} color={Theme.primary} />
          <Text style={styles.trustText}>Pan-Tanzania</Text>
        </View>
      </View>

      {/* Featured / Selections for you */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Selections for you</Text>
          <Pressable onPress={() => router.push('/(guest)/shop')} hitSlop={12}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        {loading ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={[styles.productCard, { width: productCardWidth }]}>
                <Skeleton width="100%" height={productCardWidth - 24} borderRadius={Theme.radiusMd} style={{ marginBottom: 10 }} />
                <Skeleton width="80%" height={14} style={{ marginBottom: 6 }} />
                <Skeleton width="50%" height={18} />
              </View>
            ))}
          </ScrollView>
        ) : (
          <FlatList
            data={products.slice(0, 10)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            keyExtractor={(item) => item.id?.toString() ?? String(Math.random())}
            renderItem={({ item: p }) => (
              <Pressable
                style={[styles.productCard, { width: productCardWidth }]}
                onPress={() => router.push(`/(guest)/product/${p.id}`)}
              >
                <View style={styles.productImageWrap}>
                  {p.discount > 0 && (
                    <View style={styles.badgeHot}>
                      <Text style={styles.badgeHotText}>-{p.discount}%</Text>
                    </View>
                  )}
                  <View style={styles.verifiedBadge}>
                    <FontAwesome name="check-circle" size={10} color={Theme.verified} />
                    <Text style={styles.verifiedText}>TOLA</Text>
                  </View>
                  <OptimizedImage source={p.image_url} width="100%" aspectRatio={1} />
                </View>
                <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>
                <Text style={styles.productPrice}>TSh {(p.price ?? 0).toLocaleString()}</Text>
                {p.stock != null && p.stock < 50 && (
                  <Text style={styles.stockHint}>{p.stock} left</Text>
                )}
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No products yet.</Text>}
          />
        )}
      </View>

      {/* Popular products grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular products</Text>
        <View style={styles.productGrid}>
          {loading ? (
            [1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.gridCard, { width: (width - gap.md * 2 - gap.sm) / 2 }]}>
                <Skeleton width="100%" height={(width - gap.md * 2 - gap.sm) / 2 - 20} borderRadius={Theme.radiusMd} style={{ marginBottom: 10 }} />
                <Skeleton width="85%" height={14} style={{ marginBottom: 6 }} />
                <Skeleton width="45%" height={16} />
              </View>
            ))
          ) : (
            products.slice(0, 8).map((p) => (
              <Pressable
                key={p.id}
                style={[styles.gridCard, { width: (width - gap.md * 2 - gap.sm) / 2 }]}
                onPress={() => router.push(`/(guest)/product/${p.id}`)}
              >
                <View style={styles.gridCardImage}>
                  {p.discount > 0 && (
                    <View style={styles.badgeHotSmall}>
                      <Text style={styles.badgeHotTextSmall}>-{p.discount}%</Text>
                    </View>
                  )}
                  <OptimizedImage source={p.image_url} width="100%" aspectRatio={1} />
                </View>
                <View style={styles.verifiedBadgeSmall}>
                  <FontAwesome name="check-circle" size={9} color={Theme.verified} />
                  <Text style={styles.verifiedTextSmall}>Verified</Text>
                </View>
                <Text style={styles.gridCardName} numberOfLines={2}>{p.name}</Text>
                <Text style={styles.gridCardPrice}>TSh {(p.price ?? 0).toLocaleString()}</Text>
              </Pressable>
            ))
          )}
        </View>
        {!loading && products.length === 0 && (
          <Text style={styles.emptyText}>No products available.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  content: { paddingHorizontal: gap.md },
  appHeader: { marginBottom: gap.lg },
  logo: { fontSize: scaleByWidth(22), fontWeight: '800', color: Theme.text, letterSpacing: 0.5 },
  tagline: { fontSize: scaleByWidth(13), color: Theme.textSecondary, marginTop: 2, lineHeight: 18 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.background,
    paddingHorizontal: gap.lg,
    paddingVertical: scaleByWidth(14),
    borderRadius: Theme.radiusLg,
    marginBottom: gap.lg,
    ...Theme.shadowSm,
  },
  searchIcon: { marginRight: gap.sm },
  searchPlaceholder: { flex: 1, fontSize: scaleByWidth(15), color: Theme.textMuted },
  carouselSection: { marginBottom: gap.sm },
  carousel: { marginBottom: gap.xs },
  carouselContent: { gap: 0 },
  bannerSlide: { paddingHorizontal: gap.md },
  banner: {
    flex: 1,
    borderRadius: Theme.radiusLg,
    overflow: 'hidden',
    backgroundColor: Theme.primary,
    minHeight: scaleByWidth(140),
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerFallback: { marginHorizontal: gap.md, marginBottom: sectionGap },
  bannerInner: { flex: 1, padding: gap.lg, justifyContent: 'center' },
  bannerLabel: { fontSize: scaleByWidth(11), fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: 2, letterSpacing: 0.5 },
  bannerTitle: { fontSize: scaleByWidth(18), fontWeight: '700', color: '#fff', marginBottom: 4 },
  bannerSub: { fontSize: scaleByWidth(13), color: 'rgba(255,255,255,0.9)', marginBottom: 6 },
  bannerPrice: { fontSize: scaleByWidth(18), fontWeight: '800', color: '#fff' },
  bannerPlaceholder: { width: scaleByWidth(100), height: scaleByWidth(100), backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Theme.radiusMd, margin: gap.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: sectionGap, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Theme.inputBorder },
  dotActive: { width: 18, backgroundColor: Theme.primary },
  section: { marginBottom: sectionGap },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: gap.sm },
  sectionTitle: { fontSize: scaleByWidth(18), fontWeight: '700', color: Theme.text },
  seeAll: { fontSize: scaleByWidth(14), fontWeight: '600', color: Theme.primary },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: gap.sm },
  categoryItem: {
    borderRadius: Theme.radiusMd,
    padding: gap.sm,
    alignItems: 'center',
    minHeight: scaleByWidth(72),
  },
  categoryItemPressed: { opacity: 0.85 },
  categoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  categoryLabel: { fontSize: scaleByWidth(10), fontWeight: '600', color: Theme.text, textAlign: 'center' },
  trustStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Theme.background,
    borderRadius: Theme.radiusMd,
    paddingVertical: gap.md,
    paddingHorizontal: gap.sm,
    marginBottom: sectionGap,
  },
  trustItem: { alignItems: 'center', flex: 1 },
  trustText: { fontSize: scaleByWidth(11), fontWeight: '600', color: Theme.textSecondary, marginTop: 4 },
  trustDivider: { width: 1, height: 24, backgroundColor: Theme.inputBorder },
  horizontalList: { gap: gap.md, paddingRight: gap.md },
  productCard: {
    backgroundColor: Theme.background,
    borderRadius: Theme.radiusLg,
    padding: gap.sm,
    ...Theme.shadowMd,
  },
  productImageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Theme.radiusMd,
    overflow: 'hidden',
    marginBottom: gap.sm,
    position: 'relative',
    backgroundColor: Theme.backgroundTertiary,
  },
  badgeHot: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: Theme.accent,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    zIndex: 1,
  },
  badgeHotText: { color: '#fff', fontSize: scaleByWidth(11), fontWeight: '700' },
  verifiedBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    gap: 4,
    zIndex: 1,
  },
  verifiedText: { fontSize: scaleByWidth(9), fontWeight: '700', color: Theme.verified },
  productName: { fontSize: scaleByWidth(13), color: Theme.text, marginBottom: 4, fontWeight: '500' },
  productPrice: { fontSize: scaleByWidth(15), fontWeight: '700', color: Theme.text },
  stockHint: { fontSize: scaleByWidth(10), color: Theme.textMuted },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: gap.sm },
  gridCard: {
    backgroundColor: Theme.background,
    borderRadius: Theme.radiusLg,
    padding: gap.sm,
    marginBottom: gap.sm,
    ...Theme.shadowMd,
  },
  gridCardImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Theme.radiusMd,
    overflow: 'hidden',
    marginBottom: gap.xs,
    position: 'relative',
    backgroundColor: Theme.backgroundTertiary,
  },
  badgeHotSmall: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: Theme.accent,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 4,
    zIndex: 1,
  },
  badgeHotTextSmall: { color: '#fff', fontSize: scaleByWidth(9), fontWeight: '700' },
  verifiedBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  verifiedTextSmall: { fontSize: scaleByWidth(10), fontWeight: '600', color: Theme.verified },
  gridCardName: { fontSize: scaleByWidth(13), color: Theme.text, marginBottom: 4, fontWeight: '500' },
  gridCardPrice: { fontSize: scaleByWidth(14), fontWeight: '700', color: Theme.primary },
  emptyText: { color: Theme.textMuted, textAlign: 'center', width: '100%', marginVertical: 16, fontSize: 14 },
});
