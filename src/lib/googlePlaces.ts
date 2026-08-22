import { GOOGLE_PLACES_API_KEY } from '@/src/config/env';

export type PlacePrediction = {
  placeId: string;
  description: string;
  mainText?: string;
  secondaryText?: string;
};

const AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

function apiKey(): string {
  return GOOGLE_PLACES_API_KEY.trim();
}

export async function fetchPlacePredictions(
  input: string,
  signal?: AbortSignal
): Promise<PlacePrediction[]> {
  const key = apiKey();
  if (!key || input.trim().length < 2) return [];

  const params = new URLSearchParams({
    input: input.trim(),
    key,
    components: 'country:tz',
    language: 'en',
  });

  const res = await fetch(`${AUTOCOMPLETE_URL}?${params}`, { signal });
  const data = (await res.json()) as {
    predictions?: Array<{
      place_id: string;
      description: string;
      structured_formatting?: { main_text: string; secondary_text?: string };
    }>;
    status: string;
    error_message?: string;
  };

  if (data.status === 'ZERO_RESULTS') return [];
  if (data.status !== 'OK') {
    if (__DEV__ && data.error_message) {
      console.warn('[googlePlaces]', data.status, data.error_message);
    }
    return [];
  }

  return (data.predictions ?? []).map((p) => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text,
    secondaryText: p.structured_formatting?.secondary_text,
  }));
}

export type PlaceDetailsResult = {
  formattedAddress: string;
  lat: number;
  lng: number;
};

/**
 * Place Details with geometry for distance-based delivery estimates.
 */
export async function fetchPlaceDetails(
  placeId: string,
  signal?: AbortSignal
): Promise<PlaceDetailsResult | null> {
  const key = apiKey();
  if (!key) return null;

  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'formatted_address,geometry/location',
    key,
  });

  const res = await fetch(`${DETAILS_URL}?${params}`, { signal });
  const data = (await res.json()) as {
    result?: {
      formatted_address?: string;
      geometry?: { location?: { lat: number; lng: number } };
    };
    status: string;
  };

  if (data.status !== 'OK' || !data.result?.formatted_address) return null;
  const loc = data.result.geometry?.location;
  if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') return null;
  return {
    formattedAddress: data.result.formatted_address,
    lat: loc.lat,
    lng: loc.lng,
  };
}

export async function fetchPlaceFormattedAddress(
  placeId: string,
  signal?: AbortSignal
): Promise<string | null> {
  const key = apiKey();
  if (!key) return null;

  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'formatted_address',
    key,
  });

  const res = await fetch(`${DETAILS_URL}?${params}`, { signal });
  const data = (await res.json()) as {
    result?: { formatted_address?: string };
    status: string;
  };

  if (data.status !== 'OK' || !data.result?.formatted_address) return null;
  return data.result.formatted_address;
}
