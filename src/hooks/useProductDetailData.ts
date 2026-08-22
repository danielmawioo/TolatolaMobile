import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { apiGet } from '@/src/services/api';
import { logger } from '@/src/lib/logger';
import { useCart } from '@/src/contexts/CartContext';
import type { Product } from '@/src/types';

export type ProductColor = NonNullable<Product['colors']>[number];

export interface ProductReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  users?: { full_name: string };
}

/**
 * Owns product/review/recommendation fetching, color/size/quantity selection,
 * derived pricing & availability, and the add-to-cart flow for the guest
 * product detail screen.
 */
export function useProductDetailData(id: string | undefined) {
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const [testimonyY, setTestimonyY] = useState(0);

  const { addItem, items } = useCart();

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [productData, reviewsData] = await Promise.all([
          apiGet<{ data: Product }>(`/products/${id}`),
          apiGet<{ data: ProductReview[] }>(`/products/${id}/reviews`).catch(() => ({ data: [] })),
        ]);
        const actualProduct = productData?.data || (productData as unknown as Product);
        setProduct(actualProduct);
        setReviews(reviewsData?.data || []);
        setQuantity(actualProduct?.moq ? Number(actualProduct.moq) : 1);

        if (actualProduct?.colors && Array.isArray(actualProduct.colors) && actualProduct.colors.length > 0) {
          setSelectedColor(actualProduct.colors[0]);
        }
        if (actualProduct?.sizes && Array.isArray(actualProduct.sizes) && actualProduct.sizes.length > 0) {
          setSelectedSize(actualProduct.sizes[0]);
        }
      } catch (err) {
        logger.warn('Failed to load product detail', err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    apiGet<{ data: Product[] }>(`/products/${id}/recommendations`)
      .then(res => setRecommendations(res?.data || []))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedColor]);

  const scrollToTestimony = useCallback(() => {
    if (scrollViewRef.current && testimonyY > 0) {
      scrollViewRef.current.scrollTo({ y: testimonyY - 20, animated: true });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [testimonyY]);

  const isFashion =
    product?.categories?.name?.toLowerCase() === 'fashion' ||
    product?.category_name?.toLowerCase() === 'fashion' ||
    ['men', 'women', 'kids'].includes(product?.categories?.name?.toLowerCase() || '') ||
    ['men', 'women', 'kids'].includes(product?.category_name?.toLowerCase() || '') ||
    (product?.colors && product.colors.length > 0) ||
    (product?.sizes && product.sizes.length > 0);

  const resolvedPrice =
    isFashion && selectedSize && product?.size_prices?.[selectedSize]
      ? Number(product.size_prices[selectedSize])
      : isFashion && selectedColor?.price
        ? Number(selectedColor.price)
        : Number(product?.price || 0);

  const handleAddToCart = useCallback(async () => {
    if (!product) return;
    setAdding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const productWithResolvedPrice = {
      ...product,
      price: resolvedPrice,
    };
    await addItem(productWithResolvedPrice, quantity, selectedColor, selectedSize || undefined);
    setAdding(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/(tabs)/cart');
  }, [product, resolvedPrice, addItem, quantity, selectedColor, selectedSize]);

  const images = product && product.images && Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [product?.image_url];

  const galleryImages = [...images];
  if (selectedColor?.image && !galleryImages.includes(selectedColor.image)) {
    galleryImages.unshift(selectedColor.image);
  }

  const averageRating =
    reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 5.0;

  const isInCart = !!product && items.some(
    item =>
      item.product_id === product.id &&
      (!product.colors || !Array.isArray(product.colors) || product.colors.length === 0 || item.selected_color?.name === selectedColor?.name) &&
      (!product.sizes || !Array.isArray(product.sizes) || product.sizes.length === 0 || item.selected_size === selectedSize)
  );
  const isSoldOut = product?.stock_quantity === 0;
  const productLocation =
    (product as any)?.location ||
    [(product as any)?.shops?.ward, (product as any)?.shops?.district, (product as any)?.shops?.region].filter(Boolean).join(', ') ||
    (product as any)?.shops?.address ||
    (product as any)?.shops?.region ||
    null;

  return {
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
    testimonyY,
    setTestimonyY,
    scrollToTestimony,
    isFashion,
    resolvedPrice,
    handleAddToCart,
    images,
    galleryImages,
    averageRating,
    isInCart,
    isSoldOut,
    productLocation,
  };
}
