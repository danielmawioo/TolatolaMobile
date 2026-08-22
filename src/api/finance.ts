import { apiGet, apiPost } from '@/src/services/api';

export type FinanceSummary = {
  total_sales: number;
  commission_deducted: number;
  net_earnings: number;
  withdrawable_balance: number;
  pending_balance: number;
};

export type PayoutRecord = {
  id: string;
  amount: number;
  status: string;
  created_at?: string;
  provider?: string;
  reference?: string;
};

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseFinanceSummary(raw: unknown): FinanceSummary {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const data = (o.data && typeof o.data === 'object' ? o.data : o) as Record<string, unknown>;
  return {
    total_sales: num(data.total_sales ?? data.totalSales ?? data.gross_sales ?? data.grossSales),
    commission_deducted: num(
      data.commission_deducted ?? data.commissionDeducted ?? data.total_commission ?? data.commission
    ),
    net_earnings: num(data.net_earnings ?? data.netEarnings ?? data.earnings ?? data.total_earned),
    withdrawable_balance: num(
      data.withdrawable_balance ?? data.withdrawableBalance ?? data.available_balance ?? data.availableBalance
    ),
    pending_balance: num(data.pending_balance ?? data.pendingBalance ?? data.hold_balance ?? data.on_hold),
  };
}

async function getFirstAvailable(token: string, paths: string[]): Promise<FinanceSummary> {
  for (const path of paths) {
    try {
      const raw = await apiGet<unknown>(path, token);
      return parseFinanceSummary(raw);
    } catch (e) {
      const st = (e as { status?: number }).status;
      if (st === 404 || st === 405) continue;
      throw e;
    }
  }
  return {
    total_sales: 0,
    commission_deducted: 0,
    net_earnings: 0,
    withdrawable_balance: 0,
    pending_balance: 0,
  };
}

async function getFirstRaw(token: string, paths: string[]): Promise<unknown> {
  for (const path of paths) {
    try {
      return await apiGet<unknown>(path, token);
    } catch (e) {
      const st = (e as { status?: number }).status;
      if (st === 404 || st === 405) continue;
      throw e;
    }
  }
  return null;
}

async function postFirstAvailable(
  token: string,
  paths: string[],
  body: Record<string, unknown>
): Promise<void> {
  let lastErr: unknown;
  for (const path of paths) {
    try {
      await apiPost(path, body, token);
      return;
    } catch (e) {
      const st = (e as { status?: number }).status;
      if (st === 404 || st === 405) {
        lastErr = e;
        continue;
      }
      throw e;
    }
  }
  throw (lastErr ?? new Error('No payout endpoint available on backend.'));
}

function parsePayoutList(raw: unknown): PayoutRecord[] {
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw
    : (raw as { data?: unknown[]; payouts?: unknown[] })?.data ??
      (raw as { payouts?: unknown[] })?.payouts ??
      [];
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      const o = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      const id = String(o.id ?? o.payout_id ?? '');
      if (!id.trim()) return null;
      return {
        id,
        amount: num(o.amount),
        status: String(o.status ?? 'pending'),
        created_at: typeof o.created_at === 'string' ? o.created_at : undefined,
        provider: typeof o.provider === 'string' ? o.provider : undefined,
        reference: typeof o.reference === 'string' ? o.reference : undefined,
      } as PayoutRecord;
    })
    .filter((v): v is PayoutRecord => Boolean(v));
}

export async function fetchVendorFinanceSummary(token: string): Promise<FinanceSummary> {
  return getFirstAvailable(token, [
    '/vendor/finance-summary',
    '/vendor/earnings-summary',
    '/vendor/wallet/summary',
  ]);
}

export async function fetchTransporterFinanceSummary(token: string): Promise<FinanceSummary> {
  return getFirstAvailable(token, [
    '/transporter/finance-summary',
    '/transporter/earnings-summary',
    '/transporter/wallet/summary',
  ]);
}

export async function fetchVendorPayoutHistory(token: string): Promise<PayoutRecord[]> {
  const raw = await getFirstRaw(token, ['/vendor/payouts', '/vendor/withdrawals', '/vendor/wallet/payouts']);
  return parsePayoutList(raw);
}

export async function fetchTransporterPayoutHistory(token: string): Promise<PayoutRecord[]> {
  const raw = await getFirstRaw(token, [
    '/transporter/payouts',
    '/transporter/withdrawals',
    '/transporter/wallet/payouts',
  ]);
  return parsePayoutList(raw);
}

export async function requestVendorPayout(token: string, amount: number): Promise<void> {
  await postFirstAvailable(token, ['/vendor/payouts/request', '/vendor/withdrawals/request'], { amount });
}

export async function requestTransporterPayout(token: string, amount: number): Promise<void> {
  await postFirstAvailable(token, ['/transporter/payouts/request', '/transporter/withdrawals/request'], { amount });
}
