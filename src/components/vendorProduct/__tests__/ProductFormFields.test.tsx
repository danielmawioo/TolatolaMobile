import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ProductFormFields } from '@/src/components/vendorProduct/ProductFormFields';
import type { ProductCategoryLike } from '@/src/lib/productForm';

const CATEGORIES: ProductCategoryLike[] = [
  { id: 'cat-agri', name: 'Agriculture', parent_id: null },
  { id: 'cat-rice', name: 'Rice', parent_id: 'cat-agri' },
];

function renderFields(overrides: Partial<React.ComponentProps<typeof ProductFormFields>> = {}) {
  const props: React.ComponentProps<typeof ProductFormFields> = {
    name: '',
    onNameChange: jest.fn(),
    price: '',
    onPriceChange: jest.fn(),
    stockQuantity: '',
    onStockQuantityChange: jest.fn(),
    categories: CATEGORIES,
    parentCategoryId: '',
    subCategoryId: '',
    selectedGradeLabel: '',
    onCategoryPress: jest.fn(),
    onGradePress: jest.fn(),
    onSubcategoryPress: jest.fn(),
    ...overrides,
  };
  const utils = render(<ProductFormFields {...props} />);
  return { ...utils, props };
}

describe('ProductFormFields', () => {
  it('renders the name, price, and stock quantity fields with the passed-in values', () => {
    renderFields({ name: 'Premium Rice', price: '10000', stockQuantity: '5' });

    expect(screen.getByText('Product Name *')).toBeTruthy();
    expect(screen.getByDisplayValue('Premium Rice')).toBeTruthy();
    expect(screen.getByText('Price (TZS) *')).toBeTruthy();
    expect(screen.getByDisplayValue('10000')).toBeTruthy();
    expect(screen.getByText('Stock Quantity *')).toBeTruthy();
    expect(screen.getByDisplayValue('5')).toBeTruthy();
  });

  it('resolves the category picker label against the categories list', () => {
    renderFields({ parentCategoryId: 'cat-agri' });

    expect(screen.getByText('Category *')).toBeTruthy();
    expect(screen.getByText('Agriculture')).toBeTruthy();
  });

  it('shows the placeholder text when no category or grade is selected', () => {
    renderFields();

    expect(screen.getByText('Select Category')).toBeTruthy();
    expect(screen.getByText('Select Grade')).toBeTruthy();
  });

  it('shows the selected grade label when provided', () => {
    renderFields({ selectedGradeLabel: 'Grade A (Premium)' });

    expect(screen.getByText('Grade A (Premium)')).toBeTruthy();
  });

  it('calls onNameChange, onPriceChange, and onStockQuantityChange when typing into the respective fields', () => {
    const onNameChange = jest.fn();
    const onPriceChange = jest.fn();
    const onStockQuantityChange = jest.fn();
    renderFields({ onNameChange, onPriceChange, onStockQuantityChange });

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Premium Basmati Rice'), 'New Name');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 10000'), '20000');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 100'), '7');

    expect(onNameChange).toHaveBeenCalledWith('New Name');
    expect(onPriceChange).toHaveBeenCalledWith('20000');
    expect(onStockQuantityChange).toHaveBeenCalledWith('7');
  });

  it('calls onCategoryPress and onGradePress when their picker buttons are tapped', () => {
    const onCategoryPress = jest.fn();
    const onGradePress = jest.fn();
    renderFields({ onCategoryPress, onGradePress });

    fireEvent.press(screen.getByText('Select Category'));
    fireEvent.press(screen.getByText('Select Grade'));

    expect(onCategoryPress).toHaveBeenCalledTimes(1);
    expect(onGradePress).toHaveBeenCalledTimes(1);
  });

  it('does not render the subcategory picker when the selected category has no subcategories', () => {
    // Mirrors the create/edit screens' existing condition for showing the
    // subcategory picker: categories.filter(c => c.parent_id === parentCategoryId).length > 0
    renderFields({ parentCategoryId: 'cat-rice' });

    expect(screen.queryByText('Subcategory *')).toBeNull();
  });

  it('renders the subcategory picker and calls onSubcategoryPress when the selected category has subcategories', () => {
    const onSubcategoryPress = jest.fn();
    renderFields({ parentCategoryId: 'cat-agri', subCategoryId: 'cat-rice', onSubcategoryPress });

    expect(screen.getByText('Subcategory *')).toBeTruthy();
    // Subcategory picker resolves the selected id against the categories list.
    expect(screen.getByText('Rice')).toBeTruthy();

    fireEvent.press(screen.getByText('Rice'));
    expect(onSubcategoryPress).toHaveBeenCalledTimes(1);
  });

  it('shows the subcategory placeholder when no subcategory is selected yet', () => {
    renderFields({ parentCategoryId: 'cat-agri' });

    expect(screen.getByText('Select Subcategory')).toBeTruthy();
  });
});
