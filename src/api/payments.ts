import { apiGet, apiPost } from '@/src/services/api';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed';

/**
 * Start ClickPesa mobile collection for an existing order (STK push).
 * Backend: POST /payments/mobile/initiate (requires orderId).
 */
export async function initiateMobileMoneyPayment(
  accessToken: string | null | undefined,
  body: {
    orderId: string;
    provider: string;
    phone: string;
    amount: number;
    currency?: string;
  }
): Promise<{ orderId: string }> {
  await apiPost<Record<string, unknown>>(
    '/payments/mobile/initiate',
    {
      orderId: body.orderId,
      provider: body.provider,
      phone: body.phone,
      amount: body.amount,
      currency: body.currency ?? 'TZS',
    },
    accessToken ?? undefined
  );
  return { orderId: body.orderId };
}

/**
 * Poll order payment state (order UUID, order number, or ClickPesa reference).
 */
export async function fetchPaymentStatus(
  accessToken: string | null | undefined,
  lookupId: string
): Promise<PaymentStatus> {
  try {
    const res = await apiGet<Record<string, unknown>>(
      `/payments/${encodeURIComponent(lookupId)}`,
      accessToken ?? undefined
    );
    const top = String((res.status as string) || '').toLowerCase();
    if (top === 'succeeded' || top === 'paid' || top === 'completed') return 'succeeded';
    if (top === 'failed' || top === 'cancelled' || top === 'canceled' || top === 'error') return 'failed';

    const ps = String((res.payment_status as string) || '').toLowerCase();
    if (ps === 'paid') return 'succeeded';
    if (ps === 'failed') return 'failed';

    const nested =
      res.data && typeof res.data === 'object'
        ? String(((res.data as Record<string, unknown>).status as string) || '').toLowerCase()
        : '';
    if (nested === 'succeeded' || nested === 'paid') return 'succeeded';
    if (nested === 'failed') return 'failed';

    return 'pending';
  } catch {
    return 'pending';
  }
}
