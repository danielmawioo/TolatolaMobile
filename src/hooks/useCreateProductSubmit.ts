import { useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { apiPost } from '@/src/services/api';
import type { ProductFormData } from '@/src/lib/productForm';
import { ProductInputSchema } from '@/src/schemas/product';
import type { ProductColor } from '@/src/hooks/useEditProductData';
import type { ProductCategoryFlags } from '@/src/hooks/useUpdateProductSubmit';

/**
 * Builds the POST /products request body from the create form's state. Pulled out
 * as a pure function (no side effects), mirroring buildProductUpdatePayload, so the
 * mapping/nulling rules for each category-specific field group are easy to unit
 * test in isolation.
 */
export function buildProductCreatePayload(
  formData: ProductFormData,
  shopId: string,
  images: string[],
  colors: ProductColor[],
  sizes: string[],
  flags: ProductCategoryFlags
) {
  const { isFashion, isAgriculture, isVehicles, isReadyToEat, isDrinks } = flags;

  return {
    ...formData,
    shop_id: shopId,
    price: parseFloat(formData.price),
    stock_quantity: parseInt(formData.stock_quantity),
    moq: parseInt(formData.moq) || 1,
    images,
    category_id: formData.category_id || null,
    quality_grade: formData.quality_grade || null,
    colors: isFashion ? colors : null,
    sizes: isFashion ? sizes : null,
    weight_unit: isAgriculture && formData.weight_unit ? formData.weight_unit : null,
    vehicle_section: isVehicles ? (formData.vehicle_section || null) : null,
    brand: isVehicles ? (formData.brand || null) : null,
    condition: isVehicles ? (formData.condition || null) : null,
    model: (isVehicles && (formData.vehicle_section === 'vehicle' || formData.vehicle_section === 'spare_part')) ? (formData.model || null) : null,
    year: (isVehicles && formData.vehicle_section === 'vehicle' && formData.year) ? parseInt(formData.year) : null,
    mileage: (isVehicles && formData.vehicle_section === 'vehicle' && formData.mileage) ? parseInt(formData.mileage) : null,
    transmission: (isVehicles && formData.vehicle_section === 'vehicle') ? (formData.transmission || null) : null,
    fuel_type: (isVehicles && formData.vehicle_section === 'vehicle') ? (formData.fuel_type || null) : null,
    engine_size: (isVehicles && formData.vehicle_section === 'vehicle') ? (formData.engine_size || null) : null,
    part_number: (isVehicles && formData.vehicle_section === 'spare_part') ? (formData.part_number || null) : null,
    compatibility: (isVehicles && formData.vehicle_section === 'spare_part') ? (formData.compatibility || null) : null,
    dietary_info: isReadyToEat ? (formData.dietary_info || null) : null,
    prep_time: isReadyToEat ? (formData.prep_time || null) : null,
    drink_section: isDrinks ? (formData.drink_section || null) : null,
  };
}

interface UseCreateProductSubmitParams {
  accessToken: string | null | undefined;
  shopId: string | null;
  formData: ProductFormData;
  images: string[];
  colors: ProductColor[];
  sizes: string[];
  flags: ProductCategoryFlags;
}

export function useCreateProductSubmit(params: UseCreateProductSubmitParams) {
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const { accessToken, shopId, formData, images, colors, sizes, flags } = params;

    const parsedInput = ProductInputSchema.safeParse(formData);
    if (!parsedInput.success) {
      Alert.alert('Error', parsedInput.error.issues[0].message);
      return;
    }
    // Not part of the schema: weight_unit is only required when the selected
    // category classifies as agriculture, which depends on category lookups
    // outside the form data itself.
    if (flags.isAgriculture && !formData.weight_unit) {
      Alert.alert('Error', 'Please select a weight unit for agricultural products.');
      return;
    }

    if (!shopId) {
      Alert.alert('Error', 'Vendor shop details could not be resolved. Please try again.');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await apiPost('/products', buildProductCreatePayload(formData, shopId, images, colors, sizes, flags), accessToken);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Product created successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return { loading, handleCreate };
}
