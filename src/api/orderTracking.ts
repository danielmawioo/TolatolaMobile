import { apiGet } from '@/src/services/api';

export type OrderTrackingSnapshot = {
  status?: string;
  eta_minutes?: number;
  distance_km?: number;
  driver_name?: string;
  driver_phone_masked?: string;
  driver_location?: { lat: number; lng: number } | null;
  route_points?: Array<{ lat: number; lng: number }>;
};

function normText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parsePoint(value: unknown): { lat: number; lng: number } | null {
  if (!value || typeof value !== 'object') return null;
  const o = value as Record<string, unknown>;
  const lat = Number(o.lat ?? o.latitude);
  const lng = Number(o.lng ?? o.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export async function fetchOrderTrackingSnapshot(
  token: string,
  orderId: string
): Promise<OrderTrackingSnapshot | null> {
  const id = encodeURIComponent(orderId);
  const candidates = [`/orders/${id}/tracking`, `/tracking/order/${id}`, `/tracking/${id}`];
  let raw: unknown = null;
  for (const path of candidates) {
    try {
      raw = await apiGet<unknown>(path, token);
      break;
    } catch (e) {
      const st = (e as { status?: number }).status;
      if (st === 404 || st === 405) continue;
      throw e;
    }
  }
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const data = (o.data && typeof o.data === 'object' ? o.data : o) as Record<string, unknown>;
  const driver = data.driver && typeof data.driver === 'object' ? (data.driver as Record<string, unknown>) : null;
  const routeRaw = Array.isArray(data.route_points) ? data.route_points : Array.isArray(data.route) ? data.route : [];
  return {
    status: typeof data.status === 'string' ? data.status : undefined,
    eta_minutes: Number.isFinite(Number(data.eta_minutes ?? data.eta)) ? Number(data.eta_minutes ?? data.eta) : undefined,
    distance_km: Number.isFinite(Number(data.distance_km ?? data.distance)) ? Number(data.distance_km ?? data.distance) : undefined,
    driver_name: normText(data.driver_name ?? data.transporter_name ?? driver?.name),
    driver_phone_masked: normText(data.driver_phone_masked ?? data.transporter_phone_masked),
    driver_location: parsePoint(data.driver_location ?? data.transporter_location),
    route_points: routeRaw.map(parsePoint).filter((p): p is { lat: number; lng: number } => Boolean(p)),
  };
}
