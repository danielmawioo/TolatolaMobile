import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Theme } from '@/constants/Theme';

export type TrackingMapProps = {
  driverLocation: { lat: number; lng: number } | null;
  routePoints?: Array<{ lat: number; lng: number }>;
  destination?: { lat: number; lng: number } | null;
  height?: number;
};

export function TrackingMap({
  driverLocation,
  routePoints,
  destination,
  height = 220,
}: TrackingMapProps) {
  const region = useMemo(() => {
    const pts = [
      ...(driverLocation ? [driverLocation] : []),
      ...(destination ? [destination] : []),
      ...(routePoints ?? []),
    ];
    if (pts.length === 0) {
      return { latitude: -6.792354, longitude: 39.208328, latitudeDelta: 0.08, longitudeDelta: 0.08 };
    }
    let minLat = pts[0].lat;
    let maxLat = pts[0].lat;
    let minLng = pts[0].lng;
    let maxLng = pts[0].lng;
    for (const p of pts) {
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
      minLng = Math.min(minLng, p.lng);
      maxLng = Math.max(maxLng, p.lng);
    }
    const pad = 0.02;
    const latD = Math.max((maxLat - minLat) * 1.4 + pad, 0.03);
    const lngD = Math.max((maxLng - minLng) * 1.4 + pad, 0.03);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latD,
      longitudeDelta: lngD,
    };
  }, [driverLocation, destination, routePoints]);

  const lineCoords =
    routePoints && routePoints.length >= 2
      ? routePoints.map((p) => ({ latitude: p.lat, longitude: p.lng }))
      : null;

  if (!driverLocation && !destination && (!routePoints || routePoints.length === 0)) {
    return (
      <View style={[styles.fallback, { height }]}>
        <Text style={styles.fallbackText}>Map updates when delivery is active.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        region={region}
        showsUserLocation={false}
        loadingEnabled
      >
        {destination ? (
          <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} title="Drop-off" />
        ) : null}
        {driverLocation ? (
          <Marker coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }} title="Driver" pinColor="#2563eb" />
        ) : null}
        {lineCoords ? (
          <Polyline coordinates={lineCoords} strokeColor={Theme.primary} strokeWidth={3} />
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    backgroundColor: Theme.backgroundSecondary,
  },
  fallback: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    backgroundColor: Theme.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fallbackText: { fontSize: 14, color: Theme.textSecondary, textAlign: 'center' },
});
