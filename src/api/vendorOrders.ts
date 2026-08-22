import { apiGet, apiPost } from '@/src/services/api';

export type VendorOrderAction =
  | 'accept'
  | 'reject'
  | 'prepare'
  | 'dispatch'
  | 'complete'
  | 'mark_completed'
  | 'mark_as_completed';

export type AssignableTransporter = {
  id: string;
  name: string;
  vehicle_type?: string;
  distance_km?: number;
  eta_minutes?: number;
  rating?: number;
};

function toId(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function normText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function tryPostPaths<T>(
  paths: string[],
  body: Record<string, unknown>,
  token: string
): Promise<T> {
  let lastErr: unknown;
  for (const path of paths) {
    try {
      return await apiPost<T>(path, body, token);
    } catch (e) {
      const st = (e as { status?: number }).status;
      if (st === 404 || st === 405) {
        lastErr = e;
        continue;
      }
      throw e;
    }
  }
  throw (lastErr ?? new Error('No supported backend endpoint for this operation.'));
}

export async function runVendorOrderAction(
  token: string,
  orderId: string,
  action: VendorOrderAction,
  extra?: { reason?: string }
): Promise<void> {
  const id = encodeURIComponent(orderId);
  const reason = normText(extra?.reason);
  const body: Record<string, unknown> = {
    action,
    ...(reason ? { reason } : {}),
  };
  await tryPostPaths(
    [
      `/vendor/orders/${id}/action`,
      `/vendor/orders/${id}/status`,
      `/orders/${id}/vendor-action`,
      `/orders/${id}/action`,
    ],
    body,
    token
  );
}

export async function fetchAssignableTransporters(
  token: string,
  orderId: string
): Promise<AssignableTransporter[]> {
  const id = encodeURIComponent(orderId);
  const candidates = [
    `/vendor/orders/${id}/available-transporters`,
    `/vendor/orders/${id}/transporters`,
    `/orders/${id}/available-transporters`,
  ];
  let raw: unknown = [];
  let lastErr: unknown;
  for (const path of candidates) {
    try {
      raw = await apiGet<unknown>(path, token);
      lastErr = null;
      break;
    } catch (e) {
      const st = (e as { status?: number }).status;
      if (st === 404 || st === 405) {
        lastErr = e;
        continue;
      }
      throw e;
    }
  }
  if (lastErr) return [];

  const list = Array.isArray(raw)
    ? raw
    : (raw as { data?: unknown[]; drivers?: unknown[]; transporters?: unknown[] })?.data ??
      (raw as { drivers?: unknown[] })?.drivers ??
      (raw as { transporters?: unknown[] })?.transporters ??
      [];

  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      const o = item as Record<string, unknown>;
      const idVal = toId(o.id ?? o.transporter_id ?? o.driver_id);
      if (!idVal) return null;
      return {
        id: idVal,
        name: normText(o.name ?? o.full_name ?? o.driver_name) || 'Transporter',
        vehicle_type: normText(o.vehicle_type ?? o.vehicleType) || undefined,
        distance_km: Number.isFinite(Number(o.distance_km)) ? Number(o.distance_km) : undefined,
        eta_minutes: Number.isFinite(Number(o.eta_minutes)) ? Number(o.eta_minutes) : undefined,
        rating: Number.isFinite(Number(o.rating)) ? Number(o.rating) : undefined,
      } as AssignableTransporter;
    })
    .filter((v): v is AssignableTransporter => Boolean(v));
}

export async function assignTransporterToOrder(
  token: string,
  orderId: string,
  transporterId: string
): Promise<void> {
  const id = encodeURIComponent(orderId);
  const tId = toId(transporterId);
  if (!tId) throw new Error('Invalid transporter id');
  const body = {
    transporter_id: tId,
    driver_id: tId,
    transporterId: tId,
  };
  await tryPostPaths(
    [
      `/vendor/orders/${id}/assign-transporter`,
      `/vendor/orders/${id}/assign`,
      `/orders/${id}/assign-transporter`,
    ],
    body,
    token
  );
}
