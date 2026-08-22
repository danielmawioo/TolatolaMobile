import { getApiBaseUrl } from '@/src/services/api';
import { logger } from '@/src/lib/logger';

const HEALTH_CHECK_TIMEOUT_MS = 5000;

export type ApiHealthResult = {
  ok: boolean;
  latencyMs?: number;
};

/**
 * Lightweight backend reachability check. Pings the API base URL with a
 * short-timeout fetch and reports whether it responded and how fast.
 *
 * Deliberately never throws — this is a best-effort signal for UI/telemetry,
 * not a request that should participate in the app's typed-error flow (see
 * `apiGet`/`AppError` in `@/src/services/api` for that path).
 */
export async function checkApiHealth(): Promise<ApiHealthResult> {
  const url = getApiBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    const latencyMs = Date.now() - startedAt;

    if (res.ok) {
      logger.info('[HEALTH] API reachable', { latencyMs });
      return { ok: true, latencyMs };
    }

    logger.warn('[HEALTH] API responded with an error status', { status: res.status, latencyMs });
    return { ok: false, latencyMs };
  } catch (err) {
    logger.warn('[HEALTH] API health check failed', err instanceof Error ? err.message : err);
    return { ok: false };
  } finally {
    clearTimeout(timeout);
  }
}
