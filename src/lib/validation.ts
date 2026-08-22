/** Basic email shape check for client-side validation before API calls. */
export function isValidEmail(value: string): boolean {
  const s = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/** Accepts local or +country formatted phone; returns digits-only canonical form when valid. */
export function normalizePhoneDigits(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length >= 9 && digits.length <= 15) return digits;
  return null;
}

export function isValidPhone(value: string): boolean {
  return normalizePhoneDigits(value) != null;
}
