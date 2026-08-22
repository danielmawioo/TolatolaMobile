import {
  enrichCartItemsForCheckout,
  getCheckoutQuote,
  resolveTransportMethodId,
  mapUiPaymentMethodToApi,
  parseShopCoordsFromApi,
  type TransportMethod,
} from '@/src/api/orders';
import { apiGet } from '@/src/services/api';
import type { CartItem } from '@/src/contexts/CartContext';

jest.mock('@/src/services/api');

const mockedApiGet = apiGet as jest.Mock;

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 'ci-1',
    product_id: 'p1',
    name: 'Item',
    price: 1000,
    quantity: 1,
    ...overrides,
  };
}

describe('parseShopCoordsFromApi', () => {
  it('parses bare {latitude, longitude}', () => {
    expect(parseShopCoordsFromApi({ latitude: -6.8, longitude: 39.2 })).toEqual({ lat: -6.8, lng: 39.2 });
  });

  it('parses a response wrapped in { shop: {...} }', () => {
    expect(parseShopCoordsFromApi({ shop: { lat: 1, lng: 2 } })).toEqual({ lat: 1, lng: 2 });
  });

  it('parses a response wrapped in { data: {...} }', () => {
    expect(parseShopCoordsFromApi({ data: { latitude: 1, longitude: 2 } })).toEqual({ lat: 1, lng: 2 });
  });

  it('returns null when coordinates are missing or non-numeric', () => {
    expect(parseShopCoordsFromApi({})).toBeNull();
    expect(parseShopCoordsFromApi(null)).toBeNull();
    expect(parseShopCoordsFromApi({ latitude: 'nope', longitude: 2 })).toBeNull();
  });
});

describe('enrichCartItemsForCheckout', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns an empty array for an empty cart without calling the API', async () => {
    const result = await enrichCartItemsForCheckout([], 'token');
    expect(result).toEqual([]);
    expect(mockedApiGet).not.toHaveBeenCalled();
  });

  it('resolves shop_id and weight from the product endpoint, deduping by product', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/products/p1') return Promise.resolve({ shop_id: 'shop-a', weight_kg: 2 });
      return Promise.resolve({});
    });

    const items = [item({ product_id: 'p1', quantity: 3 }), item({ id: 'ci-2', product_id: 'p1', quantity: 1 })];
    const result = await enrichCartItemsForCheckout(items, 'token');

    expect(mockedApiGet).toHaveBeenCalledTimes(1); // deduped
    expect(result).toEqual([
      { product_id: 'p1', quantity: 3, price: 1000, shop_id: 'shop-a', weight_kg_per_unit: 2 },
      { product_id: 'p1', quantity: 1, price: 1000, shop_id: 'shop-a', weight_kg_per_unit: 2 },
    ]);
  });

  it('prefers the shop_id already on the cart line over the product response', async () => {
    mockedApiGet.mockResolvedValue({ shop_id: 'from-product' });
    const items = [item({ shop_id: 'from-cart' })];
    const result = await enrichCartItemsForCheckout(items, 'token');
    expect(result[0].shop_id).toBe('from-cart');
  });

  it('defaults weight to 1 when the product has no weight field', async () => {
    mockedApiGet.mockResolvedValue({ shop_id: 'shop-a' });
    const result = await enrichCartItemsForCheckout([item()], 'token');
    expect(result[0].weight_kg_per_unit).toBe(1);
  });

  it('throws a clear error when no shop can be resolved for a line', async () => {
    mockedApiGet.mockResolvedValue({});
    await expect(enrichCartItemsForCheckout([item({ name: 'Mystery Item' })], 'token')).rejects.toThrow(
      /Mystery Item/
    );
  });
});

describe('getCheckoutQuote', () => {
  afterEach(() => jest.clearAllMocks());

  const methods: TransportMethod[] = [{ id: 'car-1', name: 'Car', rate_per_km: 500 }];

  it('builds a full quote from enriched items, shop coords, and delivery pricing', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/products/p1') return Promise.resolve({ shop_id: 'shop-a', weight_kg: 1 });
      if (path === '/shops/shop-a') return Promise.resolve({ latitude: -6.8, longitude: 39.2 });
      return Promise.resolve({});
    });

    const items = [item({ quantity: 2, price: 5000 })];
    const dropoff = { lat: -6.8, lng: 39.2 }; // same point as shop -> distance floors to 0.1km

    const quote = await getCheckoutQuote(items, 'token', dropoff, 'car', methods);

    expect(quote.subtotal).toBe(10000);
    expect(quote.transportMethodId).toBe('car-1');
    expect(quote.lineItems).toHaveLength(1);
    expect(quote.lineItems[0].shop_id).toBe('shop-a');
    expect(quote.shopDeliveries['shop-a']).toBeDefined();
    expect(quote.platformTotal).toBe(quote.subtotal + quote.deliveryFee + quote.insuranceFee);
  });
});

describe('resolveTransportMethodId', () => {
  const methods: TransportMethod[] = [
    { id: 'm-1', name: 'Boda Boda Motorcycle' },
    { id: 'm-2', name: 'Bajaj Tuk Tuk' },
    { id: 'm-3', name: 'Medium Van' },
    { id: 'm-4', name: 'Cargo Truck' },
    { id: 'm-5', name: 'Semi Trailer' },
  ];

  it.each([
    ['motorcycle', 'm-1'],
    ['bajaj', 'm-2'],
    ['car', 'm-3'],
    ['truck', 'm-4'],
    ['semi_trailer', 'm-5'],
  ])('maps delivery option "%s" to the matching method', (option, expectedId) => {
    expect(resolveTransportMethodId(methods, option)).toBe(expectedId);
  });

  it('returns null when no method matches', () => {
    expect(resolveTransportMethodId([{ id: 'x', name: 'Unrelated' }], 'motorcycle')).toBeNull();
  });

  it('falls back to a car-like match for an unrecognized delivery option', () => {
    expect(resolveTransportMethodId(methods, 'unknown-option')).toBe('m-3');
  });
});

describe('mapUiPaymentMethodToApi', () => {
  it.each([
    ['cod', 'cash-on-delivery'],
    ['mpesa', 'm-pesa'],
    ['tigopesa', 'tigo-pesa'],
    ['airtel_money', 'airtel-money'],
    ['halopesa', 'halopesa'],
    ['card', 'visa'],
  ])('maps "%s" to "%s"', (ui, api) => {
    expect(mapUiPaymentMethodToApi(ui)).toBe(api);
  });

  it('passes through an unrecognized value unchanged', () => {
    expect(mapUiPaymentMethodToApi('bitcoin')).toBe('bitcoin');
  });
});
