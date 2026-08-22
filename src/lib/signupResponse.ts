import type { User } from '@/src/contexts/AuthContext'; // type-only — avoids runtime cycle with AuthContext

export type SignupAuthBundle = {
  user: User;
  session: { access_token: string; refresh_token?: string; expires_at?: number };
};

export type SignupVerificationMeta = {
  requiresPhoneVerification: boolean;
  requiresEmailVerification: boolean;
  verificationEmailSent: boolean;
  verificationSmsSent: boolean;
  email: string;
  phone?: string;
  serverMessage?: string;
};

export type ParsedSignupPayload = SignupVerificationMeta & {
  /** Present when the API returned a usable session (mobile can hydrate profile). */
  auth: SignupAuthBundle | null;
};

function readBool(obj: Record<string, unknown>, keys: string[]): boolean {
  for (const k of keys) {
    const v = obj[k];
    if (v === true) return true;
    if (v === 1 || v === '1' || v === 'true') return true;
  }
  return false;
}

/** Merge common API wrappers: `{ data: { ... } }` flattened with top-level keys winning. */
function flatRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const data = o.data;
  if (data != null && typeof data === 'object' && !Array.isArray(data)) {
    return { ...(data as Record<string, unknown>), ...o };
  }
  return o;
}

function normalizeUserFromPayload(u: unknown): User | null {
  if (!u || typeof u !== 'object') return null;
  const o = u as Record<string, unknown>;
  const idRaw = o.id;
  const id =
    typeof idRaw === 'string'
      ? idRaw.trim()
      : typeof idRaw === 'number' && Number.isFinite(idRaw)
        ? String(idRaw)
        : '';
  if (!id) return null;
  return { ...o, id } as User;
}

export function parseAuthEnvelope(raw: unknown): SignupAuthBundle | null {
  const flat = flatRecord(raw);
  return extractAuthBundle(flat);
}

function extractAuthBundle(flat: Record<string, unknown>): SignupAuthBundle | null {
  const sessionObj =
    flat.session != null && typeof flat.session === 'object'
      ? (flat.session as Record<string, unknown>)
      : null;
  const accessToken =
    (sessionObj && typeof sessionObj.access_token === 'string' ? sessionObj.access_token : undefined) ??
    (typeof flat.access_token === 'string' ? flat.access_token : undefined);
  if (!accessToken) return null;

  const user = normalizeUserFromPayload(flat.user);
  if (!user) return null;

  return {
    user,
    session: {
      access_token: accessToken,
      refresh_token:
        (sessionObj && typeof sessionObj.refresh_token === 'string' ? sessionObj.refresh_token : undefined) ??
        (typeof flat.refresh_token === 'string' ? flat.refresh_token : undefined),
      expires_at:
        (sessionObj && typeof sessionObj.expires_at === 'number' ? sessionObj.expires_at : undefined) ??
        (typeof flat.expires_at === 'number' ? flat.expires_at : undefined),
    },
  };
}

/**
 * Normalizes POST /auth/signup JSON so the app can route to email / phone verification
 * when the backend sends flags (see docs/BACKEND_AUTH_VERIFICATION_SIGNUP.md).
 */
export function parseSignupPayload(raw: unknown, context: { email: string; phone?: string }): ParsedSignupPayload {
  const flat = flatRecord(raw);

  const requiresPhoneVerification = readBool(flat, [
    'requires_phone_verification',
    'phone_verification_required',
    'phone_unverified',
    'must_verify_phone',
  ]);
  const requiresEmailVerification = readBool(flat, [
    'requires_email_verification',
    'email_verification_required',
    'email_unverified',
    'must_verify_email',
  ]);
  const verificationEmailSent = readBool(flat, [
    'verification_email_sent',
    'email_verification_sent',
    'confirmation_email_sent',
  ]);
  const verificationSmsSent = readBool(flat, [
    'verification_sms_sent',
    'sms_otp_sent',
    'phone_otp_sent',
    'otp_sent',
  ]);

  const email =
    (typeof flat.email === 'string' && flat.email.trim() ? flat.email.trim().toLowerCase() : undefined) ??
    context.email.trim().toLowerCase();

  const phoneFromApi = typeof flat.phone === 'string' ? flat.phone.trim() : undefined;
  const phone = phoneFromApi || context.phone?.trim() || undefined;

  const serverMessage =
    (typeof flat.message === 'string' && flat.message.trim() ? flat.message : undefined) ??
    (typeof flat.detail === 'string' && flat.detail.trim() ? flat.detail : undefined);

  return {
    auth: extractAuthBundle(flat),
    requiresPhoneVerification,
    requiresEmailVerification,
    verificationEmailSent,
    verificationSmsSent,
    email,
    phone,
    serverMessage,
  };
}
