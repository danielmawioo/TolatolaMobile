import type {
  NavigationPoint,
  NavigationRoute,
  NavigationStep,
  NavigationTarget,
} from '@/src/schemas/navigation';

const EARTH_RADIUS_METERS = 6_371_000;

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in metres. */
export function haversineMeters(a: NavigationPoint, b: NavigationPoint): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Compass bearing from a to b, 0–360. */
export function bearingDegrees(a: NavigationPoint, b: NavigationPoint): number {
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export interface RouteProgress {
  /** Index of the nearest route vertex to the driver. */
  nearestIndex: number;
  /** How far the driver is from the route line, in metres. */
  distanceFromRouteMeters: number;
  /** Remaining road distance, using the provider's distance scaled by the progress along the geometry. */
  remainingMeters: number;
  remainingSeconds: number;
  /** 0 = at the start, 1 = at the destination. */
  fractionComplete: number;
}

export function getRouteProgress(
  route: NavigationRoute | null,
  driver: NavigationPoint | null,
): RouteProgress {
  if (!route || route.coordinates.length < 2 || !driver) {
    return {
      nearestIndex: 0,
      distanceFromRouteMeters: 0,
      remainingMeters: route?.distanceMeters ?? 0,
      remainingSeconds: route?.durationSeconds ?? 0,
      fractionComplete: 0,
    };
  }

  const cumulative = cumulativeDistances(route.coordinates);
  const totalAlong = cumulative[cumulative.length - 1] || 0;
  const nearestIndex = findNearestIndex(route.coordinates, driver);
  const distanceFromRouteMeters = haversineMeters(route.coordinates[nearestIndex], driver);
  const driverAlong = cumulative[nearestIndex] + distanceFromRouteMeters;
  const remainingAlong = Math.max(0, totalAlong - driverAlong);
  const fractionRemaining = totalAlong > 0 ? remainingAlong / totalAlong : 0;
  const fractionComplete = Math.min(1, Math.max(0, 1 - fractionRemaining));

  return {
    nearestIndex,
    distanceFromRouteMeters,
    remainingMeters: route.distanceMeters * fractionRemaining,
    remainingSeconds: route.durationSeconds * fractionRemaining,
    fractionComplete,
  };
}

export interface NextStep {
  step: NavigationStep;
  /** Distance in metres from the driver to the manoeuvre point. */
  distanceToStepMeters: number;
  /** Index of the route vertex nearest the manoeuvre. */
  routeIndex: number;
}

/**
 * Finds the next manoeuvre the driver should perform. Steps are ordered by
 * their position along the route, so we can compare their nearest route index
 * with the driver's nearest index instead of relying on raw distance.
 */
export function getNextNavigationStep(
  route: NavigationRoute | null,
  driver: NavigationPoint | null,
): NextStep | null {
  if (!route || route.steps.length === 0 || !driver || route.coordinates.length < 2) {
    return null;
  }

  const cumulative = cumulativeDistances(route.coordinates);
  const progress = getRouteProgress(route, driver);
  const driverAlong = cumulative[progress.nearestIndex] + progress.distanceFromRouteMeters;

  const indexed = route.steps.map((step, index) => {
    const routeIndex = step.location
      ? nearestCoordinateIndex(route.coordinates, step.location)
      : Math.min(
          route.coordinates.length - 1,
          Math.round(((index + 1) / route.steps.length) * (route.coordinates.length - 1)),
        );
    return { step, routeIndex, along: cumulative[routeIndex] };
  });

  // A step at the very start (depart) is not a manoeuvre we still have to make.
  const ahead = indexed.filter((entry) => entry.along > driverAlong + 5);
  const chosen = ahead[0] ?? indexed[indexed.length - 1];

  return {
    step: chosen.step,
    distanceToStepMeters: Math.max(0, chosen.along - driverAlong),
    routeIndex: chosen.routeIndex,
  };
}

export type ManeuverIconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up'
  | 'undo'
  | 'refresh'
  | 'compress'
  | 'level-up'
  | 'flag-checkered'
  | 'location-arrow';

/** FontAwesome icon name for a Mapbox/Google manoeuvre. */
export function maneuverIcon(step: NavigationStep | null): ManeuverIconName {
  if (!step) return 'location-arrow';
  const type = (step.maneuver || '').toLowerCase();
  const modifier = (step.modifier || '').toLowerCase();

  if (type === 'arrive') return 'flag-checkered';
  if (type === 'depart') return 'location-arrow';
  if (type === 'roundabout' || type === 'rotary') return 'refresh';
  if (type === 'merge') return 'compress';
  if (type === 'fork' || type === 'ramp') {
    return modifier.includes('left') ? 'arrow-left' : 'arrow-right';
  }
  if (type === 'uturn' || modifier === 'uturn') return 'undo';
  if (modifier.includes('left')) return 'arrow-left';
  if (modifier.includes('right')) return 'arrow-right';
  if (modifier.includes('sharp')) return 'level-up';
  return 'arrow-up';
}

export type ProductPosition = 'at_pickup' | 'with_driver' | 'delivered' | 'unknown';

export function getProductPosition(status: string | null | undefined): ProductPosition {
  if (!status) return 'unknown';
  if (status === 'delivered' || status === 'completed') return 'delivered';
  if (status === 'picked_up' || status === 'in_transit') return 'with_driver';
  if (status === 'accepted' || status === 'assigned' || status === 'ready_for_pickup') {
    return 'at_pickup';
  }
  return 'unknown';
}

export function productPositionLabel(position: ProductPosition): string {
  switch (position) {
    case 'at_pickup':
      return 'Waiting at pickup';
    case 'with_driver':
      return 'With you';
    case 'delivered':
      return 'Delivered';
    default:
      return 'Status unavailable';
  }
}

export function productPositionDescription(position: ProductPosition): string {
  switch (position) {
    case 'at_pickup':
      return 'The package is still at the merchant. Head to the pickup point.';
    case 'with_driver':
      return 'The package is with you. Keep heading to the customer.';
    case 'delivered':
      return 'This delivery is complete.';
    default:
      return 'Accept the trip to see the package location.';
  }
}

export function defaultTargetForStatus(status: string | null | undefined): NavigationTarget {
  return status === 'picked_up' || status === 'in_transit' || status === 'delivered'
    ? 'dropoff'
    : 'pickup';
}

export function formatDistanceText(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '0 m';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDurationText(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 min';
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} hr ${rest} min` : `${hours} hr`;
}

function cumulativeDistances(points: NavigationPoint[]): number[] {
  const cumulative: number[] = [0];
  for (let i = 1; i < points.length; i += 1) {
    cumulative.push(cumulative[i - 1] + haversineMeters(points[i - 1], points[i]));
  }
  return cumulative;
}

function nearestCoordinateIndex(points: NavigationPoint[], target: NavigationPoint): number {
  let index = 0;
  let best = Number.POSITIVE_INFINITY;
  points.forEach((point, i) => {
    const distance = haversineMeters(point, target);
    if (distance < best) {
      best = distance;
      index = i;
    }
  });
  return index;
}

function findNearestIndex(points: NavigationPoint[], target: NavigationPoint): number {
  let index = 0;
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length; i += 1) {
    const distance = haversineMeters(points[i], target);
    if (distance < best) {
      best = distance;
      index = i;
    }
  }
  return index;
}
