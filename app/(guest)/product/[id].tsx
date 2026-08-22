import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useProductDetailData } from '@/src/hooks/useProductDetailData';
import { ProductGallery } from '@/src/components/productDetail/ProductGallery';
import { ProductHeaderInfo } from '@/src/components/productDetail/ProductHeaderInfo';
import { VariantSelector } from '@/src/components/productDetail/VariantSelector';
import { PriceBuyBox } from '@/src/components/productDetail/PriceBuyBox';
import { MerchantCard } from '@/src/components/productDetail/MerchantCard';
import { ProductMetadataSection } from '@/src/components/productDetail/ProductMetadataSection';
import { ReviewsSection } from '@/src/components/productDetail/ReviewsSection';
import { RecommendationsRow } from '@/src/components/productDetail/RecommendationsRow';
import { AddToCartBar } from '@/src/components/productDetail/AddToCartBar';

export default function GuestProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const {
    product,
    reviews,
    loading,
    quantity,
    setQuantity,
    adding,
    activeImageIndex,
    setActiveImageIndex,
    selectedColor,
    setSelectedColor,
    selectedSize,
    setSelectedSize,
    recommendations,
    scrollViewRef,
    setTestimonyY,
    scrollToTestimony,
    resolvedPrice,
    handleAddToCart,
    images,
    galleryImages,
    averageRating,
    isInCart,
    isSoldOut,
    productLocation,
  } = useProductDetailData(id);

  if (loading || !product) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16, justifyContent: 'center', alignItems: 'center' }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome name="chevron-left" size={16} color={Theme.text} />
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator size="large" color={Theme.primary} />
        ) : (
          <Text style={styles.muted}>Product not found</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 16), paddingBottom: 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ProductGallery
          images={images}
          galleryImages={galleryImages}
          activeImageIndex={activeImageIndex}
          onActiveImageIndexChange={setActiveImageIndex}
        />

        <View style={styles.infoContainer}>
          <ProductHeaderInfo
            product={product}
            averageRating={averageRating}
            reviewsCount={reviews.length}
            productLocation={productLocation}
            onPressRating={scrollToTestimony}
          />

          <VariantSelector
            product={product}
            selectedColor={selectedColor}
            onSelectColor={setSelectedColor}
            selectedSize={selectedSize}
            onSelectSize={setSelectedSize}
          />

          <PriceBuyBox
            product={product}
            resolvedPrice={resolvedPrice}
            quantity={quantity}
            onChangeQuantity={setQuantity}
            isSoldOut={isSoldOut}
          />

          <MerchantCard />

          <ProductMetadataSection product={product} productLocation={productLocation} />

          <ReviewsSection reviews={reviews} onLayout={(e) => setTestimonyY(e.nativeEvent.layout.y)} />

          <RecommendationsRow recommendations={recommendations} />
        </View>
      </ScrollView>

      <AddToCartBar
        adding={adding}
        isSoldOut={isSoldOut}
        isInCart={isInCart}
        bottomInset={insets.bottom}
        onPress={handleAddToCart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingHorizontal: 16, marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f5f4', alignItems: 'center', justifyContent: 'center' },
  muted: { color: Theme.textMuted, padding: 24, textAlign: 'center' },
  content: { paddingBottom: 24 },
  infoContainer: { padding: 20, gap: 20, paddingTop: 16 },
});
