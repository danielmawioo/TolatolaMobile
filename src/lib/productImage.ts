import type { Product } from '@/src/types';

/**
 * Square product-card fallbacks (Unsplash) when API has no image — stable pick per id.
 * Same spirit as home hero mocks; sized for grid thumbnails.
 */
const MOCK_PRODUCT_IMAGE_URLS = [
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1556910096-6f5e72db6803?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1615486511484-92e172cc4fe0?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop&q=80',
] as const;

export function getMockProductImageUrl(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return MOCK_PRODUCT_IMAGE_URLS[h % MOCK_PRODUCT_IMAGE_URLS.length];
}

/**
 * Resolve display image URL for a product per API spec:
 * 1. product.images?.[0] (if string) or product.images?.[0]?.url (if object)
 * 2. product.image_url
 * 3. product.primary_image_url
 */
export function getProductImageUrl(product: Product | null | undefined): string | null {
  if (!product) return null;
  const first = product.images?.[0];
  if (first != null) {
    const url = typeof first === 'string' ? first : (first as { url?: string })?.url;
    if (url) return url;
  }
  if (product.image_url) return product.image_url;
  if (product.primary_image_url) return product.primary_image_url;
  return null;
}
