import { checkApiHealth } from '@/src/lib/health';
import { getApiBaseUrl } from '@/src/services/api';

jest.mock('@/src/services/api', () => ({
  getApiBaseUrl: jest.fn(),
}));

const mockedGetApiBaseUrl = getApiBaseUrl as jest.Mock;

describe('checkApiHealth', () => {
  beforeEach(() => {
    mockedGetApiBaseUrl.mockReturnValue('https://api.tolatola.co/api');
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('reports ok with a latency when the backend responds successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200 });

    const result = await checkApiHealth();

    expect(result.ok).toBe(true);
    expect(typeof result.latencyMs).toBe('number');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.tolatola.co/api',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('reports not-ok (without throwing) when the backend responds with a non-2xx status', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 503 });

    const result = await checkApiHealth();

    expect(result.ok).toBe(false);
    expect(typeof result.latencyMs).toBe('number');
  });

  it('reports not-ok without a latency when fetch rejects (network failure/timeout)', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network request failed'));

    const result = await checkApiHealth();

    expect(result).toEqual({ ok: false });
  });

  it('never throws even when fetch rejects with an AbortError from the timeout', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

    await expect(checkApiHealth()).resolves.toEqual({ ok: false });
  });
});
