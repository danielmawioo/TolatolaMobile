import { apiGet } from '@/src/services/api';
import {
  fetchMapboxRoute,
  fetchNavigationRoute,
  normalizeMapboxRoute,
} from '@/src/services/navigation';

jest.mock('@/src/services/api');

/**
 * The service reads the Mapbox token from src/config/env at call time, so a
 * getter-backed mock lets each test choose whether a token exists without
 * reloading modules.
 */
const mockEnv = { token: '' };
jest.mock('@/src/config/env', () => ({
  get MAPBOX_ACCESS_TOKEN() {
    return mockEnv.token;
  },
}));

const mockedApiGet = apiGet as jest.Mock;

const mapboxRoute = {
  geometry: {
    coordinates: [
      [39.2, -6.8],
      [39.3, -6.7],
      [999, 'not-a-number'],
      undefined,
    ],
  },
  distance: 15_000,
  duration: 900,
  legs: [
    {
      steps: [
        {
          distance: 7_000,
          duration: 420,
          maneuver: {
            type: 'depart',
            modifier: null,
            instruction: 'Head southeast on Msimbazi Street',
            location: [39.2, -6.8],
          },
          name: 'Msimbazi Street',
        },
        {
          distance: 8_000,
          duration: 480,
          maneuver: { type: 'turn', modifier: 'right', instruction: 'Turn right', location: [39.3, -6.7] },
          name: 'Morogoro Road',
        },
      ],
    },
  ],
};

describe('normalizeMapboxRoute', () => {
  it('converts the Mapbox payload into the normalized route shape', () => {
    const route = normalizeMapboxRoute(mapboxRoute);

    expect(route.provider).toBe('mapbox');
    expect(route.coordinates).toEqual([
      { latitude: -6.8, longitude: 39.2 },
      { latitude: -6.7, longitude: 39.3 },
    ]);
    expect(route.steps).toHaveLength(2);
    expect(route.steps[0].instruction).toBe('Head southeast on Msimbazi Street');
    expect(route.steps[0].location).toEqual({ latitude: -6.8, longitude: 39.2 });
    expect(route.steps[1].maneuver).toBe('turn');
    expect(route.steps[1].modifier).toBe('right');
    expect(route.distanceMeters).toBe(15_000);
    expect(route.durationSeconds).toBe(900);
    expect(route.distanceText).toBe('15.0 km');
    expect(route.durationText).toBe('15 min');
  });

  it('survives an empty or partial payload', () => {
    const route = normalizeMapboxRoute(null);

    expect(route.provider).toBe('mapbox');
    expect(route.coordinates).toEqual([]);
    expect(route.steps).toEqual([]);
    expect(route.distanceText).toBe('0 m');
  });

  it('synthesizes instructions when Mapbox omits them', () => {
    const route = normalizeMapboxRoute({
      geometry: { coordinates: [[39.2, -6.8]] },
      distance: 500,
      duration: 60,
      legs: [
        {
          steps: [
            { distance: 500, duration: 60, name: 'Ocean Road', maneuver: { type: 'turn', modifier: 'left' } },
          ],
        },
      ],
    });

    expect(route.steps[0].instruction).toBe('Turn left on Ocean Road');
  });
});

describe('fetchNavigationRoute', () => {
  const origin = { latitude: -6.8, longitude: 39.2 };
  const destination = { latitude: -6.78, longitude: 39.28 };

  const apiMapboxRoute = { provider: 'mapbox', coordinates: [], steps: [], distanceText: '1.0 km' };
  const apiFallbackRoute = { provider: 'fallback', coordinates: [], steps: [], distanceText: '2.0 km' };

  afterEach(() => {
    jest.clearAllMocks();
    mockEnv.token = '';
    jest.restoreAllMocks();
  });

  it('uses the API route when the backend already resolved real roads', async () => {
    mockedApiGet.mockResolvedValue(apiMapboxRoute);
    const fetchSpy = jest.spyOn(global, 'fetch');

    const route = await fetchNavigationRoute({ origin, destination, accessToken: 'tok' });

    expect(route).toBe(apiMapboxRoute);
    expect(mockedApiGet).toHaveBeenCalledWith(
      expect.stringContaining('/maps/route?originLat=-6.8&originLng=39.2'),
      'tok',
      expect.anything(),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('keeps the straight-line fallback when there is no client token', async () => {
    mockedApiGet.mockResolvedValue(apiFallbackRoute);
    const fetchSpy = jest.spyOn(global, 'fetch');

    const route = await fetchNavigationRoute({ origin, destination, accessToken: 'tok' });

    expect(route).toBe(apiFallbackRoute);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('upgrades a fallback route by calling Mapbox directly with the public token', async () => {
    mockEnv.token = 'pk.test';
    mockedApiGet.mockResolvedValue(apiFallbackRoute);
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ code: 'Ok', routes: [mapboxRoute] }),
    } as unknown as Response);

    const route = await fetchNavigationRoute({ origin, destination, accessToken: 'tok' });

    expect(route.provider).toBe('mapbox');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = (fetchSpy.mock.calls[0][0] as string).toString();
    expect(calledUrl).toContain('https://api.mapbox.com/directions/v5/mapbox/driving-traffic/');
    expect(calledUrl).toContain('39.2,-6.8;39.28,-6.78');
    expect(calledUrl).toContain('access_token=pk.test');
  });

  it('falls back to the API route when direct Mapbox directions fail', async () => {
    mockEnv.token = 'pk.test';
    mockedApiGet.mockResolvedValue(apiFallbackRoute);
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
    } as unknown as Response);

    const route = await fetchNavigationRoute({ origin, destination, accessToken: 'tok' });

    expect(route).toBe(apiFallbackRoute);
  });

  it('propagates a network error when nothing can resolve a route', async () => {
    mockedApiGet.mockRejectedValue(new Error('offline'));

    await expect(
      fetchNavigationRoute({ origin, destination, accessToken: 'tok' }),
    ).rejects.toMatchObject({ message: 'Unable to calculate a route right now.' });
  });
});

describe('fetchMapboxRoute', () => {
  afterEach(() => {
    mockEnv.token = '';
    jest.restoreAllMocks();
  });

  it('throws clearly before touching the network without a token', async () => {
    await expect(
      fetchMapboxRoute({ latitude: -6.8, longitude: 39.2 }, { latitude: -6.7, longitude: 39.3 }),
    ).rejects.toMatchObject({ message: 'Mapbox token is not configured.' });
  });

  it('reports Mapbox error responses', async () => {
    mockEnv.token = 'pk.test';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as unknown as Response);

    await expect(
      fetchMapboxRoute({ latitude: -6.8, longitude: 39.2 }, { latitude: -6.7, longitude: 39.3 }),
    ).rejects.toMatchObject({ message: 'Mapbox directions returned 401.' });
  });
});
