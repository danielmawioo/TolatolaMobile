import { APP_API_URL } from '@/src/config/env';

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

/**
 * Fetch from the Tolatola backend. Automatically prefixes path with API base and
 * adds Authorization: Bearer <accessToken> when provided.
 */
export async function apiFetch(
  path: string,
  init?: ApiRequestInit
): Promise<Response> {
  const { accessToken, headers: initHeaders, ...rest } = init ?? {};
  const url = path.startsWith('http') ? path : `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(initHeaders);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (!headers.has('Content-Type') && !(rest.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...rest, headers });
}

/**
 * Convenience: GET JSON from API.
 */
export async function apiGet<T = unknown>(
  path: string,
  accessToken?: string | null
): Promise<T> {
  const res = await apiFetch(path, { method: 'GET', accessToken });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

/**
 * Convenience: POST JSON to API.
 */
export async function apiPost<T = unknown>(
  path: string,
  body?: object,
  accessToken?: string | null
): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    accessToken,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
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
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
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
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
