import { z } from 'zod';

/**
 * Input validation for the vendor product create/edit forms (`ProductFormData`
 * in src/lib/productForm.ts, and its edit-screen extension `EditProductFormData`
 * which adds `delivery_available`). Unlike the response schemas in
 * src/api/schemas.ts, this validates data coming FROM the user, so it's strict
 * rather than lenient: `price`/`stock_quantity` are form-state strings (all
 * form fields are strings) that must actually parse to valid numbers, not just
 * be non-empty — the previous hand-rolled `validateProductForm` only checked
 * truthiness, so a stray currency symbol or pasted text passed validation and
 * was then sent to the backend as `NaN` via `parseFloat`/`parseInt`.
 *
 * `.passthrough()` because both the create form and the edit form carry many
 * more fields (category-specific groups: fashion, vehicles, ready-to-eat,
 * drinks, ...) than the ones required here; this only guards the fields every
 * product must have regardless of category. The one deliberately-excluded
 * cross-field rule is `weight_unit` being required when the selected category
 * is agriculture — that depends on category classification computed outside
 * the form data (`classifyProductCategory`), so it stays a small manual check
 * next to this schema in the create/update submit hooks, same as before.
 */

const isPositiveFiniteNumberString = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed === '') return false;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0;
};

const isNonNegativeIntegerString = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed === '') return false;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 0;
};

export const ProductInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Please fill in Name, Price, and Stock Quantity.'),
    price: z
      .string()
      .refine(isPositiveFiniteNumberString, { message: 'Please enter a valid price greater than 0.' }),
    stock_quantity: z
      .string()
      .refine(isNonNegativeIntegerString, { message: 'Please enter a valid whole number for stock quantity.' }),
    category_id: z.string().trim().min(1, 'Please select a product category before uploading.'),
  })
  .passthrough();

export type ProductInput = z.infer<typeof ProductInputSchema>;

// The create and edit forms share the exact same required fields today (the
// edit form only adds `delivery_available`, which isn't part of this input
// validation), so a single schema covers both submit hooks.
export const CreateProductInputSchema = ProductInputSchema;
export const UpdateProductInputSchema = ProductInputSchema;
