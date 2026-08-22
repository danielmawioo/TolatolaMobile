import {
  AUTH_EMAIL_VERIFY_RESEND_PATH,
  AUTH_EMAIL_VERIFY_SUBMIT_PATH,
} from '@/src/config/env';
import type { SignupAuthBundle } from '@/src/lib/signupResponse';
import { parseAuthEnvelope } from '@/src/lib/signupResponse';
import { apiPost } from '@/src/services/api';

export async function submitEmailVerificationCode(
  email: string,
  code: string,
  accessToken?: string | null
): Promise<SignupAuthBundle | null> {
  const raw = await apiPost<unknown>(
    AUTH_EMAIL_VERIFY_SUBMIT_PATH,
    { email: email.trim().toLowerCase(), code: code.trim() },
    accessToken ?? null
  );
  return parseAuthEnvelope(raw);
}

export async function resendEmailVerification(
  email: string,
  accessToken?: string | null
): Promise<void> {
  await apiPost(
    AUTH_EMAIL_VERIFY_RESEND_PATH,
    { email: email.trim().toLowerCase() },
    accessToken ?? null
  );
}
