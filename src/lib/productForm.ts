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
