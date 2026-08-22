import {
  haversineKm,
  distanceKmShopToDropoff,
  calculateTransportFee,
  buildShopDeliveries,
  insuranceFeeFromSubtotalAndDelivery,
  assignPerShopDeliveryToLines,
  subtotalFromEnriched,
  totalDeliveryFee,
  maxShopDistanceKm,
  BASE_LOCATION,
  DEFAULT_DISTANCE_KM,
  type EnrichedCartLine,
  type ShopDelivery,
} from '@/src/lib/checkoutPricing';

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm(BASE_LOCATION, BASE_LOCATION)).toBeCloseTo(0, 5);
  });

  it('computes a plausible distance between Dar es Salaam and Dodoma (~360km)', () => {
    const dodoma = { lat: -6.1722, lng: 35.7395 };
    const km = haversineKm(BASE_LOCATION, dodoma);
    expect(km).toBeGreaterThan(300);
    expect(km).toBeLessThan(420);
  });
});

describe('distanceKmShopToDropoff', () => {
  it('returns the flat default distance when there is no drop-off', () => {
    expect(distanceKmShopToDropoff({ lat: -6.8, lng: 39.2 }, null)).toBe(DEFAULT_DISTANCE_KM);
  });

  it('falls back to BASE_LOCATION as the origin when shop coords are missing', () => {
    const dropoff = { lat: -6.8, lng: 39.2 };
    const withBase = distanceKmShopToDropoff(null, dropoff);
    const explicit = distanceKmShopToDropoff(BASE_LOCATION, dropoff);
    expect(withBase).toBe(explicit);
  });

  it('never returns less than 0.1 km even for coincident points', () => {
    expect(distanceKmShopToDropoff(BASE_LOCATION, BASE_LOCATION)).toBe(0.1);
  });
});

describe('calculateTransportFee', () => {
  it('returns 0 when the method is unavailable', () => {
    expect(calculateTransportFee(undefined, 10, 5, false)).toBe(0);
  });

  it('returns 0 for a negligible distance', () => {
    expect(calculateTransportFee(undefined, 0.05, 5, true)).toBe(0);
  });

  it('prefers rate_per_kg over rate_per_km when both are set', () => {
    const fee = calculateTransportFee({ rate_per_km: 100, rate_per_kg: 200 }, 10, 3, true);
    expect(fee).toBe(600); // 3kg * 200
  });

  it('uses rate_per_km when rate_per_kg is absent', () => {
    const fee = calculateTransportFee({ rate_per_km: 150 }, 10, 3, true);
    expect(fee).toBe(1500); // 10km * 150
  });

  it('falls back to tiered flat fees when no rates are configured', () => {
    expect(calculateTransportFee(undefined, 4, 1, true)).toBe(3000); // <=5km
    expect(calculateTransportFee(undefined, 10, 1, true)).toBe(5000); // <=15km
    expect(calculateTransportFee(undefined, 20, 1, true)).toBe(10000); // 20 * 500
  });
});

describe('buildShopDeliveries', () => {
  const lines: EnrichedCartLine[] = [
    { product_id: 'p1', quantity: 2, price: 1000, shop_id: 'shop-a', weight_kg_per_unit: 1.5 },
    { product_id: 'p2', quantity: 1, price: 2000, shop_id: 'shop-a', weight_kg_per_unit: 2 },
    { product_id: 'p3', quantity: 3, price: 500, shop_id: 'shop-b', weight_kg_per_unit: 1 },
  ];

  it('aggregates weight per shop and computes one delivery entry per shop', () => {
    const shopCoords = { 'shop-a': { lat: -6.8, lng: 39.2 }, 'shop-b': null };
    const dropoff = { lat: -6.79, lng: 39.21 };
    const result = buildShopDeliveries(lines, shopCoords, dropoff, { rate_per_kg: 500 });

    expect(Object.keys(result).sort()).toEqual(['shop-a', 'shop-b']);
    // shop-a weight: 2*1.5 + 1*2 = 5kg -> fee 5 * 500 = 2500
    expect(result['shop-a'].weightKg).toBe(5);
    expect(result['shop-a'].deliveryFee).toBe(2500);
    // shop-b weight: 3*1 = 3kg -> fee 3 * 500 = 1500
    expect(result['shop-b'].weightKg).toBe(3);
    expect(result['shop-b'].deliveryFee).toBe(1500);
  });

  it('zeroes out fees when the transport method is explicitly unavailable', () => {
    const result = buildShopDeliveries(lines, {}, null, { rate_per_kg: 500, is_available: false });
    expect(result['shop-a'].deliveryFee).toBe(0);
    expect(result['shop-b'].deliveryFee).toBe(0);
  });
});

describe('insuranceFeeFromSubtotalAndDelivery', () => {
  it('computes 1.5% of subtotal + delivery, rounded', () => {
    expect(insuranceFeeFromSubtotalAndDelivery(10000, 2000)).toBe(180); // 12000 * 0.015
  });
});

describe('assignPerShopDeliveryToLines', () => {
  const shopDeliveries: Record<string, ShopDelivery> = {
    'shop-a': { shopId: 'shop-a', distanceKm: 5, deliveryFee: 3000, weightKg: 2 },
  };
  const lines: EnrichedCartLine[] = [
    { product_id: 'p1', quantity: 1, price: 1000, shop_id: 'shop-a', weight_kg_per_unit: 1 },
    { product_id: 'p2', quantity: 1, price: 2000, shop_id: 'shop-a', weight_kg_per_unit: 1 },
  ];

  it('assigns the full delivery fee/distance only to the first line per shop, zero to the rest', () => {
    const result = assignPerShopDeliveryToLines(lines, shopDeliveries);
    expect(result[0].delivery_fee).toBe(3000);
    expect(result[0].delivery_distance_km).toBe(5);
    expect(result[1].delivery_fee).toBe(0);
    expect(result[1].delivery_distance_km).toBe(0);
  });
});

describe('subtotalFromEnriched / totalDeliveryFee / maxShopDistanceKm', () => {
  it('sums price*quantity across lines', () => {
    const lines: EnrichedCartLine[] = [
      { product_id: 'p1', quantity: 2, price: 1000, shop_id: 's1', weight_kg_per_unit: 1 },
      { product_id: 'p2', quantity: 3, price: 500, shop_id: 's1', weight_kg_per_unit: 1 },
    ];
    expect(subtotalFromEnriched(lines)).toBe(3500);
  });

  it('sums delivery fees across shops', () => {
    const deliveries: Record<string, ShopDelivery> = {
      a: { shopId: 'a', distanceKm: 1, deliveryFee: 1000, weightKg: 1 },
      b: { shopId: 'b', distanceKm: 2, deliveryFee: 2000, weightKg: 1 },
    };
    expect(totalDeliveryFee(deliveries)).toBe(3000);
  });

  it('returns the max distance across shops, or 0 when there are none', () => {
    const deliveries: Record<string, ShopDelivery> = {
      a: { shopId: 'a', distanceKm: 4, deliveryFee: 0, weightKg: 1 },
      b: { shopId: 'b', distanceKm: 9, deliveryFee: 0, weightKg: 1 },
    };
    expect(maxShopDistanceKm(deliveries)).toBe(9);
    expect(maxShopDistanceKm({})).toBe(0);
  });
});
