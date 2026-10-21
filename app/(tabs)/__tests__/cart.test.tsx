import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CartScreen from '@/app/(tabs)/cart';
import { useCart } from '@/src/contexts/CartContext';

jest.mock('@/src/contexts/CartContext', () => ({
  useCart: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/components/OptimizedImage', () => ({
  OptimizedImage: () => null,
}));

const mockedUseCart = useCart as jest.Mock;

const item = {
  id: 'ci-1',
  product_id: 'p-1',
  name: 'Rice',
  price: 1000,
  quantity: 2,
  image_url: 'https://example.com/rice.png',
  shop_id: 'shop-1',
};

function mockCart(items: typeof item[] | [], isLoading = false) {
  const removeItem = jest.fn();
  const updateQuantity = jest.fn();
  mockedUseCart.mockReturnValue({
    items,
    isLoading,
    removeItem,
    updateQuantity,
    totalAmount: items.reduce((sum, row) => sum + row.price * row.quantity, 0),
    clearCart: jest.fn(),
  });
  return { removeItem, updateQuantity };
}

describe('CartScreen', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the empty-cart state', () => {
    mockCart([]);
    render(<CartScreen />);
    expect(screen.getByText('Your cart is empty')).toBeTruthy();
    expect(screen.getByText('Add some quality items to get started!')).toBeTruthy();
  });

  it('updates quantity and removes a line', () => {
    const { updateQuantity, removeItem } = mockCart([item]);
    render(<CartScreen />);

    expect(screen.getByText('Rice')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();

    fireEvent.press(screen.getByTestId('cart-qty-increase-ci-1'));
    fireEvent.press(screen.getByTestId('cart-qty-decrease-ci-1'));
    fireEvent.press(screen.getByTestId('cart-remove-ci-1'));

    expect(updateQuantity).toHaveBeenNthCalledWith(1, 'ci-1', 3);
    expect(updateQuantity).toHaveBeenNthCalledWith(2, 'ci-1', 1);
    expect(removeItem).toHaveBeenCalledWith('ci-1');
  });
});
