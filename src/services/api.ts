import type { ZodType } from 'zod';
import { APP_API_URL } from '@/src/config/env';
import { logger } from '@/src/lib/logger';
import { AppError, classifyStatus } from '@/src/lib/errors';
import { parseApiResponse } from '@/src/lib/parseApi';

function decode<T>(json: unknown, schema?: ZodType<T>): T {
  return schema ? parseApiResponse(schema, json) : (json as T);
}

const baseUrl = APP_API_URL.replace(/\/$/, '');
const apiPrefix = '/api';

/**
 * Base URL for Tolatola API (e.g. https://api.tolatola.co/api).
 */
export function getApiBaseUrl(): string {
  return `${baseUrl}${apiPrefix}`;
}

export type ApiRequestInit = RequestInit & {
  accessToken?: string | null;
};

let _on401Handler: (() => Promise<string | null>) | null = null;

/**
 * Set a callback to execute when a 401 response is received.
 * Should attempt to refresh session tokens and return the new access token.
 */
export function setOn401Handler(handler: () => Promise<string | null>) {
  _on401Handler = handler;
}

/**
 * Fetch from the Tolatola backend. Automatically prefixes path with API base and
 * adds Authorization: Bearer <accessToken> when provided.
 *
 * Implements an automatic retry interceptor on 401. Network-level failures
 * (fetch itself rejecting, e.g. no connectivity) are re-thrown as AppError('network').
 */
export async function apiFetch(
  path: string,
  init?: ApiRequestInit
): Promise<Response> {
  const { accessToken, headers: initHeaders, ...rest } = init ?? {};
  const url = path.startsWith('http') ? path : `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(initHeaders);
  let activeToken = accessToken;

  if (activeToken) {
    headers.set('Authorization', `Bearer ${activeToken}`);
  }
  if (!headers.has('Content-Type') && !(rest.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers });
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Network request failed', 'network');
  }

  // On 401, attempt silent token refresh and retry
  if (res.status === 401 && _on401Handler) {
    try {
      logger.info('[API] 401 Unauthorized detected. Attempting token refresh...');
      const newToken = await _on401Handler();
      if (newToken) {
        logger.info('[API] Token refresh succeeded. Retrying request with new token.');
        headers.set('Authorization', `Bearer ${newToken}`);
        return fetch(url, { ...rest, headers });
      }
    } catch (err) {
      logger.error('[API] Direct token refresh intercept failed:', err);
    }
  }

  return res;
}

/**
 * Builds the AppError for a non-ok response, extracting the server's message
 * (including the field-level detail Laravel-style 422 validation errors carry).
 */
async function errorFromResponse(res: Response): Promise<AppError> {
  const errorBody = await res.json().catch(() => ({}));
  let message = errorBody.message || errorBody.error || res.statusText;
  if (res.status === 422 && errorBody?.errors && typeof errorBody.errors === 'object') {
    const first = Object.entries(errorBody.errors)[0] as [string, unknown] | undefined;
    if (first) {
      const [field, msgs] = first;
      const msgText = Array.isArray(msgs) ? msgs[0] : String(msgs);
      const prettyField = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
      message = `${prettyField}: ${msgText}`;
    }
  }
  return new AppError(message || `Request failed with status ${res.status}`, classifyStatus(res.status), res.status);
}

/**
 * Convenience: GET JSON from API.
 */
export async function apiGet<T = unknown>(
  path: string,
  accessToken?: string | null,
  schema?: ZodType<T>
): Promise<T> {
  const res = await apiFetch(path, { method: 'GET', accessToken });
  if (!res.ok) {
    throw await errorFromResponse(res);
  }
  return decode(await res.json(), schema);
}

/**
 * Convenience: POST JSON to API.
 */
export async function apiPost<T = unknown>(
  path: string,
  body?: object,
  accessToken?: string | null,
  schema?: ZodType<T>
): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    accessToken,
  });
  if (!res.ok) {
    throw await errorFromResponse(res);
  }
  const text = await res.text();
  return decode(text ? JSON.parse(text) : undefined, schema);
}

/**
 * Convenience: PATCH JSON to API.
 */
export async function apiPatch<T = unknown>(
  path: string,
  body?: object,
  accessToken?: string | null
): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
    accessToken,
  });
  if (!res.ok) {
    throw await errorFromResponse(res);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/**
 * Convenience: PUT JSON to API.
 */
export async function apiPut<T = unknown>(
  path: string,
  body?: object,
  accessToken?: string | null
): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
    accessToken,
  });
  if (!res.ok) {
    throw await errorFromResponse(res);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/**
 * Convenience: DELETE from API.
 */
export async function apiDelete<T = unknown>(
  path: string,
  accessToken?: string | null
): Promise<T> {
  const res = await apiFetch(path, {
    method: 'DELETE',
    accessToken,
  });
  if (!res.ok) {
    throw await errorFromResponse(res);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
