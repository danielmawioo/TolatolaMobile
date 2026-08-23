import { useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { apiPut } from '@/src/services/api';
import { ProductInputSchema } from '@/src/schemas/product';
import type { EditProductFormData, ProductColor } from '@/src/hooks/useEditProductData';

export interface ProductCategoryFlags {
  isFashion: boolean;
  isAgriculture: boolean;
  isVehicles: boolean;
  isReadyToEat: boolean;
  isDrinks: boolean;
}

/**
 * Builds the PUT /products/:id request body from the edit form's state. Pulled out
 * as a pure function (no side effects) so the mapping/nulling rules for each
 * category-specific field group are easy to unit test in isolation.
 */
export function buildProductUpdatePayload(
  formData: EditProductFormData,
  images: string[],
  colors: ProductColor[],
  sizes: string[],
  flags: ProductCategoryFlags
) {
  const { isFashion, isAgriculture, isVehicles, isReadyToEat, isDrinks } = flags;

  return {
    ...formData,
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
    updated_at: new Date().toISOString(),
  };
}

interface UseUpdateProductSubmitParams {
  id: string | undefined;
  accessToken: string | null | undefined;
  formData: EditProductFormData;
  images: string[];
  colors: ProductColor[];
  sizes: string[];
  flags: ProductCategoryFlags;
}

export function useUpdateProductSubmit(params: UseUpdateProductSubmitParams) {
  const [saving, setSaving] = useState(false);

  const handleUpdate = async () => {
    const { id, accessToken, formData, images, colors, sizes, flags } = params;

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

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await apiPut(`/products/${id}`, buildProductUpdatePayload(formData, images, colors, sizes, flags), accessToken);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Product updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  return { saving, handleUpdate };
}
