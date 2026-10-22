import { ZodError } from 'zod';
import { createOrder, initiateCheckoutPayment } from '@/src/services/checkout';
import {
  createSupportTicket,
  postConversationMessage,
  postSupportAiChat,
} from '@/src/services/supportChat';
import { updateAssignmentStatus, verifyAssignmentPin } from '@/src/services/assignments';
import { apiPost, apiPatch } from '@/src/services/api';

jest.mock('@/src/services/api');

const mockedApiPost = apiPost as jest.Mock;
const mockedApiPatch = apiPatch as jest.Mock;

describe('service request validation', () => {
  beforeEach(() => {
    mockedApiPost.mockReset();
    mockedApiPatch.mockReset();
    mockedApiPost.mockResolvedValue({});
    mockedApiPatch.mockResolvedValue({});
  });

  it('createOrder throws ZodError before apiPost when items are missing', () => {
    expect(() =>
      createOrder({
        shippingAddress: {
          full_name: 'A',
          phone: '1',
          region: 'R',
          district: 'D',
          ward: 'W',
          street: 'S',
        },
        totalAmount: 100,
        paymentMethod: 'tigopesa',
      })
    ).toThrow(ZodError);
    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it('initiateCheckoutPayment throws ZodError before apiPost on empty provider', () => {
    expect(() =>
      initiateCheckoutPayment({
        orderId: 'ord-1',
        provider: '',
        amount: 100,
        currency: 'TZS',
      })
    ).toThrow(ZodError);
    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it('createSupportTicket throws ZodError before apiPost when subject is empty', async () => {
    await expect(
      createSupportTicket({ subject: '', message: 'help', priority: 'medium' }, 'tok')
    ).rejects.toBeInstanceOf(ZodError);
    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it('postConversationMessage throws ZodError before apiPost when message is missing', async () => {
    await expect(postConversationMessage('c1', {}, 'tok')).rejects.toBeInstanceOf(ZodError);
    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it('postSupportAiChat throws ZodError before apiPost when message is missing', async () => {
    await expect(postSupportAiChat({ history: [] }, 'tok')).rejects.toBeInstanceOf(ZodError);
    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it('verifyAssignmentPin throws ZodError before apiPost for a non-4-digit pin', async () => {
    await expect(verifyAssignmentPin('a1', '12', 'tok')).rejects.toBeInstanceOf(ZodError);
    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it('updateAssignmentStatus throws ZodError before apiPatch when status is empty', async () => {
    await expect(
      updateAssignmentStatus({ id: 'a1', newStatus: '', accessToken: 'tok' })
    ).rejects.toBeInstanceOf(ZodError);
    expect(mockedApiPatch).not.toHaveBeenCalled();
  });

  it('createOrder reaches apiPost when the payload is Zod-valid', async () => {
    mockedApiPost.mockResolvedValueOnce({ id: 'ord-1' });
    await createOrder({
      items: [{ product_id: 'p1', quantity: 1, price: 10, shop_id: 's1' }],
      shippingAddress: {
        full_name: 'A',
        phone: '1',
        region: 'R',
        district: 'D',
        ward: 'W',
        street: 'S',
      },
      totalAmount: 100,
      paymentMethod: 'tigopesa',
    }, 'tok');
    expect(mockedApiPost).toHaveBeenCalledTimes(1);
  });
});
