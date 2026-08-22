import { apiGet, apiPost, apiPatch } from '@/src/services/api';

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

  it('throws with the server message on error', async () => {
    global.fetch = mockFetchOnce(404, { message: 'Not found' }, false) as any;

    await expect(apiGet('/shops/999')).rejects.toThrow('Not found');
  });

  it('formats a 422 validation error using the first field', async () => {
    global.fetch = mockFetchOnce(
      422,
      { errors: { shop_id: ['is required'] } },
      false
    ) as any;

    await expect(apiGet('/orders')).rejects.toThrow('Shop id: is required');
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
});
