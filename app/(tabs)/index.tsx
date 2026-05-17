import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, FlatList, Dimensions, ActivityIndicator, Linking } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { apiGet } from '@/src/services/api';
import type { Product, Banner } from '@/src/types';
import { OptimizedImage } from '@/components/OptimizedImage';
import { ProductCard } from '@/components/ProductCard';
import { useAuth } from '@/src/contexts/AuthContext';
import { getRoleRedirectPath } from '@/src/lib/roleRedirect';
import { useCart } from '@/src/contexts/CartContext';

const { width } = Dimensions.get('window');

// Keep category images map similar to web
const categoryImages: Record<string, string> = {
  fmcg: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
  agriculture: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80',
  construction: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=400&q=80',
  electronics: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=400&q=80',
  food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80',
  health: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=400&q=80',
  services: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=400&q=80',
  vehicles: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=400&q=80',
  handicrafts: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=400&q=80',
  home: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=400&q=80',
  textiles: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=400&q=80',
  default: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=400&q=80',
};

export default function GuestHomeScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, session } = useAuth();
  const { items: cartItems, addItem } = useCart();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const sliderRef = useRef<FlatList>(null);
  const currentSlide = useRef(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, promoRes, prodRes] = await Promise.all([
        apiGet<{ categories?: any[]; data?: any[] }>('/categories').catch(() => ({ data: [] })),
        apiGet<{ data?: any[] }>('/promotions').catch(() => ({ data: [] })),
        apiGet<{ products?: Product[]; data?: Product[] } | Product[]>('/products').catch(() => []),
      ]);
      
      const cats = catRes?.data || catRes?.categories || [];
      const promos = promoRes?.data || [];
      const prods = (prodRes as any)?.data || (prodRes as any)?.products || (Array.isArray(prodRes) ? prodRes : []);
      
      setCategories(cats);
      setPromotions(promos);
      setProducts(prods);
    } catch (e) {
      console.log('Error fetching home data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (promotions.length <= 1) return;
    const interval = setInterval(() => {
      currentSlide.current = (currentSlide.current + 1) % promotions.length;
      try {
        sliderRef.current?.scrollToIndex({
          index: currentSlide.current,
          animated: true,
        });
      } catch (e) {
        // Safe fail if layout is not yet ready
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [promotions]);

  const featuredProducts = products.slice(0, 10);
  const bestDeals = products.filter((p) => p.compare_at_price && p.compare_at_price > (p.price ?? 0)).slice(0, 10);

  const getCategoryImage = (cat: any) => {
    if (cat.image_url) return cat.image_url;
    const nameLower = (cat.name || '').toLowerCase();
    if (nameLower.includes('agri') || nameLower.includes('farm')) return categoryImages.agriculture;
    if (nameLower.includes('food') || nameLower.includes('bev')) return categoryImages.food;
    if (nameLower.includes('construct') || nameLower.includes('hard')) return categoryImages.construction;
    if (nameLower.includes('electro')) return categoryImages.electronics;
    if (nameLower.includes('health') || nameLower.includes('beauty')) return categoryImages.health;
    if (nameLower.includes('service')) return categoryImages.services;
    if (nameLower.includes('fmcg') || nameLower.includes('fast')) return categoryImages.fmcg;
    if (nameLower.includes('vehicle') || nameLower.includes('car') || nameLower.includes('auto') || nameLower.includes('motor')) return categoryImages.vehicles;
    if (nameLower.includes('handicraft') || nameLower.includes('craft')) return categoryImages.handicrafts;
    if (nameLower.includes('home') || nameLower.includes('garden')) return categoryImages.home;
    if (nameLower.includes('textile') || nameLower.includes('fabric') || nameLower.includes('cloth')) return categoryImages.textiles;
    return categoryImages.default;
  };

  const toggleLike = (id: string) => {
    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Navbar – Row 1 */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <Pressable style={styles.logoGroup} onPress={() => {}}>
            <View style={styles.logoBox}>
               <OptimizedImage source="https://tolatola.co/logo-new.png" width="100%" height="100%" resizeMode="contain" />
            </View>
            <View>
              <Text style={styles.logoTitle}>TOLA.</Text>
              <Text style={styles.logoSubtitle}>YOUR TRADE PARTNER</Text>
            </View>
          </Pressable>
          <View style={styles.headerRight}>
             <Pressable 
               style={({ pressed }) => [styles.shopTextBtn, pressed && { opacity: 0.7 }]} 
               onPress={() => router.push('/(tabs)/shop')}
               hitSlop={10}
             >
               <FontAwesome name="shopping-bag" size={14} color={Theme.primary} />
               <Text style={styles.shopTextBtnLabel}>Shop</Text>
             </Pressable>
             <Pressable 
               style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]} 
               onPress={() => router.push('/(tabs)/cart')}
               hitSlop={10}
             >
               <FontAwesome name="shopping-cart" size={22} color={Theme.primary} />
               {cartItems.length > 0 && (
                 <View style={styles.badge}>
                   <Text style={styles.badgeText}>{cartItems.length > 99 ? '99+' : cartItems.length}</Text>
                 </View>
               )}
             </Pressable>

          </View>
        </View>

        {/* Navbar – Row 2: Track Order + Search */}
        <View style={styles.headerRow2}>
          <Pressable
            style={({ pressed }) => [styles.trackOrderBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push('/(guest)/track')}
          >
            <FontAwesome name="map-marker" size={14} color="#fff" />
            <Text style={styles.trackOrderBtnText}>Track Order</Text>
          </Pressable>
          <Pressable
            style={styles.headerSearchBar}
            onPress={() => router.push('/(tabs)/shop')}
          >
            <FontAwesome name="search" size={14} color={Theme.textMuted} />
            <Text style={styles.headerSearchPlaceholder}>What are you looking for...</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Categories Nav (Web Parity) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catNav} contentContainerStyle={{ paddingHorizontal: 16 }}>
          <Pressable style={[styles.catPill, styles.catPillActive]} onPress={() => router.push('/(tabs)/shop')}>
            <FontAwesome name="th-large" size={12} color="#fff" />
            <Text style={[styles.catPillText, styles.catPillTextActive]}>ALL CATEGORIES</Text>
          </Pressable>
          {categories.map(c => (
            <Pressable key={c.id} style={styles.catPill} onPress={() => router.push(`(tabs)/shop?category=${c.id}`)}>
              <View style={styles.catPillImgBox}>
                <OptimizedImage source={getCategoryImage(c)} width="100%" height="100%" />
              </View>
              <Text style={styles.catPillText}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Hero Slider */}
        {promotions.length > 0 && (
          <FlatList
            ref={sliderRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={promotions}
            keyExtractor={p => p.id.toString()}
            style={styles.heroSlider}
            getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
              currentSlide.current = newIndex;
            }}
            renderItem={({ item }) => (
              <View style={[styles.heroSlide, { backgroundColor: item.background_color || '#0c0a09' }]}>
                <View style={styles.heroSlideContent}>
                  <View style={styles.heroSlideImgBox}>
                     <OptimizedImage source={item.image_url} width="100%" height="100%" style={styles.heroSlideImg} />
                  </View>
                  <View style={styles.heroSlideText}>
                    <View style={styles.heroBadge}>
                      <FontAwesome name="star" size={10} color={Theme.primary} />
                      <Text style={styles.heroBadgeText}>SPECIAL OFFER</Text>
                    </View>
                    <Text style={[styles.heroTitle, { color: item.text_color || '#fff' }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={[styles.heroDesc, { color: item.text_color || '#fff' }]} numberOfLines={2}>
                      {item.description || "Discover amazing deals and shop from trusted sellers."}
                    </Text>
                    <Pressable style={styles.heroBtn} onPress={() => router.push('/(tabs)/shop')}>
                      <Text style={styles.heroBtnText}>{item.button_text?.split('|')[0] || "Start Shopping"}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          />
        )}

        {/* Handpicked for you / Featured Products */}
        {featuredProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Handpicked for <Text style={styles.italicPrimary}>You</Text></Text>
              <Pressable onPress={() => router.push('/(tabs)/shop')}><Text style={styles.seeAll}>See All</Text></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {featuredProducts.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  badge={{ text: 'HOT', variant: 'new' }}
                  isLiked={likedIds.has(p.id)}
                  isInCart={cartItems.some(i => i.product_id === p.id)}
                  onAddToCart={addItem}
                  onToggleLike={toggleLike}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Best Deals */}
        {bestDeals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Best Deals <Text style={styles.italicRed}>In Town</Text></Text>
              <Pressable onPress={() => router.push('/(tabs)/shop')}><Text style={styles.seeAll}>See All</Text></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {bestDeals.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  badge={{ text: 'OFFER', variant: 'deal' }}
                  isLiked={likedIds.has(p.id)}
                  isInCart={cartItems.some(i => i.product_id === p.id)}
                  onAddToCart={addItem}
                  onToggleLike={toggleLike}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Benefits Strip */}
        <View style={styles.benefitsStrip}>
          <View style={styles.benefitItem}>
            <FontAwesome name="shield" size={18} color={Theme.primary} />
            <Text style={styles.benefitText}>SECURE PAYMENTS</Text>
          </View>
          <View style={styles.benefitItem}>
            <FontAwesome name="users" size={18} color={Theme.primary} />
            <Text style={styles.benefitText}>VERIFIED VENDORS</Text>
          </View>
          <View style={styles.benefitItem}>
            <FontAwesome name="globe" size={18} color={Theme.primary} />
            <Text style={styles.benefitText}>PAN-TANZANIA REACH</Text>
          </View>
        </View>

        {/* Trending Categories Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionSub}>Selections for you</Text>
          <Text style={styles.sectionTitle}>Shop by <Text style={styles.italicPrimary}>Category</Text></Text>
          <View style={styles.categoryGrid}>
            {categories.slice(0, 12).map((cat) => (
              <Pressable key={cat.id} style={styles.categoryCard} onPress={() => router.push(`(tabs)/shop?category=${cat.id}`)}>
                <OptimizedImage source={getCategoryImage(cat)} width="100%" aspectRatio={1.5} style={styles.categoryCardImg} />
                <View style={styles.categoryCardOverlay}>
                  <Text style={styles.categoryCardText}>{cat.name}</Text>
                </View>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => router.push('/(tabs)/shop')} style={styles.viewCatalogBtn}>
            <Text style={styles.viewCatalogText}>View Entire Catalog <FontAwesome name="arrow-right" size={12} /></Text>
          </Pressable>
        </View>

        {/* Engineered for Trust */}
        <View style={[styles.section, { backgroundColor: Theme.backgroundSecondary, paddingVertical: 24, marginHorizontal: -16, paddingHorizontal: 16 }]}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Engineered for <Text style={styles.italicPrimary}>Trust</Text></Text>
            <Text style={styles.trustDesc}>We've built a multi-layered security framework to protect both the buyer and the merchant.</Text>
          </View>

          <View style={styles.trustCardsContainer}>
            <View style={styles.trustCard}>
              <View style={[styles.trustIconWrap, { backgroundColor: '#3b82f6' }]}>
                <FontAwesome name="credit-card" size={20} color="#fff" />
              </View>
              <Text style={styles.trustCardTitle}>Secure Payments</Text>
              <Text style={styles.trustCardDesc}>Your payments are protected and processed securely by licensed PSPs.</Text>
            </View>
            <View style={styles.trustCard}>
              <View style={[styles.trustIconWrap, { backgroundColor: Theme.primary }]}>
                <FontAwesome name="shield" size={20} color="#fff" />
              </View>
              <Text style={styles.trustCardTitle}>NIDA Verified</Text>
              <Text style={styles.trustCardDesc}>Every vendor undergoes rigorous identity and business vetting before listing.</Text>
            </View>
            <View style={styles.trustCard}>
              <View style={[styles.trustIconWrap, { backgroundColor: '#f59e0b' }]}>
                <FontAwesome name="bolt" size={20} color="#fff" />
              </View>
              <Text style={styles.trustCardTitle}>Swift Delivery</Text>
              <Text style={styles.trustCardDesc}>Local logistics partners ensure your orders reach you in record time.</Text>
            </View>
          </View>
        </View>

        {/* Seller CTA */}
        <View style={styles.ctaSection}>
          <View style={styles.ctaBadge}>
            <Text style={styles.ctaBadgeText}>OPEN FOR ENROLLMENT</Text>
          </View>
          <Text style={styles.ctaTitle}>Grow Your Brand{"\n"}Across <Text style={{ color: 'rgba(255,255,255,0.4)' }}>Tanzania</Text></Text>
          <Text style={styles.ctaDesc}>Join 500+ verified merchants. Secure mobile money payouts, managed logistics, and payment protection for every sale.</Text>
          
          <Pressable style={styles.ctaBtn} onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.ctaBtnText}>Become a seller</Text>
          </Pressable>
          <Pressable style={styles.ctaBtnOutline} onPress={() => router.push('/(tabs)/shop')}>
            <Text style={styles.ctaBtnOutlineText}>Contact Sales</Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBorder,
    backgroundColor: 'rgba(255,255,255,0.95)',
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Theme.inputBg,
    ...Theme.shadowSm,
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Theme.text,
    lineHeight: 20,
  },
  logoSubtitle: {
    fontSize: 8,
    fontWeight: '900',
    color: Theme.primary,
    letterSpacing: 1.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadowSm,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Theme.accentRed,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },

  shopTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.primary + '15',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Theme.primary + '40',
  },
  shopTextBtnLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.primary,
  },
  headerRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  trackOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    ...Theme.shadowSm,
  },
  trackOrderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  headerSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.inputBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  headerSearchPlaceholder: {
    fontSize: 13,
    color: Theme.textMuted,
  },
  scrollContent: { paddingBottom: 40 },
  catNav: { borderBottomWidth: 1, borderBottomColor: Theme.inputBorder, paddingVertical: 12, backgroundColor: '#fff' },
  catPill: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    gap: 8,
  },
  catPillActive: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
    ...Theme.shadowSm,
  },
  catPillText: { fontSize: 11, fontWeight: '700', color: Theme.textSecondary },
  catPillTextActive: { color: '#fff' },
  catPillImgBox: { width: 20, height: 20, borderRadius: 6, overflow: 'hidden', backgroundColor: Theme.inputBg },
  
  heroSlider: { width: width, marginTop: 16 },
  heroSlide: { width: width - 32, marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', ...Theme.shadowMd },
  heroSlideContent: { flexDirection: 'row', padding: 16, alignItems: 'center', height: 180 },
  heroSlideImgBox: { width: '40%', height: '100%', borderRadius: 12, overflow: 'hidden' },
  heroSlideImg: { width: '100%', height: '100%', borderRadius: 12 },
  heroSlideText: { width: '60%', paddingLeft: 16, justifyContent: 'center' },
  heroBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  heroBadgeText: { fontSize: 8, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  heroTitle: { fontSize: 20, fontWeight: '900', marginBottom: 4, lineHeight: 24 },
  heroDesc: { fontSize: 11, fontWeight: '500', opacity: 0.9, marginBottom: 12 },
  heroBtn: { backgroundColor: Theme.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  heroBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  
  section: { marginTop: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, paddingHorizontal: 16 },
  sectionSub: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: Theme.primary, letterSpacing: 1, marginBottom: 2, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: Theme.text },
  italicPrimary: { color: Theme.primary, fontStyle: 'italic' },
  italicRed: { color: Theme.accentRed, fontStyle: 'italic' },
  seeAll: { fontSize: 13, fontWeight: '700', color: Theme.primary },
  horizontalList: { paddingLeft: 16, paddingRight: 16 },
  
  benefitsStrip: {
    flexDirection: 'row', backgroundColor: '#1c1917', paddingVertical: 24, marginTop: 32,
    justifyContent: 'space-evenly', flexWrap: 'wrap', gap: 16,
  },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  benefitText: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 16, paddingHorizontal: 16 },
  categoryCard: { width: '48%', aspectRatio: 1.5, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  categoryCardImg: { width: '100%', height: '100%', borderRadius: 12 },
  categoryCardOverlay: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: 8,
  },
  categoryCardText: { color: '#fff', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  viewCatalogBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, padding: 12 },
  viewCatalogText: { fontSize: 13, fontWeight: '700', color: Theme.primary, gap: 4 },
  
  trustDesc: { fontSize: 12, color: Theme.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  trustCardsContainer: { gap: 12 },
  trustCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, ...Theme.shadowSm },
  trustIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  trustCardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  trustCardDesc: { fontSize: 12, color: Theme.textSecondary, lineHeight: 18 },
  
  ctaSection: {
    backgroundColor: Theme.primary, borderRadius: 24, marginHorizontal: 16, marginTop: 40,
    padding: 32, overflow: 'hidden',
  },
  ctaBadge: { alignSelf: 'flex-start', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  ctaBadgeText: { color: Theme.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  ctaTitle: { color: '#fff', fontSize: 28, fontWeight: '900', lineHeight: 32, marginBottom: 16 },
  ctaDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 32, lineHeight: 22 },
  ctaBtn: { backgroundColor: '#1c1917', paddingVertical: 18, borderRadius: 14, alignItems: 'center', marginBottom: 12 },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  ctaBtnOutline: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  ctaBtnOutlineText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
