import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartProvider, useCart } from '@/src/contexts/CartContext';
import { apiPost } from '@/src/services/api';

// CartContext imports useAuth via a relative path ('./AuthContext'), which
// resolves to the same module as the '@/' alias below — mocking either path
// intercepts the same underlying module in Jest's module registry.
const mockUseAuth = jest.fn();
jest.mock('@/src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/src/services/api');

const mockedApiPost = apiPost as jest.Mock;

// Mirrors the private CART_STORAGE_KEY constant inside CartContext.tsx.
const CART_STORAGE_KEY = '@tolatola/cart';

const guestAuth = {
  session: null,
  isLoading: false,
  isAuthenticated: false,
  accessToken: null,
  user: null,
  login: jest.fn(),
  signup: jest.fn(),
  logout: jest.fn(),
  setSession: jest.fn(),
  switchRole: jest.fn(),
};

const authenticatedAuth = {
  ...guestAuth,
  session: { access_token: 'tok-abc', refresh_token: 'refresh-abc', expires_at: 9999999999 },
  isAuthenticated: true,
  accessToken: 'tok-abc',
  user: { id: 'u1' },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

const productA = {
  id: 'p1',
  name: 'Widget',
  price: 100,
  images: ['widget.png'],
  shop_id: 'shop1',
  shops: { latitude: 1.23, longitude: 4.56 },
};

const productB = {
  id: 'p2',
  name: 'Gadget',
  price: 50,
  image_url: 'gadget.png',
  shop_id: 'shop2',
};

async function renderReadyCart() {
  const { result } = renderHook(() => useCart(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result;
}

describe('CartContext', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(guestAuth);
    await AsyncStorage.clear();
  });

  it('throws when useCart is used outside of a CartProvider', () => {
    expect(() => renderHook(() => useCart())).toThrow(
      'useCart must be used within CartProvider'
    );
  });

  it('starts with an empty cart when nothing is persisted', async () => {
    const result = await renderReadyCart();

    expect(result.current.items).toEqual([]);
    expect(result.current.totalAmount).toBe(0);
    expect(result.current.itemCount).toBe(0);
  });

  it('loads a previously persisted cart from AsyncStorage on mount', async () => {
    const persisted = [
      { id: 'p1--', product_id: 'p1', name: 'Widget', price: 100, quantity: 2 },
    ];
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(persisted));

    const result = await renderReadyCart();

    expect(result.current.items).toEqual(persisted);
    expect(result.current.itemCount).toBe(2);
    expect(result.current.totalAmount).toBe(200);
  });

  it('recovers gracefully when loading the persisted cart fails', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk error'));

    const result = await renderReadyCart();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.items).toEqual([]);
  });

  it('adds a new item to the cart and persists it locally', async () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
    const result = await renderReadyCart();

    await act(async () => {
      await result.current.addItem(productA);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toMatchObject({
      id: 'p1--',
      product_id: 'p1',
      name: 'Widget',
      price: 100,
      quantity: 1,
      image_url: 'widget.png',
      shop_id: 'shop1',
      shop_latitude: 1.23,
      shop_longitude: 4.56,
      selected_color: null,
      selected_size: null,
    });
    expect(result.current.totalAmount).toBe(100);
    expect(result.current.itemCount).toBe(1);

    expect(setItemSpy).toHaveBeenCalledWith(
      CART_STORAGE_KEY,
      JSON.stringify(result.current.items)
    );
  });

  it('defaults image_url from the selected color when one is provided', async () => {
    const result = await renderReadyCart();
    const color = { name: 'Red', image: 'red.png' };

    await act(async () => {
      await result.current.addItem(productA, 1, color, 'M');
    });

    expect(result.current.items[0]).toMatchObject({
      id: 'p1-Red-M',
      image_url: 'red.png',
      selected_color: color,
      selected_size: 'M',
    });
  });

  it('increments quantity instead of duplicating when the same product/color/size is added again', async () => {
    const result = await renderReadyCart();

    await act(async () => {
      await result.current.addItem(productA, 2);
    });
    await act(async () => {
      await result.current.addItem(productA, 3);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(5);
    expect(result.current.itemCount).toBe(5);
    expect(result.current.totalAmount).toBe(500);
  });

  it('treats different colors/sizes of the same product as separate line items', async () => {
    const result = await renderReadyCart();
    const red = { name: 'Red' };
    const blue = { name: 'Blue' };

    await act(async () => {
      await result.current.addItem(productA, 1, red);
    });
    await act(async () => {
      await result.current.addItem(productA, 1, blue);
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.itemCount).toBe(2);
  });

  it('sums totalAmount and itemCount correctly across multiple distinct items', async () => {
    const result = await renderReadyCart();

    await act(async () => {
      await result.current.addItem(productA, 2); // 100 * 2 = 200
    });
    await act(async () => {
      await result.current.addItem(productB, 3); // 50 * 3 = 150
    });

    expect(result.current.itemCount).toBe(5);
    expect(result.current.totalAmount).toBe(350);
  });

  it('syncs to the backend cart when the user is authenticated', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth);
    mockedApiPost.mockResolvedValue({ success: true });
    const result = await renderReadyCart();

    await act(async () => {
      await result.current.addItem(productA, 2, { name: 'Red' }, 'M');
    });

    expect(mockedApiPost).toHaveBeenCalledWith(
      '/cart/items',
      { product_id: 'p1', quantity: 2, selected_color: { name: 'Red' }, selected_size: 'M' },
      'tok-abc'
    );
  });

  it('does not call the backend when the user is a guest', async () => {
    const result = await renderReadyCart();

    await act(async () => {
      await result.current.addItem(productA);
    });

    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it('does not fail the add when the backend sync rejects', async () => {
    mockUseAuth.mockReturnValue(authenticatedAuth);
    mockedApiPost.mockRejectedValue(new Error('network down'));
    const result = await renderReadyCart();

    await act(async () => {
      await result.current.addItem(productA);
    });

    // The optimistic local update still succeeds even though the fire-and-forget
    // backend sync failed.
    expect(result.current.items).toHaveLength(1);
  });

  it('removes an item from the cart and persists the change', async () => {
    const result = await renderReadyCart();

    await act(async () => {
      await result.current.addItem(productA);
    });
    await act(async () => {
      await result.current.addItem(productB);
    });
    expect(result.current.items).toHaveLength(2);

    await act(async () => {
      await result.current.removeItem(result.current.items[0].id);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].product_id).toBe('p2');
    expect(result.current.totalAmount).toBe(50);

    const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
    expect(JSON.parse(stored as string)).toEqual(result.current.items);
  });

  it('updates the quantity of an existing item', async () => {
    const result = await renderReadyCart();

    await act(async () => {
      await result.current.addItem(productA, 1);
    });
    const itemId = result.current.items[0].id;

    await act(async () => {
      await result.current.updateQuantity(itemId, 5);
    });

    expect(result.current.items[0].quantity).toBe(5);
    expect(result.current.totalAmount).toBe(500);
    expect(result.current.itemCount).toBe(5);
  });

  it('removes the item when its quantity is updated below 1', async () => {
    const result = await renderReadyCart();

    await act(async () => {
      await result.current.addItem(productA, 1);
    });
    const itemId = result.current.items[0].id;

    await act(async () => {
      await result.current.updateQuantity(itemId, 0);
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.totalAmount).toBe(0);
  });

  it('clears the entire cart and removes it from storage', async () => {
    const removeItemSpy = jest.spyOn(AsyncStorage, 'removeItem');
    const result = await renderReadyCart();

    await act(async () => {
      await result.current.addItem(productA);
    });
    await act(async () => {
      await result.current.addItem(productB);
    });
    expect(result.current.items).toHaveLength(2);

    await act(async () => {
      await result.current.clearCart();
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.totalAmount).toBe(0);
    expect(result.current.itemCount).toBe(0);
    expect(removeItemSpy).toHaveBeenCalledWith(CART_STORAGE_KEY);

    const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
    expect(stored).toBeNull();
  });
});
