/**
 * Post-login redirect and role normalization.
 * admin → Admin dashboard, vendor → Vendor dashboard, transporter → Transporter dashboard,
 * agent → Agent dashboard, customer or default → Shop (buyer home).
 */
export type UserType = 'admin' | 'vendor' | 'transporter' | 'customer' | 'agent';

const GENERIC_ROLES = new Set(['user', 'member', 'personal', 'business']);

export function normalizeUserType(raw: string | undefined | null): UserType {
  if (!raw) return 'customer';
  const lower = raw.trim().toLowerCase();
  if (lower === 'admin') return 'admin';
  if (lower === 'vendor' || lower === 'shop_owner' || lower === 'retailer' || lower === 'seller') {
    return 'vendor';
  }
  if (
    lower === 'transporter' ||
    lower === 'logistics_provider' ||
    lower === 'logistics' ||
    lower === 'driver'
  ) {
    return 'transporter';
  }
  if (lower === 'agent') return 'agent';
  return 'customer';
}

export function roleFromRecord(
  record: Record<string, unknown> | null | undefined
): string | undefined {
  if (!record) return undefined;
  const candidates = [record.user_type, record.type, record.role, record.user_role];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      const val = c.trim().toLowerCase();
      if (!GENERIC_ROLES.has(val)) {
        return c.trim();
      }
    }
  }
  return undefined;
}

export function mapWebPathToExpo(path: string): string {
  if (path === '/shop' || path === '/shop/' || path === '/') {
    return '/(tabs)';
  }
  return path;
}

export function sanitizePostAuthRedirect(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed === '/') {
    return null;
  }
  return mapWebPathToExpo(trimmed);
}

export function needsCompleteProfileUser(
  user: { user_type?: string } | null | undefined
): boolean {
  return !user || !user.user_type || !user.user_type.trim();
}

export function sessionNeedsCompleteProfile(
  session: { user?: { user_type?: string } } | null | undefined
): boolean {
  return !session?.user || needsCompleteProfileUser(session.user);
}

export function getUserRoleFromSession(
  session: { user?: { user_type?: string } } | null | undefined
): UserType {
  return normalizeUserType(session?.user?.user_type);
}

export function getRoleRedirectPath(userType: string | undefined): string {
  const normalized = normalizeUserType(userType);
  switch (normalized) {
    case 'admin':
      return '/(admin)';
    case 'vendor':
      return '/(vendor)/dashboard';
    case 'transporter':
      return '/(transporter)/dashboard';
    case 'agent':
      return '/(agent)/dashboard';
    case 'customer':
    default:
      return '/(tabs)';
  }
}

export function resolvePostLoginDestination(params: {
  user?: { user_type?: string };
  returnUrl?: string | null;
  next?: string | null;
  redirect?: string | null;
}): string {
  const returnDest = sanitizePostAuthRedirect(params.returnUrl);
  if (returnDest) return returnDest;

  const nextDest = sanitizePostAuthRedirect(params.next);
  if (nextDest) return nextDest;

  const redirectDest = sanitizePostAuthRedirect(params.redirect);
  if (redirectDest) return redirectDest;

  return getRoleRedirectPath(params.user?.user_type);
}
