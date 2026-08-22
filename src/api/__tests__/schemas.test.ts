import {
  OrderResponseSchema,
  PaymentStatusResponseSchema,
  ProductResponseSchema,
} from '@/src/api/schemas';

describe('ProductResponseSchema', () => {
  it('parses a valid product payload', () => {
    const result = ProductResponseSchema.safeParse({ shop_id: 'shop-1', weight_kg: 2.5 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shop_id).toBe('shop-1');
      expect(result.data.weight_kg).toBe(2.5);
    }
  });

  it('accepts numeric shop_id/weight (backend sometimes sends numbers)', () => {
    const result = ProductResponseSchema.safeParse({ shop_id: 42, weight: 3 });
    expect(result.success).toBe(true);
  });

  it('fails when shop_id is a nested object instead of a string/number', () => {
    const result = ProductResponseSchema.safeParse({ shop_id: { nested: 'garbage' } });
    expect(result.success).toBe(false);
  });

  it('passes unknown fields through untouched', () => {
    const result = ProductResponseSchema.safeParse({
      shop_id: 'shop-1',
      name: 'Widget',
      price: 1000,
      images: ['a.png'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Widget');
      expect(result.data.price).toBe(1000);
      expect(result.data.images).toEqual(['a.png']);
    }
  });
});

describe('OrderResponseSchema', () => {
  it('parses a valid created-order payload', () => {
    const result = OrderResponseSchema.safeParse({
      id: 'order-1',
      order_number: 'ORD-001',
      tracking_code: 'TRK-1',
      status: 'pending',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        id: 'order-1',
        order_number: 'ORD-001',
        tracking_code: 'TRK-1',
        status: 'pending',
      });
    }
  });

  it('accepts a numeric id/order_number/tracking_code (backend sometimes sends numbers)', () => {
    const result = OrderResponseSchema.safeParse({ id: 123, order_number: 456, tracking_code: 789 });
    expect(result.success).toBe(true);
  });

  it('tolerates missing optional fields', () => {
    const result = OrderResponseSchema.safeParse({ id: 'order-1' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.order_number).toBeUndefined();
      expect(result.data.tracking_code).toBeUndefined();
      expect(result.data.status).toBeUndefined();
    }
  });

  it('fails when id is a nested object instead of a string/number', () => {
    const result = OrderResponseSchema.safeParse({ id: { nested: 'garbage' } });
    expect(result.success).toBe(false);
  });

  it('fails when status is not a string', () => {
    const result = OrderResponseSchema.safeParse({ id: 'order-1', status: { code: 1 } });
    expect(result.success).toBe(false);
  });

  it('passes unknown fields (totals, shipping address, timestamps, ...) through untouched', () => {
    const result = OrderResponseSchema.safeParse({
      id: 'order-1',
      total_amount: 15000,
      payment_status: 'paid',
      shipping_address: { city: 'Dar es Salaam' },
      created_at: '2026-08-22T00:00:00Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total_amount).toBe(15000);
      expect(result.data.payment_status).toBe('paid');
      expect(result.data.shipping_address).toEqual({ city: 'Dar es Salaam' });
    }
  });
});

describe('PaymentStatusResponseSchema', () => {
  it('parses a valid top-level payment status payload', () => {
    const result = PaymentStatusResponseSchema.safeParse({ status: 'succeeded', payment_status: 'paid' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('succeeded');
      expect(result.data.payment_status).toBe('paid');
    }
  });

  it('parses a payload nested under data', () => {
    const result = PaymentStatusResponseSchema.safeParse({
      data: { status: 'paid', payment_status: 'paid' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data?.status).toBe('paid');
    }
  });

  it('tolerates a payload with no status fields at all', () => {
    const result = PaymentStatusResponseSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('fails when status is a nested object instead of a string', () => {
    const result = PaymentStatusResponseSchema.safeParse({ status: { code: 'paid' } });
    expect(result.success).toBe(false);
  });

  it('passes unknown fields through untouched', () => {
    const result = PaymentStatusResponseSchema.safeParse({
      status: 'pending',
      provider_reference: 'clickpesa-123',
      amount: 5000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider_reference).toBe('clickpesa-123');
      expect(result.data.amount).toBe(5000);
    }
  });
});
