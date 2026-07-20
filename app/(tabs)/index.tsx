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
import * as Location from 'expo-location';
import { getCachedData, setCachedData, CACHE_KEYS } from '@/src/services/cache';
import { OfflineBanner } from '@/components/OfflineBanner';
import { OfflineMessage } from '@/components/OfflineMessage';

const { width } = Dimensions.get('window');

// Keep category images map exactly matching the website
const categoryImages: Record<string, string> = {
  "fast-moving-consumer-goods": "https://tolatola.co/category-fmcg.jpg",
  agriculture: "https://tolatola.co/fresh-vegetables-and-farming-crops.jpg",
  "construction-hardware": "https://tolatola.co/category-hardware.jpg",
  handicrafts: "https://tolatola.co/handmade-crafts-and-artisan-products.jpg",
  "food-beverages": "https://tolatola.co/delicious-food-and-beverages.jpg",
  textiles: "https://tolatola.co/colorful-fabrics-and-textiles.jpg",
  electronics: "https://tolatola.co/modern-electronics-smartphone-and-gadgets.jpg",
  "home-garden": "https://tolatola.co/home-decor-and-garden-plants.jpg",
  "health-beauty": "https://tolatola.co/beauty-and-skincare-products.jpg",
  services: "https://tolatola.co/professional-services-and-business.jpg",
  vehicles: "https://tolatola.co/category-vehicles.jpg",
  "vehicles-sub": "https://tolatola.co/category-vehicles.jpg",
  "ready-to-eat": "https://tolatola.co/delicious-food-and-beverages.jpg",
  "spare-parts": "https://tolatola.co/category-vehicles.jpg",
  drinks: "https://tolatola.co/delicious-food-and-beverages.jpg",
  "non-alcoholic": "https://tolatola.co/delicious-food-and-beverages.jpg",
  alcoholic: "https://tolatola.co/delicious-food-and-beverages.jpg",
  motorcycles: "https://tolatola.co/category-vehicles.jpg",
  default: "https://tolatola.co/placeholder.jpg",
};

export default function GuestHomeScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, session } = useAuth();
  const { items: cartItems, addItem } = useCart();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // Smart Supply Chain matching states
  const [scNotification, setScNotification] = useState<any>(null);
  const [scProducts, setScProducts] = useState<{ matched: Product[]; others: Product[] }>({ matched: [], others: [] });
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const sliderRef = useRef<FlatList>(null);
  const currentSlide = useRef(0);

  const fetchLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (loc?.coords) {
          const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setUserLocation(coords);
          return coords;
        }
      }
    } catch (err) {
      console.log('Error getting location for ranking:', err);
    }
    return null;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let coords = userLocation;
      if (isAuthenticated && !coords) {
        coords = await fetchLocation();
      }

      const catPromise = apiGet<any>('/categories');
      const promoPromise = apiGet<any>('/promotions');
      
      let prodPromise: Promise<any>;
      let notifPromise: Promise<any> = Promise.resolve(null);

      if (isAuthenticated && session?.access_token) {
        const queryStr = coords ? `/products/for-you?userLat=${coords.latitude}&userLng=${coords.longitude}` : '/products/for-you';
        prodPromise = apiGet<any>(queryStr, session.access_token);
        notifPromise = apiGet<any>('/notifications/supply-chain', session.access_token);
      } else {
        prodPromise = apiGet<any>('/products');
      }

      const [catRes, promoRes, prodRes, notifRes] = await Promise.all([
        catPromise,
        promoPromise,
        prodPromise,
        notifPromise,
      ]);

      const cats = catRes?.data || catRes?.categories || [];
      const promos = promoRes?.data || [];
      setCategories(cats);
      setPromotions(promos);
      setIsOffline(false);

      // Save to cache
      await setCachedData(CACHE_KEYS.CATEGORIES, cats);
      await setCachedData(CACHE_KEYS.HOME_PROMOTIONS, promos);

      let prodsList: Product[] = [];
      if (isAuthenticated && prodRes?.data) {
        const matched = prodRes.data.matched || [];
        const others = prodRes.data.others || [];
        setScProducts({ matched, others });
        prodsList = [...matched, ...others];
        setProducts(prodsList);
      } else {
        prodsList = (prodRes as any)?.data || (prodRes as any)?.products || (Array.isArray(prodRes) ? prodRes : []);
        setProducts(prodsList);
        setScProducts({ matched: [], others: [] });
      }
      await setCachedData(CACHE_KEYS.HOME_PRODUCTS, prodsList);

      if (notifRes?.data && notifRes.data.length > 0) {
        setScNotification(notifRes.data[0]);
      } else {
        setScNotification(null);
      }
    } catch (e) {
      console.log('Error fetching home data, trying cache...', e);
      setIsOffline(true);

      const cachedCats = await getCachedData(CACHE_KEYS.CATEGORIES);
      const cachedPromos = await getCachedData(CACHE_KEYS.HOME_PROMOTIONS);
      const cachedProds = await getCachedData(CACHE_KEYS.HOME_PRODUCTS);

      if (cachedCats) setCategories(cachedCats);
      if (cachedPromos) setPromotions(cachedPromos);
      if (cachedProds) {
        setProducts(cachedProds);
        setScProducts({ matched: [], others: [] });
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, session?.access_token, userLocation]);

  const fetchDataSilent = useCallback(async () => {
    try {
      let coords = userLocation;
      const catPromise = apiGet<any>('/categories');
      const promoPromise = apiGet<any>('/promotions');
      
      let prodPromise: Promise<any>;
      let notifPromise: Promise<any> = Promise.resolve(null);

      if (isAuthenticated && session?.access_token) {
        const queryStr = coords ? `/products/for-you?userLat=${coords.latitude}&userLng=${coords.longitude}` : '/products/for-you';
        prodPromise = apiGet<any>(queryStr, session.access_token);
        notifPromise = apiGet<any>('/notifications/supply-chain', session.access_token);
      } else {
        prodPromise = apiGet<any>( '/products');
      }

      const [catRes, promoRes, prodRes, notifRes] = await Promise.all([
        catPromise,
        promoPromise,
        prodPromise,
        notifPromise,
      ]);

      const cats = catRes?.data || catRes?.categories || [];
      const promos = promoRes?.data || [];
      setCategories(cats);
      setPromotions(promos);
      setIsOffline(false);

      // Save to cache
      await setCachedData(CACHE_KEYS.CATEGORIES, cats);
      await setCachedData(CACHE_KEYS.HOME_PROMOTIONS, promos);

      let prodsList: Product[] = [];
      if (isAuthenticated && prodRes?.data) {
        const matched = prodRes.data.matched || [];
        const others = prodRes.data.others || [];
        setScProducts({ matched, others });
        prodsList = [...matched, ...others];
        setProducts(prodsList);
      } else {
        prodsList = (prodRes as any)?.data || (prodRes as any)?.products || (Array.isArray(prodRes) ? prodRes : []);
        setProducts(prodsList);
        setScProducts({ matched: [], others: [] });
      }
      await setCachedData(CACHE_KEYS.HOME_PRODUCTS, prodsList);

      if (notifRes?.data && notifRes.data.length > 0) {
        setScNotification(notifRes.data[0]);
      } else {
        setScNotification(null);
      }
    } catch (e) {
      console.log('Silent refresh failed:', e);
      setIsOffline(true);
    }
  }, [isAuthenticated, session?.access_token, userLocation]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Silent refresh interval for non-disruptive homepage updates (every 60s)
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      fetchDataSilent();
    }, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchDataSilent]);

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
  const bestDeals = products.filter((p) => p.compare_at_price && (p.compare_at_price as number) > (p.price ?? 0)).slice(0, 10);

  const getCategoryImage = (cat: any) => {
    if (cat.image_url) return cat.image_url;
    if (cat.slug && categoryImages[cat.slug]) {
      return categoryImages[cat.slug];
    }
    const nameLower = (cat.name || '').toLowerCase();
    if (nameLower.includes('ready to eat') || nameLower.includes('ready-to-eat')) return categoryImages["ready-to-eat"];
    if (nameLower.includes('spare') || nameLower.includes('part')) return categoryImages["spare-parts"];
    if (nameLower.includes('drink') || nameLower.includes('alcohol')) return categoryImages.drinks;
    if (nameLower.includes('agri') || nameLower.includes('farm')) return categoryImages.agriculture;
    if (nameLower.includes('food') || nameLower.includes('bev') || nameLower.includes('beverage')) return categoryImages["food-beverages"];
    if (nameLower.includes('construct') || nameLower.includes('hard') || nameLower.includes('hardware')) return categoryImages["construction-hardware"];
    if (nameLower.includes('electro')) return categoryImages.electronics;
    if (nameLower.includes('health') || nameLower.includes('beauty')) return categoryImages["health-beauty"];
    if (nameLower.includes('service')) return categoryImages.services;
    if (nameLower.includes('fmcg') || nameLower.includes('fast') || nameLower.includes('moving')) return categoryImages["fast-moving-consumer-goods"];
    if (nameLower.includes('motorcycle')) return categoryImages.motorcycles;
    if (nameLower.includes('vehicle') || nameLower.includes('car') || nameLower.includes('auto') || nameLower.includes('motor')) return categoryImages.vehicles;
    if (nameLower.includes('handicraft') || nameLower.includes('craft')) return categoryImages.handicrafts;
    if (nameLower.includes('home') || nameLower.includes('garden')) return categoryImages["home-garden"];
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

  const userType = session?.user?.user_type || (session?.user as any)?.role;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Navbar – Row 1 */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <Pressable style={styles.logoGroup} onPress={() => {}}>
            <View style={styles.logoBox}>
               <OptimizedImage source="https://tolatola.co/logo-new.png" width="100%" height="100%" resizeMode="contain" />
            </View>
            <Text style={styles.logoTitle}>TOLA.</Text>
          </Pressable>
          <View style={styles.headerRight}>
             {/* Show dashboard buttons for ALL approved roles */}
             {((session?.user as any)?.vendor?.kyc_status === 'approved' || userType === 'vendor') && (
               <Pressable 
                 style={({ pressed }) => [styles.dashboardBtn, pressed && { opacity: 0.75 }]} 
                 onPress={() => router.push('/(vendor)/dashboard' as any)}
                 hitSlop={10}
               >
                 <FontAwesome name="dashboard" size={13} color="#fff" />
                 <Text style={styles.dashboardBtnLabel}>Seller Hub</Text>
               </Pressable>
             )}
             {((session?.user as any)?.transporter?.kyc_status === 'approved' || userType === 'transporter') && (
               <Pressable 
                 style={({ pressed }) => [styles.dashboardBtn, { backgroundColor: '#10b981' }, pressed && { opacity: 0.75 }]} 
                 onPress={() => router.push('/(transporter)/dashboard' as any)}
                 hitSlop={10}
               >
                 <FontAwesome name="truck" size={13} color="#fff" />
                 <Text style={styles.dashboardBtnLabel}>Transporter</Text>
               </Pressable>
             )}
             {userType === 'admin' && (
               <Pressable 
                 style={({ pressed }) => [styles.dashboardBtn, pressed && { opacity: 0.75 }]} 
                 onPress={() => router.push(getRoleRedirectPath('admin') as any)}
                 hitSlop={10}
               >
                 <FontAwesome name="gears" size={13} color="#fff" />
                 <Text style={styles.dashboardBtnLabel}>Admin</Text>
               </Pressable>
             )}
             <Pressable 
               style={({ pressed }) => [styles.shopTextBtn, pressed && { opacity: 0.7 }]} 
               onPress={() => router.push('/(tabs)/shop')}
               hitSlop={10}
             >
               <FontAwesome name="shopping-bag" size={14} color={Theme.primary} />
               <Text style={styles.shopTextBtnLabel}>Shop</Text>
             </Pressable>
             <Pressable 
                style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }, { marginRight: 4 }]} 
                onPress={() => router.push('/(tabs)/favorites')}
                hitSlop={10}
              >
                <FontAwesome name="heart-o" size={20} color={Theme.primary} />
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

      {isOffline && <OfflineBanner onRetry={fetchData} />}

      {isOffline && categories.length === 0 && products.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <OfflineMessage type="general" onRetry={fetchData} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Supply Chain Real-Time Notification Banner */}
        {isAuthenticated && scNotification && (
          <Pressable
            style={styles.scNotificationBanner}
            onPress={() => {
              const pid = scNotification.data?.product_id || scNotification.data?.productId;
              if (pid) {
                router.push(`/(guest)/product/${pid}`);
              } else {
                router.push('/(tabs)/shop');
              }
            }}
          >
            <View style={styles.scNotifLeft}>
              <View style={styles.scNotifIconBg}>
                <FontAwesome
                  name={
                    scNotification.type === 'price_change'
                      ? 'tag'
                      : scNotification.type === 'stock_update'
                      ? 'archive'
                      : 'star'
                  }
                  size={14}
                  color="#fff"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scNotifTitle} numberOfLines={1}>
                  {scNotification.title}
                </Text>
                <Text style={styles.scNotifMessage} numberOfLines={1}>
                  {scNotification.message}
                </Text>
              </View>
            </View>
            <FontAwesome name="chevron-right" size={12} color={Theme.primary} />
          </Pressable>
        )}

        {/* Categories Nav (Web Parity) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catNav} contentContainerStyle={{ paddingHorizontal: 16 }}>
          <Pressable style={[styles.catPill, styles.catPillActive]} onPress={() => router.push('/(tabs)/shop')}>
            <FontAwesome name="th-large" size={12} color="#fff" />
            <Text style={[styles.catPillText, styles.catPillTextActive]}>ALL CATEGORIES</Text>
          </Pressable>
          {categories.filter((c: any) => !c.parent_id).map(c => (
            <Pressable key={c.id} style={styles.catPill} onPress={() => router.push(`(tabs)/shop?category=${c.id}` as any)}>
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
                    {item.button_link === 'SPECIAL_VENDOR_ACTIONS' ? (
                      <View style={styles.vendorActionsGrid}>
                        <View style={styles.vendorActionsRow}>
                          <Pressable
                            style={({ pressed }) => [styles.vendorActionBtn, styles.vendorActionBtnPrimary, pressed && { opacity: 0.85 }]}
                            onPress={() => router.push('/(tabs)/shop')}
                          >
                            <FontAwesome name="shopping-cart" size={10} color="#fff" />
                            <Text style={styles.vendorActionBtnTextPrimary}>Start Shopping</Text>
                          </Pressable>
                          <Pressable
                            style={({ pressed }) => [styles.vendorActionBtn, styles.vendorActionBtnOutline, pressed && { opacity: 0.85 }]}
                            onPress={() => router.push({ pathname: '/(auth)/signup', params: { role: 'vendor' } } as any)}
                          >
                            <FontAwesome name="shopping-bag" size={10} color="#fff" />
                            <Text style={styles.vendorActionBtnTextOutline}>Become Seller</Text>
                          </Pressable>
                        </View>
                        <Pressable
                          style={({ pressed }) => [styles.vendorActionBtn, styles.vendorActionBtnOutline, { alignSelf: 'flex-start' }, pressed && { opacity: 0.85 }]}
                          onPress={() => router.push({ pathname: '/(auth)/signup', params: { role: 'transporter' } } as any)}
                        >
                          <FontAwesome name="truck" size={10} color="#fff" />
                          <Text style={styles.vendorActionBtnTextOutline}>Become Transporter</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable style={styles.heroBtn} onPress={() => router.push('/(tabs)/shop')}>
                        <Text style={styles.heroBtnText}>{item.button_text?.split('|')[0] || "Start Shopping"}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            )}
          />
        )}

        {/* Personalized Supply Chain Sections */}
        {isAuthenticated && (scProducts.matched.length > 0 || scProducts.others.length > 0) ? (
          <>
            {/* Supply Chain Matches */}
            {scProducts.matched.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionSub}>Sourced from preferred partners</Text>
                    <Text style={styles.sectionTitle}>Supply Chain <Text style={styles.italicPrimary}>Matches</Text></Text>
                  </View>
                  <Pressable onPress={() => router.push('/(tabs)/shop')}><Text style={styles.seeAll}>See All</Text></Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                  {scProducts.matched.slice(0, 10).map(p => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      badge={{ text: 'MATCHED', variant: 'new' }}
                      isLiked={likedIds.has(p.id)}
                      isInCart={cartItems.some(i => i.product_id === p.id)}
                      onAddToCart={addItem}
                      onToggleLike={toggleLike}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Recommended Opportunities */}
            {scProducts.others.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionSub}>Top trading opportunities calculated for you</Text>
                    <Text style={styles.sectionTitle}>Recommended <Text style={styles.italicRed}>For You</Text></Text>
                  </View>
                  <Pressable onPress={() => router.push('/(tabs)/shop')}><Text style={styles.seeAll}>See All</Text></Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                  {scProducts.others.slice(0, 10).map(p => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      badge={{ text: 'POPULAR', variant: 'deal' }}
                      isLiked={likedIds.has(p.id)}
                      isInCart={cartItems.some(i => i.product_id === p.id)}
                      onAddToCart={addItem}
                      onToggleLike={toggleLike}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        ) : (
          <>
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
          </>
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
            {categories.filter((c: any) => !c.parent_id).slice(0, 12).map((cat) => (
              <Pressable key={cat.id} style={styles.categoryCard} onPress={() => router.push(`(tabs)/shop?category=${cat.id}` as any)}>
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
      )}
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
    gap: 8,
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
    gap: 10,
  },
  iconButton: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
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
    gap: 4,
    backgroundColor: Theme.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
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

  vendorActionsGrid: { gap: 6, marginTop: 2 },
  vendorActionsRow: { flexDirection: 'row', gap: 6 },
  vendorActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  vendorActionBtnPrimary: {
    backgroundColor: Theme.primary,
  },
  vendorActionBtnOutline: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  vendorActionBtnTextPrimary: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  vendorActionBtnTextOutline: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  
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
  dashboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Theme.primary,
    ...Theme.shadowSm,
  },
  dashboardBtnLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  scNotificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: Theme.primary + '30',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    ...Theme.shadowSm,
  },
  scNotifLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  scNotifIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scNotifTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.text,
  },
  scNotifMessage: {
    fontSize: 11,
    color: Theme.textSecondary,
    marginTop: 1,
  },
});
