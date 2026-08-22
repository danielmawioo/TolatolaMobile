import { fetchPaymentStatus } from '@/src/api/payments';
import { apiGet } from '@/src/services/api';

jest.mock('@/src/services/api');

const mockedApiGet = apiGet as jest.Mock;

describe('fetchPaymentStatus', () => {
  afterEach(() => jest.clearAllMocks());

  it('reports succeeded for a top-level "paid" status', async () => {
    mockedApiGet.mockResolvedValue({ status: 'paid' });
    expect(await fetchPaymentStatus('token', 'order-1')).toBe('succeeded');
  });

  it('reports succeeded from payment_status when top-level status is absent', async () => {
    mockedApiGet.mockResolvedValue({ payment_status: 'paid' });
    expect(await fetchPaymentStatus('token', 'order-1')).toBe('succeeded');
  });

  it('reports succeeded from a nested data.status', async () => {
    mockedApiGet.mockResolvedValue({ data: { status: 'succeeded' } });
    expect(await fetchPaymentStatus('token', 'order-1')).toBe('succeeded');
  });

  it('reports failed for a top-level "failed" status', async () => {
    mockedApiGet.mockResolvedValue({ status: 'failed' });
    expect(await fetchPaymentStatus('token', 'order-1')).toBe('failed');
  });

  it('reports pending when the response has no recognizable status field', async () => {
    mockedApiGet.mockResolvedValue({});
    expect(await fetchPaymentStatus('token', 'order-1')).toBe('pending');
  });

  it('falls back to pending when the response has a malformed status shape', async () => {
    // status is a nested object, not a string — fails PaymentStatusResponseSchema,
    // so fetchPaymentStatus should fall back to its 'pending' default rather than throw.
    mockedApiGet.mockResolvedValue({ status: { code: 'paid' } });
    expect(await fetchPaymentStatus('token', 'order-1')).toBe('pending');
  });

  it('falls back to pending when the request itself throws', async () => {
    mockedApiGet.mockRejectedValue(new Error('network error'));
    expect(await fetchPaymentStatus('token', 'order-1')).toBe('pending');
  });

  it('ignores unrelated extra fields on the response (passthrough)', async () => {
    mockedApiGet.mockResolvedValue({ status: 'paid', provider_reference: 'clickpesa-123', amount: 5000 });
    expect(await fetchPaymentStatus('token', 'order-1')).toBe('succeeded');
  });
});
