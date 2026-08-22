import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@tolatola/saved_delivery_address:';

export function savedDeliveryAddressKey(userId: string): string {
  return `${PREFIX}${userId}`;
}

export type SavedDeliverySnapshot = {
  address: string;
  latitude?: number;
  longitude?: number;
};

/**
 * Loads saved checkout delivery. Supports legacy plain-text rows and JSON
 * `{ address, latitude?, longitude? }` for location-based listing sort.
 */
export async function loadSavedDeliverySnapshot(userId: string): Promise<SavedDeliverySnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(savedDeliveryAddressKey(userId));
    if (raw == null || !String(raw).trim()) return null;
    const trimmed = String(raw).trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed) as Record<string, unknown>;
        const address = typeof parsed.address === 'string' ? parsed.address.trim() : '';
        if (!address) return null;
        const lat = Number(parsed.latitude);
        const lng = Number(parsed.longitude);
        return {
          address,
          ...(Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : {}),
        };
      } catch {
        return { address: trimmed };
      }
    }
    return { address: trimmed };
  } catch {
    return null;
  }
}

export async function persistSavedDeliverySnapshot(
  userId: string,
  snapshot: SavedDeliverySnapshot
): Promise<void> {
  const payload: SavedDeliverySnapshot = {
    address: snapshot.address.trim(),
  };
  if (
    snapshot.latitude != null &&
    snapshot.longitude != null &&
    Number.isFinite(snapshot.latitude) &&
    Number.isFinite(snapshot.longitude)
  ) {
    payload.latitude = snapshot.latitude;
    payload.longitude = snapshot.longitude;
  }
  await AsyncStorage.setItem(savedDeliveryAddressKey(userId), JSON.stringify(payload));
}

/** @deprecated Prefer loadSavedDeliverySnapshot — kept for call sites that only need text. */
export async function loadSavedDeliveryAddress(userId: string): Promise<string | null> {
  const s = await loadSavedDeliverySnapshot(userId);
  return s?.address?.trim() ? s.address : null;
}

export async function persistSavedDeliveryAddress(
  userId: string,
  address: string,
  coords?: { lat: number; lng: number } | null
): Promise<void> {
  await persistSavedDeliverySnapshot(userId, {
    address: address.trim(),
    ...(coords != null &&
    Number.isFinite(coords.lat) &&
    Number.isFinite(coords.lng) && { latitude: coords.lat, longitude: coords.lng }),
  });
}
