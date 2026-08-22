import { apiGet } from '@/src/services/api';
import { normalizeVendorShopPayload, vendorShopHasIdentifyingId } from '@/src/lib/vendorShop';

export type KycGate = 'ok' | 'pending' | 'rejected' | 'unknown';

export function pickKycStatus(obj: Record<string, unknown> | null | undefined): KycGate {
  if (!obj || typeof obj !== 'object') return 'unknown';
  const raw =
    obj.kyc_status ??
    obj.kycStatus ??
    obj.vendor_kyc_status ??
    obj.transporter_kyc_status ??
    obj.verification_status;
  if (typeof raw !== 'string') return 'unknown';
  const s = raw.trim().toLowerCase();
  if (s === 'pending' || s === 'submitted' || s === 'in_review' || s === 'in-review') return 'pending';
  if (s === 'rejected' || s === 'failed' || s === 'denied') return 'rejected';
  if (s === 'approved' || s === 'verified' || s === 'active') return 'ok';
  return 'unknown';
}

export type VendorGateSnapshot =
  | { screen: 'dashboard'; shop: Record<string, unknown> }
  | { screen: 'register' }
  | { screen: 'kyc-pending'; source: Record<string, unknown> }
  | { screen: 'kyc-rejected'; source: Record<string, unknown> };

function shopHasId(shop: Record<string, unknown>): boolean {
  return vendorShopHasIdentifyingId(shop);
}

/**
 * Vendor dashboard guard (web parity): shop first, then vendors list, then register; KYC refines.
 */
export async function resolveVendorGate(token: string): Promise<VendorGateSnapshot> {
  try {
    const shopRaw = await apiGet<Record<string, unknown>>('/vendor/shop', token);
    if (shopRaw && typeof shopRaw === 'object' && shopHasId(shopRaw)) {
      const shop = normalizeVendorShopPayload(shopRaw) ?? shopRaw;
      const kyc = pickKycStatus(shop);
      if (kyc === 'pending') return { screen: 'kyc-pending', source: shop };
      if (kyc === 'rejected') return { screen: 'kyc-rejected', source: shop };
      return { screen: 'dashboard', shop };
    }
  } catch (e) {
    const st = (e as { status?: number }).status;
    if (st !== 404 && st !== 400) throw e;
  }

  let vendors: Record<string, unknown>[] = [];
  try {
    const raw = await apiGet<unknown>('/vendors', token);
    const list = Array.isArray(raw) ? raw : (raw as { data?: unknown[] })?.data;
    vendors = Array.isArray(list)
      ? list.filter((v): v is Record<string, unknown> => Boolean(v && typeof v === 'object'))
      : [];
  } catch {
    vendors = [];
  }

  if (vendors.length === 0) {
    return { screen: 'register' };
  }

  const firstRaw = vendors[0]!;
  const first = normalizeVendorShopPayload(firstRaw) ?? firstRaw;
  const kyc = pickKycStatus(first);
  if (kyc === 'pending') return { screen: 'kyc-pending', source: first };
  if (kyc === 'rejected') return { screen: 'kyc-rejected', source: first };
  return { screen: 'dashboard', shop: first };
}

export type TransporterGateSnapshot =
  | { screen: 'dashboard'; record: Record<string, unknown> }
  | { screen: 'register' }
  | { screen: 'kyc-pending'; source: Record<string, unknown> }
  | { screen: 'kyc-rejected'; source: Record<string, unknown> };

async function fetchTransporterMe(token: string): Promise<Record<string, unknown> | null> {
  for (const path of ['/transporters/me', '/transporter/me']) {
    try {
      const r = await apiGet<Record<string, unknown>>(path, token);
      if (r && typeof r === 'object') return r;
    } catch (e) {
      const st = (e as { status?: number }).status;
      if (st !== 404 && st !== 400) throw e;
    }
  }
  return null;
}

export async function resolveTransporterGate(token: string): Promise<TransporterGateSnapshot> {
  const me = await fetchTransporterMe(token);
  if (!me) {
    return { screen: 'register' };
  }
  const kyc = pickKycStatus(me);
  if (kyc === 'pending') return { screen: 'kyc-pending', source: me };
  if (kyc === 'rejected') return { screen: 'kyc-rejected', source: me };
  return { screen: 'dashboard', record: me };
}

/**
 * Admin home is allowed only when backend grants a role (web: GET admin/my-role).
 */
export async function fetchAdminMyRole(token: string): Promise<Record<string, unknown> | string | null> {
  try {
    return await apiGet<Record<string, unknown> | string>('/admin/my-role', token);
  } catch {
    return null;
  }
}

export function adminMyRoleGranted(data: Record<string, unknown> | string | null | undefined): boolean {
  if (data == null) return false;
  if (typeof data === 'string') return data.trim().length > 0;
  const role = data.role ?? data.admin_role ?? data.name ?? data.slug;
  if (typeof role === 'string' && role.trim()) return true;
  const ok = data.hasAccess ?? data.has_access;
  if (typeof ok === 'boolean') return ok;
  return Object.keys(data).length > 0;
}

function normTokenSet(values: unknown[]): Set<string> {
  return new Set(
    values
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function adminAllowedModules(data: Record<string, unknown> | string | null | undefined): Set<string> {
  if (data == null) return new Set();
  if (typeof data === 'string') {
    const role = data.trim().toLowerCase();
    if (!role) return new Set();
    if (role.includes('super')) return new Set(['*']);
    return new Set();
  }
  const roleRaw = data.role ?? data.admin_role ?? data.name ?? data.slug;
  const role = typeof roleRaw === 'string' ? roleRaw.trim().toLowerCase() : '';
  if (role.includes('super')) return new Set(['*']);

  const directPermissions = Array.isArray(data.permissions) ? data.permissions : [];
  const modules = Array.isArray(data.modules) ? data.modules : [];
  const scopes = Array.isArray(data.scopes) ? data.scopes : [];
  const set = normTokenSet([...(directPermissions as unknown[]), ...(modules as unknown[]), ...(scopes as unknown[])]);
  if (set.size > 0) return set;

  if (role.includes('cto') || role.includes('it')) {
    return new Set(['analytics', 'vendor_kyc', 'transporter_kyc', 'product_approval', 'orders', 'payouts', 'support', 'promotions']);
  }
  if (role.includes('vendor')) return new Set(['vendor_kyc', 'product_approval', 'orders', 'support']);
  if (role.includes('consumer')) return new Set(['orders', 'support', 'analytics']);
  if (role.includes('transporter')) return new Set(['transporter_kyc', 'orders', 'support']);
  if (role.includes('cfo') || role.includes('account')) return new Set(['analytics', 'payouts', 'orders']);
  if (role.includes('hr')) return new Set(['support']);
  if (role.includes('marketing')) return new Set(['promotions', 'analytics', 'support']);
  return new Set();
}
