import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { apiGet } from '@/src/services/api';
import { logger } from '@/src/lib/logger';
import { initialProductFormData, classifyProductCategory, type ProductFormData } from '@/src/lib/productForm';

export interface ProductColor {
  name: string;
  image: string;
}

export interface EditProductFormData extends ProductFormData {
  delivery_available: boolean;
}

/**
 * Owns the initial fetch (categories + product details) for the vendor "edit product"
 * screen, and the full form state it populates. Mirrors the useAgentDashboardData
 * "hook owns data-fetching state" pattern.
 */
export function useEditProductData(id: string | undefined, accessToken: string | null | undefined) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);

  const [images, setImages] = useState<string[]>([]);
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);

  const [parentCategoryId, setParentCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');

  const [formData, setFormData] = useState<EditProductFormData>({ ...initialProductFormData, delivery_available: true });

  useEffect(() => {
    if (!id || !accessToken) return;

    (async () => {
      try {
        // Fetch categories and product details
        const [catsRes, productRes] = await Promise.all([
          apiGet<any>('/categories'),
          apiGet<any>(`/products/${id}`, accessToken)
        ]);

        const cats = catsRes?.data || catsRes?.categories || [];
        setCategories(cats);

        const product = productRes?.data || productRes || {};

        setFormData({
          name: product.name || '',
          price: product.price?.toString() || '',
          description: product.description || '',
          location: product.location || '',
          moq: product.moq?.toString() || '1',
          stock_quantity: product.stock_quantity?.toString() || '0',
          category_id: product.category_id || '',
          quality_grade: product.quality_grade || '',
          delivery_available: product.delivery_available ?? true,
          weight_unit: product.weight_unit || '',
          vehicle_section: product.vehicle_section || '',
          brand: product.brand || '',
          model: product.model || '',
          year: product.year?.toString() || '',
          mileage: product.mileage?.toString() || '',
          transmission: product.transmission || '',
          fuel_type: product.fuel_type || '',
          engine_size: product.engine_size || '',
          part_number: product.part_number || '',
          compatibility: product.compatibility || '',
          condition: product.condition || '',
          dietary_info: product.dietary_info || '',
          prep_time: product.prep_time || '',
          drink_section: product.drink_section || '',
        });

        setImages(product.images || []);
        setColors(product.colors || []);
        setSizes(product.sizes || []);

        // Resolve parent and subcategory
        const cat = cats.find((c: any) => c.id === product.category_id);
        if (cat) {
          if (cat.parent_id) {
            setParentCategoryId(cat.parent_id);
            setSubCategoryId(cat.id);
            // Auto-derive vehicle_section from subcategory slug on load
            if (cat.slug === 'spare-parts') {
              setFormData(f => ({ ...f, vehicle_section: 'spare_part' }));
            } else if (cat.slug === 'vehicles-sub') {
              setFormData(f => ({ ...f, vehicle_section: 'vehicle' }));
            } else if (cat.slug === 'non-alcoholic') {
              setFormData(f => ({ ...f, drink_section: 'non_alcoholic' }));
            } else if (cat.slug === 'alcoholic') {
              setFormData(f => ({ ...f, drink_section: 'alcoholic' }));
            }
          } else {
            setParentCategoryId(cat.id);
            setSubCategoryId('');
          }
        } else {
          setParentCategoryId('');
          setSubCategoryId('');
        }
      } catch (error: any) {
        logger.error('Failed to load edit product details', error);
        Alert.alert('Error', 'Failed to fetch product details');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id, accessToken]);

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
    loading,
    categories,
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
