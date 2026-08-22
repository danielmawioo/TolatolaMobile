import { useEffect, useState } from 'react';
import { apiGet } from '@/src/services/api';
import { logger } from '@/src/lib/logger';
import { initialProductFormData, classifyProductCategory } from '@/src/lib/productForm';
import type { ProductColor } from '@/src/hooks/useEditProductData';

/**
 * Owns the categories fetch, the vendor shop_id resolution fetch, and the full
 * form/image/color/size state for the vendor "create product" screen. Mirrors
 * useEditProductData's shape, minus the product-fetch-and-populate part since
 * there is no existing product to load here.
 */
export function useCreateProductData(accessToken: string | null | undefined) {
  const [categories, setCategories] = useState<any[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);

  const [images, setImages] = useState<string[]>([]);
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);

  const [parentCategoryId, setParentCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');

  const [formData, setFormData] = useState(initialProductFormData);

  useEffect(() => {
    if (!accessToken) return;

    // Load categories
    apiGet<any>('/categories')
      .then(res => {
        const cats = res?.data || res?.categories || [];
        setCategories(cats);
      })
      .catch(err => logger.error('Failed to load categories', err));

    // Load shop to resolve shop_id
    apiGet<any>('/vendor/shop', accessToken)
      .then(res => {
        const actualShop = res?.shops?.[0] || res?.data?.[0] || null;
        if (actualShop) {
          setShopId(actualShop.id);
        }
      })
      .catch(err => logger.error('Failed to load shop', err));
  }, [accessToken]);

  const classification = classifyProductCategory(categories, formData.category_id);
  const { isAgriculture } = classification;

  // Sold-by-weight only applies to agriculture products — clear a stale weight_unit
  // if the category changes away from agriculture.
  useEffect(() => {
    if (!isAgriculture && formData.weight_unit) {
      setFormData(prev => ({ ...prev, weight_unit: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAgriculture]);

  const selectedGradeLabel = formData.quality_grade === 'A' ? 'Grade A (Premium)' :
                             formData.quality_grade === 'B' ? 'Grade B (Standard)' :
                             formData.quality_grade === 'C' ? 'Grade C (Basic)' : '';

  return {
    categories,
    shopId,
    formData,
    setFormData,
    images,
    setImages,
    colors,
    setColors,
    sizes,
    setSizes,
    parentCategoryId,
    setParentCategoryId,
    subCategoryId,
    setSubCategoryId,
    selectedGradeLabel,
    ...classification,
  };
}
