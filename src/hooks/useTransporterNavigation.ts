import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { fetchTransporterAssignments, updateAssignmentStatus } from '@/src/services/assignments';
import { fetchNavigationRoute } from '@/src/services/navigation';
import { logger } from '@/src/lib/logger';
import {
  bearingDegrees,
  defaultTargetForStatus,
  formatDistanceText,
  formatDurationText,
  getNextNavigationStep,
  getProductPosition,
  getRouteProgress,
  haversineMeters,
} from '@/src/lib/navigation';
import type {
  NavigationPoint,
  NavigationRoute,
  NavigationTarget,
} from '@/src/schemas/navigation';
import type { TransporterAssignment } from '@/src/schemas/assignments';

export interface NavigationFallbackPoint extends NavigationPoint {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
}

export interface TransporterNavigationParams {
  assignmentId?: string;
  orderId?: string;
  status?: string;
  shop?: NavigationFallbackPoint | null;
  customer?: NavigationFallbackPoint | null;
  target?: NavigationTarget | 'auto';
}

interface UseTransporterNavigationArgs {
  accessToken: string;
  params: TransporterNavigationParams;
}

interface MapPayload {
  route: NavigationPoint[];
  driver: (NavigationPoint & { heading?: number | null }) | null;
  pickup: NavigationFallbackPoint | null;
  dropoff: NavigationFallbackPoint | null;
  activeTarget: NavigationTarget;
  productWithDriver: boolean;
  follow: boolean;
}

const ROUTE_REFRESH_DISTANCE_METERS = 60;
const ROUTE_REFRESH_INTERVAL_MS = 30_000;
const ASSIGNMENT_POLL_MS = 20_000;

/**
 * Owns everything the transporter navigation screen needs: the live
 * assignment (fresh pickup/drop-off coordinates + status), GPS watch, route
 * recalculation, turn-by-turn progress and the small map command bus.
 *
 * The screen stays a renderer; keeping this logic here matches the repo's
 * "extract data fetching into a hook" convention and makes the route/progress
 * maths testable.
 */
export function useTransporterNavigation({ accessToken, params }: UseTransporterNavigationArgs) {
  const [assignment, setAssignment] = useState<TransporterAssignment | null>(null);
  const [statusOverride, setStatusOverride] = useState<string | null>(null);
  const [driverLoc, setDriverLoc] = useState<(NavigationPoint & { heading?: number | null }) | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(true);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [targetMode, setTargetMode] = useState<NavigationTarget | 'auto'>(
    params.target && params.target !== 'auto' ? params.target : 'auto',
  );
  const [follow, setFollow] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [forceLeaflet, setForceLeaflet] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [fitSignal, setFitSignal] = useState(0);
  const [routeRetry, setRouteRetry] = useState(0);

  const lastPositionRef = useRef<NavigationPoint | null>(null);
  const lastFetchRef = useRef<{
    key: string;
    origin: NavigationPoint;
    at: number;
  } | null>(null);
  const requestIdRef = useRef(0);
  const fetchingRef = useRef(false);

  const refreshAssignment = useCallback(async () => {
    if (!params.assignmentId) return;
    try {
      const jobs = await fetchTransporterAssignments(accessToken);
      const next = jobs.find((job) => job.id === params.assignmentId);
      if (next) {
        setAssignment(next);
        setStatusOverride(null);
      }
    } catch (err) {
      logger.warn('[navigation] Could not refresh the assignment', err);
    }
  }, [accessToken, params.assignmentId]);

  useEffect(() => {
    refreshAssignment();
    const interval = setInterval(refreshAssignment, ASSIGNMENT_POLL_MS);
    return () => clearInterval(interval);
  }, [refreshAssignment]);

  // Live GPS. If permission is denied we still route from the pickup point so
  // the screen remains useful rather than blocking on a permission dialog.
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    const start = async () => {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          setLocationDenied(true);
          return;
        }
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          setLocationDenied(true);
          return;
        }

        const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!cancelled) {
          const point = {
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude,
            heading: initial.coords.heading ?? null,
          };
          lastPositionRef.current = point;
          setDriverLoc(point);
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 4000,
            distanceInterval: 5,
          },
          (next) => {
            const previous = lastPositionRef.current;
            const point: NavigationPoint & { heading?: number | null } = {
              latitude: next.coords.latitude,
              longitude: next.coords.longitude,
              heading:
                next.coords.heading ??
                (previous ? bearingDegrees(previous, {
                  latitude: next.coords.latitude,
                  longitude: next.coords.longitude,
                }) : null),
            };
            lastPositionRef.current = point;
            setDriverLoc(point);
          },
        );
      } catch (err) {
        logger.error('[navigation] Location setup failed', err);
        setLocationDenied(true);
      }
    };

    start();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  const shop = useMemo<NavigationFallbackPoint | null>(() => {
    const source = assignment?.shops;
    const latitude = Number(source?.latitude ?? params.shop?.latitude);
    const longitude = Number(source?.longitude ?? params.shop?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (latitude === 0 && longitude === 0)) {
      return null;
    }
    return {
      latitude,
      longitude,
      name: source?.name || params.shop?.name || 'Pickup merchant',
      address: [source?.address, source?.ward, source?.district, source?.region]
        .filter(Boolean)
        .join(', ') || params.shop?.address || null,
      phone: source?.phone || params.shop?.phone || null,
    };
  }, [assignment?.shops, params.shop]);

  const customer = useMemo<NavigationFallbackPoint | null>(() => {
    const source = assignment?.orders?.shipping_address;
    const name =
      assignment?.orders?.users?.full_name ||
      source?.full_name ||
      params.customer?.name ||
      'Customer';
    const latitude = Number(source?.latitude ?? params.customer?.latitude);
    const longitude = Number(source?.longitude ?? params.customer?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (latitude === 0 && longitude === 0)) {
      return null;
    }
    return {
      latitude,
      longitude,
      name,
      address: [source?.street || source?.address, source?.ward, source?.district, source?.region]
        .filter(Boolean)
        .join(', ') || params.customer?.address || null,
      phone: assignment?.orders?.users?.phone || params.customer?.phone || null,
    };
  }, [
    assignment?.orders?.shipping_address,
    assignment?.orders?.users?.full_name,
    assignment?.orders?.users?.phone,
    params.customer,
  ]);

  const status = statusOverride ?? assignment?.status ?? params.status ?? 'accepted';
  const target: NavigationTarget =
    targetMode === 'auto' ? defaultTargetForStatus(status) : targetMode;

  const destination = target === 'pickup' ? shop : customer;
  const origin = driverLoc ?? shop;

  const selectTarget = useCallback((next: NavigationTarget) => {
    setTargetMode(next);
  }, []);

  // Switching leg (pickup ↔ drop-off) or advancing the trip should reframe the
  // map on the new route instead of keeping the old leg's camera behind.
  useEffect(() => {
    setFollow(false);
    setFitSignal((value) => value + 1);
  }, [target, status]);

  const startFollowing = useCallback(() => {
    setFollow(true);
    setRecenterSignal((value) => value + 1);
  }, []);

  const fitRoute = useCallback(() => {
    setFollow(false);
    setFitSignal((value) => value + 1);
  }, []);

  const recenter = useCallback(() => {
    setFollow(true);
    setRecenterSignal((value) => value + 1);
  }, []);

  const retryRoute = useCallback(() => {
    setRouteError(null);
    lastFetchRef.current = null;
    setRouteRetry((value) => value + 1);
  }, []);

  // Recalculate the route only when the destination/status changes or the
  // driver has actually moved far enough to matter. Without this, a 4-second
  // GPS watch would hammer the directions API during every trip.
  useEffect(() => {
    if (!origin || !destination) {
      setRoute(null);
      setRouteLoading(false);
      return;
    }

    const now = Date.now();
    const key = `${target}|${destination.latitude.toFixed(5)}|${destination.longitude.toFixed(5)}|${status}`;
    const last = lastFetchRef.current;
    const moved = last ? haversineMeters(last.origin, origin) : Number.POSITIVE_INFINITY;
    const sameDestination = last?.key === key;
    const elapsed = now - (last?.at ?? 0);

    const shouldFetch = !route
      ? !last || elapsed >= 5_000
      : !sameDestination ||
        moved >= ROUTE_REFRESH_DISTANCE_METERS ||
        (elapsed >= ROUTE_REFRESH_INTERVAL_MS && moved >= 15);
    if (!shouldFetch || fetchingRef.current) return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    fetchingRef.current = true;
    lastFetchRef.current = { key, origin, at: now };
    if (!route) setRouteLoading(true);

    fetchNavigationRoute({
      origin,
      destination,
      accessToken,
      profile: 'driving-traffic',
    })
      .then((nextRoute) => {
        if (requestId !== requestIdRef.current) return;
        setRoute(nextRoute);
        setRouteError(null);
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        logger.error('[navigation] Could not calculate route', err);
        setRouteError(err?.message || 'Could not calculate a route.');
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          fetchingRef.current = false;
          setRouteLoading(false);
        }
      });
    // The route is intentionally part of the deps: it lets a failed request
    // retry once a retry token is bumped while keeping successful routes stable.
  }, [
    origin,
    destination,
    target,
    status,
    accessToken,
    route,
    routeRetry,
  ]);

  const progress = useMemo(() => getRouteProgress(route, driverLoc), [route, driverLoc]);
  const nextStep = useMemo(() => getNextNavigationStep(route, driverLoc), [route, driverLoc]);
  const productPosition = getProductPosition(status);

  const etaText = route ? formatDurationText(progress.remainingSeconds) : null;
  const remainingDistanceText = route ? formatDistanceText(progress.remainingMeters) : null;

  const handleMapMessage = useCallback(
    (raw: string) => {
      let message: { type?: string; payload?: unknown };
      try {
        message = JSON.parse(raw);
      } catch {
        return;
      }

      if (message.type === 'ready') {
        setMapReady(true);
        setMapError(null);
        return;
      }
      if (message.type === 'followChanged') {
        setFollow(Boolean(message.payload));
        return;
      }
      if (message.type === 'fatalError') {
        const text = typeof message.payload === 'string' ? message.payload : 'Map failed to start';
        setMapError(text);
        if (!forceLeaflet) setForceLeaflet(true);
      }
    },
    [forceLeaflet],
  );

  const advanceStatus = useCallback(
    async (nextStatus: 'picked_up' | 'in_transit') => {
      if (!params.assignmentId || advancing) return;
      setAdvancing(true);
      try {
        await updateAssignmentStatus({
          id: params.assignmentId,
          newStatus: nextStatus,
          isAvailable: false,
          orderId: params.orderId,
          accessToken,
        });
        setStatusOverride(nextStatus);
        setTargetMode('auto');
        await refreshAssignment();
      } catch (err) {
        logger.error('[navigation] Could not update assignment status', err);
        throw err;
      } finally {
        setAdvancing(false);
      }
    },
    [accessToken, advancing, params.assignmentId, params.orderId, refreshAssignment],
  );

  const mapPayload = useMemo<MapPayload>(
    () => ({
      route: route?.coordinates ?? [],
      driver: driverLoc,
      pickup: shop,
      dropoff: customer,
      activeTarget: target,
      productWithDriver: productPosition === 'with_driver',
      follow,
    }),
    [route?.coordinates, driverLoc, shop, customer, target, productPosition, follow],
  );

  return {
    assignment,
    status,
    target,
    selectTarget,
    targetMode,
    shop,
    customer,
    destination,
    driverLoc,
    locationDenied,
    route,
    routeLoading,
    routeError,
    retryRoute,
    progress,
    nextStep,
    etaText,
    remainingDistanceText,
    productPosition,
    follow,
    setFollow,
    startFollowing,
    fitRoute,
    recenter,
    recenterSignal,
    fitSignal,
    mapReady,
    mapError,
    forceLeaflet,
    handleMapMessage,
    mapPayload,
    advanceStatus,
    advancing,
    refreshAssignment,
  };
}
