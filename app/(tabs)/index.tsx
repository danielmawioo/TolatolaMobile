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
} from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { gap, sectionGap, scaleByWidth } from '@/constants/layout';
import { OptimizedImage } from '@/components/OptimizedImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const QUICK_ACCESS = [
  { id: 'fmcg', label: 'FMCG', sub: '', icon: 'shopping-basket' },
  { id: 'agriculture', label: 'Agriculture', sub: '', icon: 'leaf' },
  { id: 'construction', label: 'Construction', sub: '& Hardware', icon: 'wrench' },
  { id: 'food', label: 'Food', sub: '& Beverages', icon: 'cutlery' },
];

const MOCK_FLASH_PRODUCTS = [
  { id: '1', name: 'Bell pepper', price: 2500, originalPrice: 3000, discount: 17, stock: 24, sold: 2 },
  { id: '2', name: 'Fresh Beef Steak', price: 26000, originalPrice: 32000, discount: 19, stock: 12, sold: 84 },
  { id: '3', name: 'Fresh octopus', price: 16000, originalPrice: 20000, discount: 20, stock: 8, sold: 97 },
  { id: '4', name: 'Garlic', price: 4500, originalPrice: 5000, discount: 10, stock: 30, sold: 15 },
  { id: '5', name: 'Fresh water fish', price: 12000, originalPrice: 15000, discount: 20, stock: 18, sold: 146 },
];

const BANNER_SLIDES = 3;
const CAROUSEL_AUTO_INTERVAL_MS = 4000;

export default function HomeScreen() {
  const [search, setSearch] = useState('');
  const [countdown, setCountdown] = useState({ h: 0, m: 27, s: 17 });
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef<ScrollView>(null);
  const bannerWidthRef = useRef(0);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const bannerWidth = width;
  bannerWidthRef.current = bannerWidth;
  const productCardWidth = width * 0.38;
  const gridCardWidth = (width - gap.md) / 2;

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
    const id = setInterval(() => {
      setCarouselIndex((prev) => {
        const next = (prev + 1) % BANNER_SLIDES;
        const w = bannerWidthRef.current;
        carouselRef.current?.scrollTo({ x: next * w, animated: true });
        return next;
      });
    }, CAROUSEL_AUTO_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const onBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const w = bannerWidthRef.current;
    if (w <= 0) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / w);
    if (i >= 0 && i < BANNER_SLIDES) setCarouselIndex(i);
  };

  return (
    <ScrollView
      style={styles.container}
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
          placeholder="Search on TolaTola"
          placeholderTextColor={Theme.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Promo carousel – auto-sliding, responsive */}
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
        <View style={[styles.banner, { width: bannerWidth }]}>
          <View style={styles.bannerInner}>
            <Text style={styles.bannerTitle}>Turn down Thursday</Text>
            <Text style={styles.bannerProduct}>TolaTola Fresh — Best prices</Text>
            <Text style={styles.bannerPrice}>TSh 1,599</Text>
            <Text style={styles.bannerOldPrice}>TSh 2,546</Text>
          </View>
          <View style={styles.bannerPlaceholder} />
        </View>
        <View style={[styles.banner, { width: bannerWidth }]}>
          <View style={styles.bannerInner}>
            <Text style={styles.bannerTitle}>Weekend deals</Text>
            <Text style={styles.bannerProduct}>Handmade & local</Text>
          </View>
          <View style={styles.bannerPlaceholder} />
        </View>
        <View style={[styles.banner, { width: bannerWidth }]}>
          <View style={styles.bannerInner}>
            <Text style={styles.bannerTitle}>Track every order</Text>
            <Text style={styles.bannerProduct}>Secure marketplace</Text>
          </View>
          <View style={styles.bannerPlaceholder} />
        </View>
      </ScrollView>
      <View style={styles.dots}>
        {Array.from({ length: BANNER_SLIDES }).map((_, i) => (
          <View key={i} style={[styles.dot, i === carouselIndex && styles.dotActive]} />
        ))}
      </View>

      {/* Quick access / Categories */}
      <View style={styles.quickRow}>
        {QUICK_ACCESS.map((q) => (
          <Pressable key={q.id} style={styles.quickCard}>
            <View style={styles.quickIconWrap}>
              <FontAwesome name={q.icon as 'shopping-basket' | 'leaf' | 'wrench' | 'cutlery'} size={24} color={Theme.primary} />
            </View>
            <Text style={styles.quickLabel}>{q.label}</Text>
            {q.sub ? <Text style={styles.quickSub}>{q.sub}</Text> : null}
          </Pressable>
        ))}
      </View>

      {/* Flash Sales */}
      <View style={styles.flashHeader}>
        <FontAwesome name="bolt" size={18} color="#fff" />
        <Text style={styles.flashTitle}>FLASH SALES</Text>
        <Text style={styles.flashTimer}>
          Time Left: {String(countdown.h).padStart(2, '0')}h : {String(countdown.m).padStart(2, '0')}m : {String(countdown.s).padStart(2, '0')}s
        </Text>
        <Pressable style={styles.seeAll} onPress={() => router.push('/(guest)/shop')}>
          <Text style={styles.seeAllText}>SEE ALL</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.flashScroll}
        style={styles.flashScrollView}
      >
        {MOCK_FLASH_PRODUCTS.map((p) => (
          <Pressable
            key={p.id}
            style={[styles.productCard, { width: productCardWidth }]}
            onPress={() => router.push(`/(guest)/product/${p.id}`)}
          >
            <View style={styles.productImage}>
              {p.sold != null && (
                <View style={styles.soldBadge}>
                  <Text style={styles.soldBadgeText}>{p.sold} SOLD</Text>
                </View>
              )}
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{p.discount}%</Text>
              </View>
              <OptimizedImage source={null} width="100%" aspectRatio={1} />
            </View>
            <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>
            <Text style={styles.productPrice}>TSh {p.price.toLocaleString()}</Text>
            {p.originalPrice > p.price && (
              <Text style={styles.productOldPrice}>TSh {p.originalPrice.toLocaleString()}</Text>
            )}
            <View style={styles.stockBarWrap}>
              <View style={[styles.stockBarFill, { width: `${Math.min(100, (p.stock / 50) * 100)}%` }]} />
              <Text style={styles.stockBarText}>{p.stock} items left</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* More products grid */}
      <Text style={styles.sectionTitle}>Popular products</Text>
      <View style={styles.productGrid}>
        {MOCK_FLASH_PRODUCTS.map((p) => (
          <Pressable
            key={p.id}
            style={[styles.gridCard, { width: (width - 20 * 2 - 12) / 2 }]}
            onPress={() => router.push(`/(guest)/product/${p.id}`)}
          >
            <View style={styles.gridCardImage}>
              {p.sold != null && (
                <View style={styles.soldBadgeSmall}>
                  <Text style={styles.soldBadgeTextSmall}>{p.sold} SOLD</Text>
                </View>
              )}
              <View style={styles.discountBadgeSmall}>
                <Text style={styles.discountTextSmall}>-{p.discount}%</Text>
              </View>
              <OptimizedImage source={null} width="100%" aspectRatio={1} />
            </View>
            <Text style={styles.gridCardName} numberOfLines={2}>{p.name}</Text>
            <Text style={styles.gridCardPrice}>TSh {p.price.toLocaleString()}</Text>
          </Pressable>
        ))}
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
  dots: { flexDirection: 'row', justifyContent: 'center', gap: scaleByWidth(6), marginBottom: sectionGap },
  dot: { width: scaleByWidth(8), height: scaleByWidth(8), borderRadius: scaleByWidth(4), backgroundColor: Theme.inputBorder },
  dotActive: { width: scaleByWidth(20), backgroundColor: Theme.primary },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: sectionGap,
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
  flashScroll: { gap: gap.md, paddingRight: gap.md },
  productCard: {
    backgroundColor: Theme.background,
    borderRadius: scaleByWidth(12),
    padding: gap.md,
    marginRight: gap.md,
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
  sectionTitle: { fontSize: scaleByWidth(18), fontWeight: '700', color: Theme.text, marginBottom: gap.md },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: gap.md },
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
});
