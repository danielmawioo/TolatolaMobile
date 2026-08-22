import * as Location from 'expo-location';

export type ForegroundLocationPermission = 'granted' | 'denied' | 'undetermined';

function mapStatus(status: Location.PermissionStatus): ForegroundLocationPermission {
  if (status === Location.PermissionStatus.GRANTED) return 'granted';
  if (status === Location.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

export async function getForegroundLocationPermission(): Promise<ForegroundLocationPermission> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return mapStatus(status);
}

export async function requestForegroundLocationPermission(): Promise<ForegroundLocationPermission> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return mapStatus(status);
}

/** Current device coordinates if permission already granted; does not prompt. */
export async function readDeviceCoordinatesIfAllowed(): Promise<{ lat: number; lng: number } | null> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== Location.PermissionStatus.GRANTED) return null;
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = pos.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { lat: latitude, lng: longitude };
  } catch {
    return null;
  }
}
