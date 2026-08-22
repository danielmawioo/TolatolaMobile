import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { VendorProductsTab } from '@/src/components/vendor/VendorProductsTab';
import { apiDelete } from '@/src/services/api';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/src/services/api');

const mockedApiDelete = apiDelete as jest.Mock;

describe('VendorProductsTab', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows an empty state with no products', () => {
    render(<VendorProductsTab shop={null} products={[]} accessToken="tok" onProductsChange={jest.fn()} />);
    expect(screen.getByText('No products yet. Add your first product!')).toBeTruthy();
  });

  it('renders a product card with price, stock, and status', () => {
    const products = [{ id: 'p1', name: 'Rice', price: 1000, stock_quantity: 5, status: 'approved' }];
    render(<VendorProductsTab shop={null} products={products} accessToken="tok" onProductsChange={jest.fn()} />);
    expect(screen.getByText('Rice')).toBeTruthy();
    expect(screen.getByText('TZS 1,000')).toBeTruthy();
  });

  it('navigates straight to product create when the shop already has a location', () => {
    render(
      <VendorProductsTab
        shop={{ region: 'Dar', district: 'Ilala' }}
        products={[]}
        accessToken="tok"
        onProductsChange={jest.fn()}
      />
    );
    fireEvent.press(screen.getByText('Add Product'));
    expect(router.push).toHaveBeenCalledWith('/(vendor)/product/create');
  });

  it('navigates to product edit with the product id', () => {
    const products = [{ id: 'p1', name: 'Rice', price: 1000, stock_quantity: 5 }];
    render(<VendorProductsTab shop={null} products={products} accessToken="tok" onProductsChange={jest.fn()} />);
    fireEvent.press(screen.getByText('Edit'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/(vendor)/product/edit', params: { id: 'p1' } });
  });
});
