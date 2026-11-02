import { apiGet } from '@/src/services/api';
import { MAPBOX_ACCESS_TOKEN } from '@/src/config/env';
import { logger } from '@/src/lib/logger';
import { AppError } from '@/src/lib/errors';
import { formatDistanceText, formatDurationText } from '@/src/lib/navigation';
import {
  NavigationRouteSchema,
  type NavigationPoint,
  type NavigationRoute,
  type NavigationStep,
} from '@/src/schemas/navigation';

export type RouteProfile = 'driving' | 'driving-traffic';

interface FetchRouteArgs {
  origin: NavigationPoint;
  destination: NavigationPoint;
  accessToken?: string | null;
  profile?: RouteProfile;
}

/**
 * Fetches a normalized navigation route.
 *
 * Preference order:
 * 1. The Tola API (`/maps/route`), which can use a Mapbox secret token or the
 *    existing Google Directions key without exposing either to the client.
 * 2. If the API has no routing key configured, call Mapbox Directions directly
 *    with the public client token, so a Mapbox token alone is enough to get
 *    real roads + turn-by-turn.
 * 3. Whatever the API returned (a straight-line fallback) rather than breaking
 *    the screen when there is no GPS/network.
 */
export async function fetchNavigationRoute({
  origin,
  destination,
  accessToken,
  profile = 'driving-traffic',
}: FetchRouteArgs): Promise<NavigationRoute> {
  const path =
    `/maps/route?originLat=${origin.latitude}&originLng=${origin.longitude}` +
    `&destLat=${destination.latitude}&destLng=${destination.longitude}` +
    `&profile=${profile}`;

  let apiRoute: NavigationRoute | null = null;
  try {
    apiRoute = await apiGet<NavigationRoute>(path, accessToken, NavigationRouteSchema);
    if (apiRoute.provider !== 'fallback' || !MAPBOX_ACCESS_TOKEN) return apiRoute;
  } catch (err) {
    logger.warn('[navigation] Route API failed, trying Mapbox directly', err);
  }

  if (!MAPBOX_ACCESS_TOKEN) {
    if (apiRoute) return apiRoute;
    throw new AppError('Unable to calculate a route right now.', 'network');
  }

  try {
    return await fetchMapboxRoute(origin, destination, profile);
  } catch (err) {
    logger.error('[navigation] Direct Mapbox directions failed', err);
    if (apiRoute) return apiRoute;
    throw err instanceof AppError
      ? err
      : new AppError('Unable to calculate a route right now.', 'network');
  }
}

export async function fetchMapboxRoute(
  origin: NavigationPoint,
  destination: NavigationPoint,
  profile: RouteProfile = 'driving-traffic',
): Promise<NavigationRoute> {
  if (!MAPBOX_ACCESS_TOKEN) {
    throw new AppError('Mapbox token is not configured.', 'unknown');
  }

  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}`);
  url.searchParams.set('alternatives', 'false');
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('overview', 'full');
  url.searchParams.set('steps', 'true');
  url.searchParams.set('language', 'en');
  url.searchParams.set('access_token', MAPBOX_ACCESS_TOKEN);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new AppError(`Mapbox directions returned ${response.status}.`, 'server');
  }

  const data = await response.json();
  if (data?.code !== 'Ok' || !data.routes?.[0]) {
    throw new AppError(`Mapbox directions failed: ${data?.message || data?.code || 'unknown'}`, 'server');
  }

  return normalizeMapboxRoute(data.routes[0]);
}

/**
 * Converts a Mapbox Directions route object into the app's normalized shape.
 * Exported so it can be unit-tested without a network call.
 */
export function normalizeMapboxRoute(route: any): NavigationRoute {
  const coordinates: NavigationPoint[] = Array.isArray(route?.geometry?.coordinates)
    ? route.geometry.coordinates
        .filter((point: unknown) => Array.isArray(point) && point.length >= 2)
        .map((point: [number, number]) => ({
          latitude: Number(point[1]),
          longitude: Number(point[0]),
        }))
        .filter((point: NavigationPoint) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
    : [];

  const steps: NavigationStep[] = (route?.legs ?? []).flatMap((leg: any) =>
    (leg?.steps ?? []).map((step: any) => {
      const location = step?.maneuver?.location;
      return {
        instruction:
          step?.maneuver?.instruction ||
          fallbackInstruction(step?.maneuver?.type, step?.maneuver?.modifier, step?.name),
        maneuver: step?.maneuver?.type ?? null,
        modifier: step?.maneuver?.modifier ?? null,
        distanceMeters: Number(step?.distance ?? 0),
        durationSeconds: Number(step?.duration ?? 0),
        location:
          Array.isArray(location) && location.length >= 2
            ? { latitude: Number(location[1]), longitude: Number(location[0]) }
            : null,
      };
    }),
  );

  const distanceMeters = Number(route?.distance ?? 0);
  const durationSeconds = Number(route?.duration ?? 0);

  return {
    provider: 'mapbox',
    coordinates,
    distanceMeters,
    durationSeconds,
    distanceText: formatDistanceText(distanceMeters),
    durationText: formatDurationText(durationSeconds),
    steps,
  };
}

function fallbackInstruction(
  type?: string,
  modifier?: string,
  roadName?: string,
): string {
  const road = roadName ? ` on ${roadName}` : '';
  if (type === 'arrive') return 'You have arrived';
  if (type === 'depart') return `Head out${road}`;
  if (type === 'turn') return `Turn ${modifier || 'ahead'}${road}`;
  if (type === 'roundabout' || type === 'rotary') return `Take the roundabout${road}`;
  return `Continue${road}`;
}
