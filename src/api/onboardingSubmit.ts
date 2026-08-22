import { apiFetch, apiPost } from '@/src/services/api';

export async function submitVendorRegistrationJson(
  token: string,
  body: Record<string, unknown>
): Promise<boolean> {
  const paths = ['/vendor/kyc', '/vendor/onboarding', '/kyc/vendor', '/vendor/register'];
  let lastErr: unknown;
  for (const path of paths) {
    try {
      await apiPost(path, body, token);
      return true;
    } catch (e) {
      lastErr = e;
      const st = (e as { status?: number }).status;
      if (st === 404 || st === 405) continue;
      throw e;
    }
  }
  if (lastErr instanceof Error) throw lastErr;
  throw new Error('Vendor registration endpoint not available.');
}

export async function submitTransporterRegistrationFormData(
  token: string,
  formData: FormData
): Promise<boolean> {
  const paths = ['/transporter/kyc', '/transporter/onboarding', '/kyc/transporter'];
  let lastErr: unknown;
  for (const path of paths) {
    try {
      const res = await apiFetch(path, {
        method: 'POST',
        body: formData,
        accessToken: token,
        headers: new Headers(),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let msg = text || `Request failed: ${res.status}`;
        try {
          const j = JSON.parse(text) as { message?: string; error?: string };
          msg = j.message || j.error || msg;
        } catch {
          /* keep msg */
        }
        const err = new Error(msg);
        (err as { status?: number }).status = res.status;
        throw err;
      }
      return true;
    } catch (e) {
      lastErr = e;
      const st = (e as { status?: number }).status;
      if (st === 404 || st === 405) continue;
      throw e;
    }
  }
  if (lastErr instanceof Error) throw lastErr;
  throw new Error('Transporter registration endpoint not available.');
}
