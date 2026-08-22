/**
 * Map API/auth failures to stable UI copy and detect session expiry.
 */

const SESSION_HINT =
  /jwt|invalid\s*token|token\s*(expired|invalid)|expired\s*token|session\s*(expired|invalid)|unauthori[sz]ed/i;

export function getErrorHttpStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'status' in error) {
    const s = (error as { status: unknown }).status;
    return typeof s === 'number' ? s : undefined;
  }
  return undefined;
}

export function isAuthSessionApiError(error: unknown): boolean {
  const status = getErrorHttpStatus(error);
  if (status === 401 || status === 403) return true;
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return SESSION_HINT.test(msg);
}

export const SESSION_EXPIRED_USER_MESSAGE = 'Your session expired. Please sign in again.';

export function userFacingMessageForApiError(error: unknown): string {
  if (isAuthSessionApiError(error)) return SESSION_EXPIRED_USER_MESSAGE;
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return 'Something went wrong. Please try again.';
}
