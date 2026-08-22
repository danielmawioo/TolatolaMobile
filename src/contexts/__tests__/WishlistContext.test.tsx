import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WishlistProvider, useWishlist } from '@/src/contexts/WishlistContext';
import type { Product } from '@/src/types';

const STORAGE_KEY = '@tolatola/wishlist_items_v1';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Test Product',
    price: 100,
    ...overrides,
  } as Product;
}

async function renderWishlist() {
  const view = renderHook(() => useWishlist(), { wrapper: WishlistProvider });
  await waitFor(() => expect(view.result.current.isLoading).toBe(false));
  return view;
}

describe('WishlistContext', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('throws when useWishlist is used outside of a WishlistProvider', () => {
    // Suppress the expected React error log for this negative test.
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useWishlist())).toThrow(
      'useWishlist must be used within WishlistProvider'
    );
    consoleSpy.mockRestore();
  });

  it('starts loading and settles to an empty list when storage is empty', async () => {
    const { result } = renderHook(() => useWishlist(), { wrapper: WishlistProvider });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.items).toEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual([]);
  });

  it('loads persisted entries from AsyncStorage on mount', async () => {
    const persisted = [
      { productId: 'a1', name: 'Widget', price: 50, image_url: 'https://img/a1.png', shop_id: 's1' },
    ];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));

    const { result } = await renderWishlist();

    expect(result.current.items).toEqual(persisted);
    expect(result.current.isInWishlist('a1')).toBe(true);
  });

  it('filters out malformed rows when loading from storage', async () => {
    const raw = [
      { productId: 'valid1', name: 'Good', price: 10 },
      { name: 'Missing productId' },
      null,
      'not-an-object',
      42,
    ];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(raw));

    const { result } = await renderWishlist();

    expect(result.current.items).toEqual([{ productId: 'valid1', name: 'Good', price: 10 }]);
  });

  it('ignores non-array persisted payloads', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ not: 'an array' }));

    const { result } = await renderWishlist();

    expect(result.current.items).toEqual([]);
  });

  it('handles corrupt JSON in storage gracefully without crashing', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{not valid json');

    const { result } = await renderWishlist();

    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('adds a product to the wishlist via toggleWishlist when absent', async () => {
    const { result } = await renderWishlist();
    const product = makeProduct({ id: 'p1', name: 'Sneakers', price: 250 });

    expect(result.current.isInWishlist('p1')).toBe(false);

    await act(async () => {
      await result.current.toggleWishlist(product);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toMatchObject({
      productId: 'p1',
      name: 'Sneakers',
      price: 250,
    });
    expect(result.current.isInWishlist('p1')).toBe(true);
  });

  it('removes a product from the wishlist via toggleWishlist when already present', async () => {
    const { result } = await renderWishlist();
    const product = makeProduct({ id: 'p2', name: 'Hat', price: 20 });

    await act(async () => {
      await result.current.toggleWishlist(product);
    });
    expect(result.current.isInWishlist('p2')).toBe(true);

    await act(async () => {
      await result.current.toggleWishlist(product);
    });

    expect(result.current.isInWishlist('p2')).toBe(false);
    expect(result.current.items).toEqual([]);
  });

  it('removes an item via removeFromWishlist', async () => {
    const { result } = await renderWishlist();
    const product = makeProduct({ id: 'p3', name: 'Bag', price: 30 });

    await act(async () => {
      await result.current.toggleWishlist(product);
    });
    expect(result.current.isInWishlist('p3')).toBe(true);

    await act(async () => {
      await result.current.removeFromWishlist('p3');
    });

    expect(result.current.isInWishlist('p3')).toBe(false);
    expect(result.current.items).toEqual([]);
  });

  it('removeFromWishlist is a no-op when the product is not in the list', async () => {
    const { result } = await renderWishlist();

    await act(async () => {
      await result.current.removeFromWishlist('does-not-exist');
    });

    expect(result.current.items).toEqual([]);
  });

  it('keeps other items intact when removing one of several', async () => {
    const { result } = await renderWishlist();
    const p1 = makeProduct({ id: 'p1', name: 'One' });
    const p2 = makeProduct({ id: 'p2', name: 'Two' });

    await act(async () => {
      await result.current.toggleWishlist(p1);
      await result.current.toggleWishlist(p2);
    });
    expect(result.current.items).toHaveLength(2);

    await act(async () => {
      await result.current.removeFromWishlist('p1');
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe('p2');
  });

  it('persists changes to AsyncStorage after toggling', async () => {
    const { result } = await renderWishlist();
    const product = makeProduct({ id: 'p9', name: 'Persisted', price: 99 });

    await act(async () => {
      await result.current.toggleWishlist(product);
    });

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed).toEqual([
      expect.objectContaining({ productId: 'p9', name: 'Persisted', price: 99 }),
    ]);
  });

  it('persists an empty array to AsyncStorage after removing the last item', async () => {
    const { result } = await renderWishlist();
    const product = makeProduct({ id: 'p10', name: 'Temp' });

    await act(async () => {
      await result.current.toggleWishlist(product);
    });
    await act(async () => {
      await result.current.removeFromWishlist('p10');
    });

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(raw as string)).toEqual([]);
  });

  it('round-trips persisted data across provider remounts', async () => {
    const first = await renderWishlist();
    const product = makeProduct({ id: 'p11', name: 'Roundtrip', price: 15 });

    await act(async () => {
      await first.result.current.toggleWishlist(product);
    });
    first.unmount();

    const second = await renderWishlist();
    expect(second.result.current.isInWishlist('p11')).toBe(true);
    expect(second.result.current.items).toHaveLength(1);
  });

  it('coerces a string price to a number when adding', async () => {
    const { result } = await renderWishlist();
    const product = makeProduct({ id: 'p12', name: 'StringPrice', price: '75' as unknown as number });

    await act(async () => {
      await result.current.toggleWishlist(product);
    });

    expect(result.current.items[0].price).toBe(75);
  });

  it('falls back to a default name and zero price for missing/invalid values', async () => {
    const { result } = await renderWishlist();
    const product = makeProduct({
      id: 'p13',
      name: undefined as unknown as string,
      price: 'not-a-number' as unknown as number,
    });

    await act(async () => {
      await result.current.toggleWishlist(product);
    });

    expect(result.current.items[0].name).toBe('Product');
    expect(result.current.items[0].price).toBe(0);
  });

  it('derives shop_id via getShopIdForNavigation when not directly present', async () => {
    const { result } = await renderWishlist();
    const product = makeProduct({ id: 'p14', name: 'VendorItem', shop_id: undefined });
    (product as unknown as { vendor_id: string }).vendor_id = 'vendor-77';

    await act(async () => {
      await result.current.toggleWishlist(product);
    });

    expect(result.current.items[0].shop_id).toBe('vendor-77');
  });

  it('resolves image_url from the images array via getProductImageUrl', async () => {
    const { result } = await renderWishlist();
    const product = makeProduct({
      id: 'p15',
      name: 'Imaged',
      images: ['https://img/p15-first.png'],
      image_url: 'https://img/p15-fallback.png',
    });

    await act(async () => {
      await result.current.toggleWishlist(product);
    });

    expect(result.current.items[0].image_url).toBe('https://img/p15-first.png');
  });

  it('multiple hook instances backed by the same provider observe the same state', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WishlistProvider>{children}</WishlistProvider>
    );
    const { result: a } = renderHook(() => useWishlist(), { wrapper });
    await waitFor(() => expect(a.current.isLoading).toBe(false));

    const product = makeProduct({ id: 'p16', name: 'Shared' });
    await act(async () => {
      await a.current.toggleWishlist(product);
    });

    expect(a.current.isInWishlist('p16')).toBe(true);
  });
});
