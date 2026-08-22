/**
 * Read phone from JWT/session user or API profile payloads (keys vary by backend).
 */
export function extractPhoneFromUser(user: Record<string, unknown> | null | undefined): string {
  if (!user) return '';
  const keys = ['phone', 'phone_number', 'mobile', 'mobile_phone', 'msisdn', 'phoneNumber', 'telephone'];
  for (const k of keys) {
    const v = user[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

/**
 * Normalize profile phone for Tanzania-style mobile money fields (digits, optional leading 0).
 */
export function formatPhoneForCheckoutInput(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const d = t.replace(/\D/g, '');
  if (d.startsWith('255') && d.length >= 12) {
    return `0${d.slice(3)}`;
  }
  if (d.startsWith('0') && d.length >= 10) {
    return d;
  }
  if (d.length >= 9 && d.length <= 12 && !t.startsWith('+')) {
    return t.replace(/\s/g, '');
  }
  return t.replace(/\s/g, '');
}
