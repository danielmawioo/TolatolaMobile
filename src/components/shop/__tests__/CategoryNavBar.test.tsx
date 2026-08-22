import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CategoryNavBar } from '@/src/components/shop/CategoryNavBar';

const theme = {
  background: '#fff',
  border: '#eee',
  textSecondary: '#333',
  catCircleBg: '#f5f5f5',
  catCircleBorder: '#eee',
};

const categories = [
  { id: 'c1', name: 'Electronics', parent_id: null },
  { id: 'c2', name: 'Phones', parent_id: 'c1' },
  { id: 'c3', name: 'Fashion', parent_id: null },
];

describe('CategoryNavBar', () => {
  it('renders the "All" pill plus every top-level category', () => {
    render(
      <CategoryNavBar categories={categories} selectedCategory={null} onSelectCategory={jest.fn()} theme={theme} />
    );

    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('Electronics')).toBeTruthy();
    expect(screen.getByText('Fashion')).toBeTruthy();
    // Subcategory pills should not render until a parent category is selected.
    expect(screen.queryByText('Phones')).toBeNull();
  });

  it('shows the subcategory pill row when a parent category is selected', () => {
    render(
      <CategoryNavBar categories={categories} selectedCategory="c1" onSelectCategory={jest.fn()} theme={theme} />
    );

    expect(screen.getByText('All Electronics')).toBeTruthy();
    expect(screen.getByText('Phones')).toBeTruthy();
  });

  it('calls onSelectCategory with the category id when a category circle is pressed', () => {
    const onSelectCategory = jest.fn();
    render(
      <CategoryNavBar categories={categories} selectedCategory={null} onSelectCategory={onSelectCategory} theme={theme} />
    );

    fireEvent.press(screen.getByText('Electronics'));
    expect(onSelectCategory).toHaveBeenCalledWith('c1');

    fireEvent.press(screen.getByText('All'));
    expect(onSelectCategory).toHaveBeenCalledWith(null);
  });
});
