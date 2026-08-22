/**
 * Shared shape and validation for the vendor product create/edit forms
 * (app/(vendor)/product/create.tsx and edit.tsx), which previously duplicated
 * this identically.
 */
export interface ProductFormData {
  name: string;
  price: string;
  description: string;
  stock_quantity: string;
  moq: string;
  category_id: string;
  quality_grade: string;
  location: string;
  weight_unit: string;
  // Vehicles fields
  vehicle_section: string; // vehicle | spare_part
  brand: string;
  model: string;
  year: string;
  mileage: string;
  transmission: string;
  fuel_type: string;
  engine_size: string;
  part_number: string;
  compatibility: string;
  condition: string;
  // Ready to eat
  dietary_info: string;
  prep_time: string;
  // Drinks
  drink_section: string;
}

export const initialProductFormData: ProductFormData = {
  name: '',
  price: '',
  description: '',
  stock_quantity: '',
  moq: '1',
  category_id: '',
  quality_grade: '',
  location: '',
  weight_unit: '',
  vehicle_section: '',
  brand: '',
  model: '',
  year: '',
  mileage: '',
  transmission: '',
  fuel_type: '',
  engine_size: '',
  part_number: '',
  compatibility: '',
  condition: '',
  dietary_info: '',
  prep_time: '',
  drink_section: '',
};

/**
 * Returns a user-facing error message if the form is invalid, or null if it's ready to submit.
 */
export function validateProductForm(
  formData: Pick<ProductFormData, 'name' | 'price' | 'stock_quantity' | 'category_id' | 'weight_unit'>,
  isAgriculture: boolean
): string | null {
  if (!formData.name || !formData.price || !formData.stock_quantity) {
    return 'Please fill in Name, Price, and Stock Quantity.';
  }
  if (!formData.category_id) {
    return 'Please select a product category before uploading.';
  }
  if (isAgriculture && !formData.weight_unit) {
    return 'Please select a weight unit for agricultural products.';
  }
  return null;
}

export interface ProductCategoryLike {
  id: string;
  parent_id?: string | null;
  name?: string;
  slug?: string;
}

export interface ProductCategoryClassification {
  selectedCategory: ProductCategoryLike | undefined;
  selectedParentCategory: ProductCategoryLike | undefined;
  isFashion: boolean;
  isAgriculture: boolean;
  isVehicles: boolean;
  isReadyToEat: boolean;
  isDrinks: boolean;
}

/**
 * Classifies the selected product category into the special-case category
 * groups the create/edit forms render extra fields for (fashion variations,
 * vehicle details, ready-to-eat info, drink type). Previously duplicated
 * identically in app/(vendor)/product/create.tsx and edit.tsx.
 */
export function classifyProductCategory(
  categories: ProductCategoryLike[],
  categoryId: string
): ProductCategoryClassification {
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedParentCategory = selectedCategory?.parent_id
    ? categories.find((c) => c.id === selectedCategory.parent_id)
    : selectedCategory;

  const isFashion =
    selectedParentCategory?.name?.toLowerCase() === 'fashion' ||
    selectedCategory?.name?.toLowerCase() === 'fashion' ||
    ['men', 'women', 'kids'].includes(selectedCategory?.name?.toLowerCase() || '') ||
    ['men', 'women', 'kids'].includes(selectedCategory?.slug?.toLowerCase() || '');
  const isAgriculture = selectedParentCategory?.name?.toLowerCase() === 'agriculture';
  const isVehicles =
    selectedParentCategory?.name?.toLowerCase() === 'vehicles' ||
    selectedParentCategory?.name?.toLowerCase() === 'motorcycles' ||
    selectedParentCategory?.name?.toLowerCase() === 'motorcyles';
  const isReadyToEat =
    selectedParentCategory?.name?.toLowerCase() === 'ready to eat' || selectedParentCategory?.slug === 'ready-to-eat';
  const isDrinks = selectedParentCategory?.name?.toLowerCase() === 'drinks';

  return { selectedCategory, selectedParentCategory, isFashion, isAgriculture, isVehicles, isReadyToEat, isDrinks };
}
