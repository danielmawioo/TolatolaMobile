import { validateProductForm, initialProductFormData } from '@/src/lib/productForm';

describe('validateProductForm', () => {
  const base = { ...initialProductFormData, name: 'Rice', price: '1000', stock_quantity: '10', category_id: 'cat-1' };

  it('passes with all required fields set', () => {
    expect(validateProductForm(base, false)).toBeNull();
  });

  it('requires name, price, and stock_quantity', () => {
    expect(validateProductForm({ ...base, name: '' }, false)).toBe(
      'Please fill in Name, Price, and Stock Quantity.'
    );
    expect(validateProductForm({ ...base, price: '' }, false)).toBe(
      'Please fill in Name, Price, and Stock Quantity.'
    );
    expect(validateProductForm({ ...base, stock_quantity: '' }, false)).toBe(
      'Please fill in Name, Price, and Stock Quantity.'
    );
  });

  it('requires a category', () => {
    expect(validateProductForm({ ...base, category_id: '' }, false)).toBe(
      'Please select a product category before uploading.'
    );
  });

  it('requires a weight unit for agricultural products', () => {
    expect(validateProductForm({ ...base, weight_unit: '' }, true)).toBe(
      'Please select a weight unit for agricultural products.'
    );
    expect(validateProductForm({ ...base, weight_unit: 'Kg' }, true)).toBeNull();
  });

  it('does not require a weight unit for non-agricultural products', () => {
    expect(validateProductForm({ ...base, weight_unit: '' }, false)).toBeNull();
  });
});
