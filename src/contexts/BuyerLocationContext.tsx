import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { loadSavedDeliverySnapshot } from '@/src/lib/savedDeliveryAddress';
import {
  getForegroundLocationPermission,
  readDeviceCoordinatesIfAllowed,
  requestForegroundLocationPermission,
  type ForegroundLocationPermission,
} from '@/src/lib/deviceLocation';

export type BuyerLocationContextValue = {
  /**
   * Best point for “near me” sorting & delivery fallback: device GPS when allowed,
   * else saved checkout map pin.
   */
  coords: { lat: number; lng: number } | null;
  addressHint: string | null;
  isLoaded: boolean;
  hasProximity: boolean;
  locationPermission: ForegroundLocationPermission;
  refresh: () => Promise<void>;
  /** Shows the system permission dialog when needed, then refreshes coordinates. */
  requestLocationAccess: () => Promise<ForegroundLocationPermission>;
};

const BuyerLocationContext = createContext<BuyerLocationContextValue | null>(null);

export function BuyerLocationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [savedPinCoords, setSavedPinCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [addressHint, setAddressHint] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [locationPermission, setLocationPermission] = useState<ForegroundLocationPermission>('undetermined');

  const refresh = useCallback(async () => {
    setIsLoaded(false);
    try {
      const perm = await getForegroundLocationPermission();
      setLocationPermission(perm);

      if (perm === 'granted') {
        const c = await readDeviceCoordinatesIfAllowed();
        setDeviceCoords(c);
      } else {
        setDeviceCoords(null);
      }

      const uid = session?.user?.id;
      if (uid) {
        const snap = await loadSavedDeliverySnapshot(String(uid));
        setAddressHint(snap?.address?.trim() ?? null);
        if (
          snap?.latitude != null &&
          snap?.longitude != null &&
          Number.isFinite(snap.latitude) &&
          Number.isFinite(snap.longitude)
        ) {
          setSavedPinCoords({ lat: snap.latitude, lng: snap.longitude });
        } else {
          setSavedPinCoords(null);
        }
      } else {
        setAddressHint(null);
        setSavedPinCoords(null);
      }
    } catch {
      setDeviceCoords(null);
      setSavedPinCoords(null);
      setAddressHint(null);
    } finally {
      setIsLoaded(true);
    }
  }, [session?.user?.id]);

  const requestLocationAccess = useCallback(async () => {
    try {
      const next = await requestForegroundLocationPermission();
      setLocationPermission(next);
      if (next === 'granted') {
        const c = await readDeviceCoordinatesIfAllowed();
        setDeviceCoords(c);
      } else {
        setDeviceCoords(null);
      }
      return next;
    } catch {
      setLocationPermission('denied');
      return 'denied';
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const coords = deviceCoords ?? savedPinCoords;

  const value = useMemo(
    (): BuyerLocationContextValue => ({
      coords,
      addressHint,
      isLoaded,
      hasProximity: !!(coords || addressHint?.trim()),
      locationPermission,
      refresh,
      requestLocationAccess,
    }),
    [coords, addressHint, isLoaded, locationPermission, refresh, requestLocationAccess]
  );

  return <BuyerLocationContext.Provider value={value}>{children}</BuyerLocationContext.Provider>;
}

export function useBuyerLocation(): BuyerLocationContextValue {
  const ctx = useContext(BuyerLocationContext);
  if (!ctx) {
    return {
      coords: null,
      addressHint: null,
      isLoaded: true,
      hasProximity: false,
      locationPermission: 'undetermined',
      refresh: async () => {},
      requestLocationAccess: async () => 'undetermined',
    };
  }
  return ctx;
}
