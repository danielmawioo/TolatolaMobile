import React from 'react';
import { View, ScrollView, Pressable, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { OptimizedImage } from '@/components/OptimizedImage';
import { Theme } from '@/constants/Theme';

const { width } = Dimensions.get('window');

interface ProductGalleryProps {
  images: (string | null | undefined)[];
  galleryImages: (string | null | undefined)[];
  activeImageIndex: number;
  onActiveImageIndexChange: (index: number) => void;
}

/**
 * Cinematic image carousel for the product detail hero: paginated horizontal
 * scroll view, dot pagination, and the floating back button.
 */
export function ProductGallery({
  images,
  galleryImages,
  activeImageIndex,
  onActiveImageIndexChange,
}: ProductGalleryProps) {
  return (
    <View style={styles.galleryContainer}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const slide = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
          if (slide !== activeImageIndex) onActiveImageIndexChange(slide);
        }}
        scrollEventThrottle={16}
      >
        {galleryImages.map((img, idx) => (
          <View key={idx} style={{ width: width - 32, aspectRatio: 1 }}>
            <OptimizedImage source={img} width="100%" aspectRatio={1} />
          </View>
        ))}
      </ScrollView>

      <Pressable onPress={() => router.back()} style={styles.backBtnFloat}>
        <FontAwesome name="chevron-left" size={16} color={Theme.text} />
      </Pressable>

      {images.length > 1 && (
        <View style={styles.pagination}>
          {images.map((_, idx) => (
            <View key={idx} style={[styles.dot, activeImageIndex === idx && styles.activeDot]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  galleryContainer: { width: width - 32, marginHorizontal: 16, aspectRatio: 1, position: 'relative', backgroundColor: '#fafaf9', borderRadius: 24, overflow: 'hidden' },
  backBtnFloat: { position: 'absolute', top: 16, left: 16, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  pagination: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.15)' },
  activeDot: { backgroundColor: Theme.primary, width: 12 },
});
