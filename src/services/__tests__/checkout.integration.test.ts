import { ZodError } from 'zod';
import { createOrder, initiateCheckoutPayment } from '@/src/services/checkout';
import { apiPost } from '@/src/services/api';
import {
  CheckoutOrderInputSchema,
  PaymentInitiateInputSchema,
} from '@/src/schemas/checkout';

jest.mock('@/src/services/api');

const mockedApiPost = apiPost as jest.Mock;

const validOrder = {
  items: [
    { product_id: 'prod-1', quantity: 2, price: 1500, shop_id: 'shop-1' },
    { product_id: 'prod-2', quantity: 1, price: 3000, shop_id: 'shop-1' },
  ],
  shippingAddress: {
    full_name: 'Asha Mwinyi',
    phone: '+255712345678',
    region: 'Dar es Salaam',
    district: 'Ilala',
    ward: 'Kariakoo',
    street: 'Uhuru St',
  },
  totalAmount: 6000,
  paymentMethod: 'tigopesa',
};

describe('checkout integration (mocked api)', () => {
  beforeEach(() => {
    mockedApiPost.mockReset();
  });

  it('creates an order then initiates payment with Zod-validated payloads', async () => {
    mockedApiPost
      .mockResolvedValueOnce({ id: 'order-99', order: { id: 'order-99' } })
      .mockResolvedValueOnce({
        success: true,
        transactionId: 'txn-1',
        message: 'STK push sent',
      });

    const orderBody = CheckoutOrderInputSchema.parse(validOrder);
    const orderRes = await createOrder(orderBody, 'access-token');

    expect(mockedApiPost).toHaveBeenNthCalledWith(
      1,
      '/orders',
      orderBody,
      'access-token',
      expect.anything(),
    );
    expect(orderRes).toMatchObject({ id: 'order-99' });

    const payBody = PaymentInitiateInputSchema.parse({
      orderId: 'order-99',
      provider: 'tigopesa',
      amount: 6000,
      currency: 'TZS',
    });
    const payRes = await initiateCheckoutPayment(payBody, 'access-token');

    expect(mockedApiPost).toHaveBeenNthCalledWith(
      2,
      '/payments/mobile/initiate',
      payBody,
      'access-token',
      expect.anything(),
    );
    expect(payRes).toMatchObject({ success: true, transactionId: 'txn-1' });
    expect(mockedApiPost).toHaveBeenCalledTimes(2);
  });

  it('aborts the flow when the order payload fails Zod validation', async () => {
    expect(() =>
      createOrder({ ...validOrder, items: [] }, 'access-token')
    ).toThrow(ZodError);
    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it('does not initiate payment when createOrder fails at the network layer', async () => {
    mockedApiPost.mockRejectedValueOnce(new Error('Network request failed'));

    await expect(createOrder(validOrder, 'access-token')).rejects.toThrow('Network request failed');
    expect(mockedApiPost).toHaveBeenCalledTimes(1);
    expect(mockedApiPost).toHaveBeenCalledWith(
      '/orders',
      validOrder,
      'access-token',
      expect.anything(),
    );
  });
});
