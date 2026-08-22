import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, FlatList, Dimensions, ActivityIndicator, Linking, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/src/hooks/useThemeColors';
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
import { PartnersSection } from '@/components/PartnersSection';
import { pickImageSafe, requestImagePermissions } from '@/src/lib/imagePicker';
import { resolveCategoryImage } from '@/src/constants/categoryImages';

const { width } = Dimensions.get('window');

const trustFeatures = [
  {
    title: 'Secure Payments',
    desc: 'Your payments are protected with encrypted escrow and processed securely by licensed PSPs.',
    image: require('../../assets/images/trust-secure-payments.png'),
    badge: 'Encrypted Escrow',
    badgeBg: '#eff6ff',
    badgeText: '#1d61e7',
    badgeBorder: '#bfdbfe',
  },
  {
    title: 'NIDA Verified',
    desc: 'Every vendor undergoes rigorous NIDA identity and business vetting before listing products.',
    image: require('../../assets/images/trust-nida-verified.png'),
    badge: 'Verified Merchant',
    badgeBg: '#ecfdf5',
    badgeText: '#047857',
    badgeBorder: '#a7f3d0',
  },
  {
    title: 'Swift Delivery',
    desc: 'Local express logistics partners ensure your orders reach your doorstep in record time.',
    image: require('../../assets/images/trust-swift-delivery.png'),
    badge: 'Speed Logistics',
    badgeBg: '#fffbeb',
    badgeText: '#b45309',
    badgeBorder: '#fde68a',
  },
];

export default function GuestHomeScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, session } = useAuth();
  const { items: cartItems, addItem } = useCart();
  const theme = useThemeColors();
  
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
  const bestSelling = [...products].sort((a, b) => (Number(b.sales_count) || 0) - (Number(a.sales_count) || 0)).filter(p => (Number(p.sales_count) || 0) > 0).slice(0, 10);
  const bestDeals = products.filter((p) => p.compare_at_price && (p.compare_at_price as number) > (p.price ?? 0)).slice(0, 10);

  const triggerImagePicker = () => {
    Alert.alert(
      'Search by Image',
      'Upload a photo to find matching products using TOLATOLA AI',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const ok = await requestImagePermissions();
            if (!ok) return;
            const picked = await pickImageSafe(true);
            if (picked?.base64) {
              router.push({
                pathname: '/(tabs)/shop',
                params: { imageBase64: picked.base64, mimeType: picked.mimeType },
              });
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const ok = await requestImagePermissions();
            if (!ok) return;
            const picked = await pickImageSafe(false);
            if (picked?.base64) {
              router.push({
                pathname: '/(tabs)/shop',
                params: { imageBase64: picked.base64, mimeType: picked.mimeType },
              });
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
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
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const userType = session?.user?.user_type || (session?.user as any)?.role;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      {/* Top Navbar – Row 1 */}
      <View style={[styles.headerContainer, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
        <View style={styles.headerTop}>
          <Pressable style={styles.logoGroup} onPress={() => {}}>
            <View style={[styles.logoBox, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
               <OptimizedImage source="https://tolatola.co/logo-new.png" width="100%" height="100%" resizeMode="contain" />
            </View>
            <Text style={[styles.logoTitle, { color: theme.text }]}>TOLA.</Text>
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
               style={({ pressed }) => [styles.shopTextBtn, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '40' }, pressed && { opacity: 0.7 }]} 
               onPress={() => router.push('/(tabs)/shop')}
               hitSlop={10}
             >
               <FontAwesome name="shopping-bag" size={14} color={theme.primary} />
               <Text style={styles.shopTextBtnLabel}>Shop</Text>
             </Pressable>
             <Pressable 
                style={({ pressed }) => [styles.iconButton, { backgroundColor: theme.iconBg }, pressed && { opacity: 0.7 }, { marginRight: 4 }]} 
                onPress={() => router.push('/(tabs)/favorites')}
                hitSlop={10}
              >
                <FontAwesome name="heart-o" size={20} color={theme.primary} />
              </Pressable>
              <Pressable 
                style={({ pressed }) => [styles.iconButton, { backgroundColor: theme.iconBg }, pressed && { opacity: 0.7 }]} 
                onPress={() => router.push('/(tabs)/cart')}
                hitSlop={10}
              >
                <FontAwesome name="shopping-cart" size={22} color={theme.primary} />
                {cartItems.length > 0 && (
                  <View style={[styles.badge, { borderColor: theme.background }]}>
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
          <View style={[styles.headerSearchBar, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
            <Pressable
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              onPress={() => router.push('/(tabs)/shop')}
            >
              <FontAwesome name="search" size={14} color={theme.textMuted} />
              <Text style={[styles.headerSearchPlaceholder, { color: theme.textMuted }]}>What are you looking for...</Text>
            </Pressable>
            <Pressable
              onPress={triggerImagePicker}
              style={{ paddingHorizontal: 6, paddingVertical: 5 }}
              hitSlop={8}
            >
              <FontAwesome name="camera" size={15} color="#F59E0B" />
            </Pressable>
          </View>
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
            style={[styles.scNotificationBanner, { backgroundColor: theme.cardBackground, borderColor: theme.primary + '30' }]}
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
                <Text style={[styles.scNotifTitle, { color: theme.text }]} numberOfLines={1}>
                  {scNotification.title}
                </Text>
                <Text style={[styles.scNotifMessage, { color: theme.textSecondary }]} numberOfLines={1}>
                  {scNotification.message}
                </Text>
              </View>
            </View>
            <FontAwesome name="chevron-right" size={12} color={theme.primary} />
          </Pressable>
        )}

        {/* Categories Nav - Squircle Tile Icons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.catNav, { backgroundColor: theme.background, borderBottomColor: theme.border }]} contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}>
          <Pressable style={styles.catCircleItem} onPress={() => router.push('/(tabs)/shop')}>
            <View style={[styles.catCircle, styles.catCircleActive]}>
              <FontAwesome name="th-large" size={20} color="#fff" />
            </View>
            <Text style={[styles.catCircleLabel, styles.catCircleLabelActive, { color: theme.primary }]}>All</Text>
          </Pressable>
          {categories.filter((c: any) => !c.parent_id).sort((a: any, b: any) => {
            const isAService = a.slug === "services" || a.name?.toLowerCase() === "services"
            const isBService = b.slug === "services" || b.name?.toLowerCase() === "services"
            if (isAService && !isBService) return 1
            if (!isAService && isBService) return -1
            return 0
          }).map(c => (
            <Pressable key={c.id} style={styles.catCircleItem} onPress={() => router.push(`(tabs)/shop?category=${c.id}` as any)}>
              <View style={[styles.catCircle, { backgroundColor: theme.catCircleBg, borderColor: theme.catCircleBorder }]}>
                <OptimizedImage source={resolveCategoryImage(c)} width="100%" height="100%" style={{ borderRadius: 18 }} />
              </View>
              <Text style={[styles.catCircleLabel, { color: theme.textSecondary }]} numberOfLines={2}>{c.name}</Text>
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
                    <Text style={[styles.sectionSub, { color: theme.primary }]}>Sourced from preferred partners</Text>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Supply Chain <Text style={styles.italicPrimary}>Matches</Text></Text>
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
                    <Text style={[styles.sectionSub, { color: theme.primary }]}>Top trading opportunities calculated for you</Text>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Recommended <Text style={styles.italicRed}>For You</Text></Text>
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
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Handpicked for <Text style={styles.italicPrimary}>You</Text></Text>
                  <Pressable onPress={() => router.push('/(tabs)/shop')}><Text style={styles.seeAll}>See All</Text></Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                  {featuredProducts.map(p => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      badge={{ text: 'NEW', variant: 'new' }}
                      isLiked={likedIds.has(p.id)}
                      isInCart={cartItems.some(i => i.product_id === p.id)}
                      onAddToCart={addItem}
                      onToggleLike={toggleLike}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Most Selling Section */}
            {bestSelling.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Most <Text style={[styles.italicPrimary, { color: '#F59E0B' }]}>Selling</Text></Text>
                  <Pressable onPress={() => router.push('/(tabs)/shop')}><Text style={styles.seeAll}>See All</Text></Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                  {bestSelling.map(p => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      badge={{ text: 'HOT', variant: 'hot' }}
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
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Best Deals <Text style={styles.italicRed}>In Town</Text></Text>
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
            <FontAwesome name="shield" size={18} color={theme.primary} />
            <Text style={styles.benefitText}>SECURE PAYMENTS</Text>
          </View>
          <View style={styles.benefitItem}>
            <FontAwesome name="users" size={18} color={theme.primary} />
            <Text style={styles.benefitText}>VERIFIED VENDORS</Text>
          </View>
          <View style={styles.benefitItem}>
            <FontAwesome name="globe" size={18} color={theme.primary} />
            <Text style={styles.benefitText}>PAN-TANZANIA REACH</Text>
          </View>
        </View>

        {/* Trending Categories - Circular Icons Grid */}
        <View style={styles.section}>
          <Text style={[styles.sectionSub, { color: theme.primary }]}>Selections for you</Text>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Shop by <Text style={styles.italicPrimary}>Category</Text></Text>
          <View style={styles.catCircleGrid}>
            {categories.filter((c: any) => !c.parent_id).sort((a: any, b: any) => {
              const isAService = a.slug === "services" || a.name?.toLowerCase() === "services"
              const isBService = b.slug === "services" || b.name?.toLowerCase() === "services"
              if (isAService && !isBService) return 1
              if (!isAService && isBService) return -1
              return 0
            }).slice(0, 12).map((cat) => (
              <Pressable key={cat.id} style={styles.catGridItem} onPress={() => router.push(`(tabs)/shop?category=${cat.id}` as any)}>
                <View style={[styles.catGridCircle, { backgroundColor: theme.catCircleBg, borderColor: theme.catCircleBorder }]}>
                  <OptimizedImage source={resolveCategoryImage(cat)} width="100%" height="100%" style={{ borderRadius: 22 }} />
                </View>
                <Text style={[styles.catGridLabel, { color: theme.text }]} numberOfLines={2}>{cat.name}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => router.push('/(tabs)/shop')} style={styles.viewCatalogBtn}>
            <Text style={styles.viewCatalogText}>View Entire Catalog <FontAwesome name="arrow-right" size={12} /></Text>
          </Pressable>
        </View>

        {/* Engineered for Trust */}
        <View style={[styles.section, { backgroundColor: theme.trustSectionBg, paddingVertical: 28, marginHorizontal: -16, paddingHorizontal: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.trustSectionBorder }]}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={styles.trustHeaderBadge}>
              <FontAwesome name="shield" size={12} color={Theme.primary} />
              <Text style={styles.trustHeaderBadgeText}>MULTI-LAYER PROTECTION</Text>
            </View>
            <Text style={[styles.sectionTitle, { textAlign: 'center', marginTop: 8, color: theme.text }]}>
              Engineered for <Text style={styles.italicPrimary}>Trust</Text>
            </Text>
            <Text style={[styles.trustDesc, { color: theme.textSecondary }]}>
              We've built a multi-layered security framework to protect both the buyer and the merchant at every step.
            </Text>
          </View>

          <View style={styles.trustCardsContainer}>
            {trustFeatures.map((f, i) => (
              <View key={i} style={[styles.trustCard, { backgroundColor: theme.trustCardBg, borderColor: theme.trustSectionBorder }]}>
                <View style={styles.trustImgBox}>
                  <Image source={f.image} style={styles.trustImg} resizeMode="cover" />
                  <View style={styles.trustImgOverlay} />
                  <View style={[styles.trustBadgePill, { backgroundColor: f.badgeBg, borderColor: f.badgeBorder }]}>
                    <Text style={[styles.trustBadgePillText, { color: f.badgeText }]}>{f.badge}</Text>
                  </View>
                </View>

                <View style={styles.trustCardBody}>
                  <Text style={[styles.trustCardTitle, { color: theme.trustCardTitle }]}>{f.title}</Text>
                  <Text style={[styles.trustCardDesc, { color: theme.textSecondary }]}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Ecosystem Partners */}
        <PartnersSection />

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
  catNav: { borderBottomWidth: 1, borderBottomColor: Theme.inputBorder, paddingVertical: 14, backgroundColor: '#fff' },
  catCircleItem: { alignItems: 'center', width: 68 },
  catCircle: { width: 60, height: 60, borderRadius: 18, backgroundColor: Theme.inputBg, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Theme.inputBorder },
  catCircleActive: { backgroundColor: Theme.primary, borderColor: Theme.primary },
  catCircleLabel: { fontSize: 11, fontWeight: '700', color: Theme.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 14 },
  catCircleLabelActive: { color: Theme.primary, fontWeight: '800' },
  
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
  
  catCircleGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, paddingHorizontal: 16, rowGap: 20 },
  catGridItem: { width: '25%', alignItems: 'center', paddingHorizontal: 4 },
  catGridCircle: { width: 78, height: 78, borderRadius: 22, overflow: 'hidden', backgroundColor: Theme.inputBg, borderWidth: 1, borderColor: Theme.inputBorder, ...Theme.shadowSm },
  catGridLabel: { fontSize: 11, fontWeight: '700', color: Theme.text, textAlign: 'center', marginTop: 6, lineHeight: 14 },
  viewCatalogBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, padding: 12 },
  viewCatalogText: { fontSize: 13, fontWeight: '700', color: Theme.primary, gap: 4 },
  
  trustHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Theme.primary + '30',
  },
  trustHeaderBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.primary,
    letterSpacing: 1,
  },
  trustDesc: {
    fontSize: 12,
    color: Theme.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  trustCardsContainer: {
    gap: 16,
  },
  trustCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    overflow: 'hidden',
    ...Theme.shadowSm,
  },
  trustImgBox: {
    width: '100%',
    height: 140,
    position: 'relative',
    backgroundColor: '#1c1917',
  },
  trustImg: {
    width: '100%',
    height: '100%',
  },
  trustImgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  trustBadgePill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  trustBadgePillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  trustCardBody: {
    padding: 16,
  },
  trustCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1c1917',
    marginBottom: 4,
  },
  trustCardDesc: {
    fontSize: 12,
    color: Theme.textSecondary,
    lineHeight: 18,
  },
  
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
