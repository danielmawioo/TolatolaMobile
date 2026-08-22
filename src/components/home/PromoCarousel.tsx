import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { OptimizedImage } from '@/components/OptimizedImage';
import type { Banner } from '@/src/types';

const { width } = Dimensions.get('window');

interface PromoCarouselProps {
  promotions: Banner[];
}

export function PromoCarousel({ promotions }: PromoCarouselProps) {
  const sliderRef = useRef<FlatList>(null);
  const currentSlide = useRef(0);

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

  if (promotions.length === 0) return null;

  return (
    <FlatList
      ref={sliderRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      data={promotions}
      keyExtractor={(p: any) => p.id.toString()}
      style={styles.heroSlider}
      getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
      onMomentumScrollEnd={(event) => {
        const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
        currentSlide.current = newIndex;
      }}
      renderItem={({ item }: { item: any }) => (
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
  );
}

const styles = StyleSheet.create({
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
});
