import { apiGet, apiPost, apiPatch, apiPut, apiDelete, apiFetch, setOn401Handler } from '@/src/services/api';
import { AppError } from '@/src/lib/errors';

function mockFetchOnce(status: number, body: unknown, ok = status >= 200 && status < 300) {
  return jest.fn().mockResolvedValueOnce({
    ok,
    status,
    statusText: 'Status',
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

describe('apiGet', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns parsed JSON on success', async () => {
    global.fetch = mockFetchOnce(200, { id: 1, name: 'Shop' }) as any;

    const result = await apiGet<{ id: number; name: string }>('/shops/1');

    expect(result).toEqual({ id: 1, name: 'Shop' });
  });

  it('throws an AppError with the server message on error', async () => {
    global.fetch = mockFetchOnce(404, { message: 'Not found' }, false) as any;

    try {
      await apiGet('/shops/999');
      throw new Error('expected apiGet to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).message).toBe('Not found');
      expect((err as AppError).status).toBe(404);
      expect((err as AppError).kind).toBe('unknown');
    }
  });

  it('formats a 422 validation error using the first field, classified as "validation"', async () => {
    global.fetch = mockFetchOnce(
      422,
      { errors: { shop_id: ['is required'] } },
      false
    ) as any;

    await expect(apiGet('/orders')).rejects.toThrow('Shop id: is required');
  });

  it('classifies a 401 as an "auth" AppError', async () => {
    global.fetch = mockFetchOnce(401, { message: 'Unauthorized' }, false) as any;

    try {
      await apiGet('/profile');
      throw new Error('expected apiGet to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).kind).toBe('auth');
    }
  });

  it('classifies a 500 as a "server" AppError', async () => {
    global.fetch = mockFetchOnce(500, { message: 'Boom' }, false) as any;

    try {
      await apiGet('/orders');
      throw new Error('expected apiGet to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).kind).toBe('server');
    }
  });

  it('wraps a network failure (fetch itself rejecting) in a "network" AppError', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Failed to fetch')) as any;

    try {
      await apiGet('/orders');
      throw new Error('expected apiGet to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).kind).toBe('network');
      expect((err as AppError).message).toBe('Failed to fetch');
    }
  });
});

describe('apiPost', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends a JSON body and returns the parsed response', async () => {
    const fetchMock = mockFetchOnce(201, { id: 42 });
    global.fetch = fetchMock as any;

    const result = await apiPost<{ id: number }>('/orders', { shop_id: 'abc' });

    expect(result).toEqual({ id: 42 });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ shop_id: 'abc' }));
  });

  it('throws with the server message on error', async () => {
    global.fetch = mockFetchOnce(400, { error: 'Bad request' }, false) as any;

    await expect(apiPost('/orders', {})).rejects.toThrow('Bad request');
  });
});

describe('apiPatch', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends a PATCH request and returns the parsed response', async () => {
    const fetchMock = mockFetchOnce(200, { id: 1, status: 'updated' });
    global.fetch = fetchMock as any;

    const result = await apiPatch<{ id: number; status: string }>('/orders/1', {
      status: 'updated',
    });

    expect(result).toEqual({ id: 1, status: 'updated' });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('PATCH');
  });

  it('throws with the server message on error', async () => {
    global.fetch = mockFetchOnce(500, { message: 'Server error' }, false) as any;

    await expect(apiPatch('/orders/1', {})).rejects.toThrow('Server error');
  });

  it('propagates a network failure (fetch itself rejecting)', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network request failed')) as any;

    await expect(apiPatch('/orders/1', {})).rejects.toThrow('Network request failed');
  });
});

describe('apiPut', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends a PUT request and returns the parsed response', async () => {
    const fetchMock = mockFetchOnce(200, { id: 1, status: 'replaced' });
    global.fetch = fetchMock as any;

    const result = await apiPut<{ id: number; status: string }>('/orders/1', { status: 'replaced' });

    expect(result).toEqual({ id: 1, status: 'replaced' });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('PUT');
  });

  it('throws with the server message on a non-2xx response', async () => {
    global.fetch = mockFetchOnce(403, { message: 'Forbidden' }, false) as any;

    await expect(apiPut('/orders/1', {})).rejects.toThrow('Forbidden');
  });

  it('propagates a network failure (fetch itself rejecting)', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network request failed')) as any;

    await expect(apiPut('/orders/1', {})).rejects.toThrow('Network request failed');
  });
});

describe('apiDelete', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends a DELETE request and returns the parsed response', async () => {
    const fetchMock = mockFetchOnce(200, { success: true });
    global.fetch = fetchMock as any;

    const result = await apiDelete<{ success: boolean }>('/orders/1');

    expect(result).toEqual({ success: true });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('DELETE');
  });

  it('throws with the server message on a non-2xx response', async () => {
    global.fetch = mockFetchOnce(404, { message: 'Not found' }, false) as any;

    await expect(apiDelete('/orders/999')).rejects.toThrow('Not found');
  });

  it('propagates a network failure (fetch itself rejecting)', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network request failed')) as any;

    await expect(apiDelete('/orders/1')).rejects.toThrow('Network request failed');
  });
});

describe('401 retry interceptor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    setOn401Handler(null as any);
  });

  it('retries once with a refreshed token when the handler succeeds', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 1 }) });
    global.fetch = fetchMock as any;
    setOn401Handler(async () => 'new-token');

    const result = await apiGet<{ id: number }>('/profile', 'old-token');

    expect(result).toEqual({ id: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondCallHeaders = fetchMock.mock.calls[1][1].headers as Headers;
    expect(secondCallHeaders.get('Authorization')).toBe('Bearer new-token');
  });

  it('returns the original 401 response when the refresh handler yields no token', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ message: 'Session expired' }),
    });
    global.fetch = fetchMock as any;
    setOn401Handler(async () => null);

    await expect(apiGet('/profile', 'old-token')).rejects.toThrow('Session expired');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('apiFetch headers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sets Authorization when an access token is provided', async () => {
    const fetchMock = mockFetchOnce(200, {});
    global.fetch = fetchMock as any;

    await apiFetch('/profile', { accessToken: 'tok-123' });

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer tok-123');
  });

  it('omits Authorization when no access token is provided', async () => {
    const fetchMock = mockFetchOnce(200, {});
    global.fetch = fetchMock as any;

    await apiFetch('/categories');

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.has('Authorization')).toBe(false);
  });

  it('sets Content-Type: application/json for a plain JSON body', async () => {
    const fetchMock = mockFetchOnce(200, {});
    global.fetch = fetchMock as any;

    await apiFetch('/orders', { method: 'POST', body: JSON.stringify({ id: 1 }) });

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('omits Content-Type for a FormData body, letting fetch set its own multipart boundary', async () => {
    const fetchMock = mockFetchOnce(200, {});
    global.fetch = fetchMock as any;

    const form = new FormData();
    form.append('file', 'fake-file-contents');
    await apiFetch('/products/1/images', { method: 'POST', body: form });

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.has('Content-Type')).toBe(false);
  });

  it('does not override a Content-Type the caller already set', async () => {
    const fetchMock = mockFetchOnce(200, {});
    global.fetch = fetchMock as any;

    await apiFetch('/export', { headers: { 'Content-Type': 'text/csv' } });

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get('Content-Type')).toBe('text/csv');
  });
});
