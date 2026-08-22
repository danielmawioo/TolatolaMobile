import { validateProductForm, initialProductFormData, classifyProductCategory } from '@/src/lib/productForm';

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

describe('classifyProductCategory', () => {
  const categories = [
    { id: 'fashion', name: 'Fashion' },
    { id: 'men', parent_id: 'fashion', name: 'Men' },
    { id: 'agriculture', name: 'Agriculture' },
    { id: 'grains', parent_id: 'agriculture', name: 'Grains' },
    { id: 'vehicles', name: 'Vehicles' },
    { id: 'spare-parts', parent_id: 'vehicles', name: 'Spare Parts', slug: 'spare-parts' },
    { id: 'motorcycles', name: 'Motorcycles' },
    { id: 'ready-to-eat', name: 'Ready to Eat', slug: 'ready-to-eat' },
    { id: 'drinks', name: 'Drinks' },
    { id: 'electronics', name: 'Electronics' },
  ];

  it('classifies fashion via a top-level "Fashion" category or a men/women/kids subcategory', () => {
    expect(classifyProductCategory(categories, 'fashion').isFashion).toBe(true);
    expect(classifyProductCategory(categories, 'men').isFashion).toBe(true);
  });

  it('classifies agriculture only when the parent category is Agriculture', () => {
    expect(classifyProductCategory(categories, 'agriculture').isAgriculture).toBe(true);
    expect(classifyProductCategory(categories, 'grains').isAgriculture).toBe(true);
    expect(classifyProductCategory(categories, 'electronics').isAgriculture).toBe(false);
  });

  it('classifies vehicles for Vehicles and Motorcycles parents, including subcategories', () => {
    expect(classifyProductCategory(categories, 'vehicles').isVehicles).toBe(true);
    expect(classifyProductCategory(categories, 'spare-parts').isVehicles).toBe(true);
    expect(classifyProductCategory(categories, 'motorcycles').isVehicles).toBe(true);
  });

  it('classifies ready-to-eat by name or slug', () => {
    expect(classifyProductCategory(categories, 'ready-to-eat').isReadyToEat).toBe(true);
  });

  it('classifies drinks', () => {
    expect(classifyProductCategory(categories, 'drinks').isDrinks).toBe(true);
  });

  it('classifies nothing special for an unrelated category', () => {
    const result = classifyProductCategory(categories, 'electronics');
    expect(result).toMatchObject({
      isFashion: false,
      isAgriculture: false,
      isVehicles: false,
      isReadyToEat: false,
      isDrinks: false,
    });
  });

  it('returns undefined selected/parent categories for an unknown id', () => {
    const result = classifyProductCategory(categories, 'does-not-exist');
    expect(result.selectedCategory).toBeUndefined();
    expect(result.selectedParentCategory).toBeUndefined();
  });
});
