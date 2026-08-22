import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Theme } from '@/constants/Theme';

export type TrackingMapProps = {
  driverLocation: { lat: number; lng: number } | null;
  routePoints?: Array<{ lat: number; lng: number }>;
  destination?: { lat: number; lng: number } | null;
  height?: number;
};

function openMaps(lat: number, lng: number) {
  void Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`);
}

/**
 * Web / fallback: no native map SDK — deep link to Google Maps.
 */
export function TrackingMap({ driverLocation, destination, height = 200 }: TrackingMapProps) {
  const target = driverLocation ?? destination;
  return (
    <View style={[styles.wrap, { height }]}>
      <Text style={styles.title}>Map</Text>
      <Text style={styles.muted}>
        Live maps open in the Google Maps app on your phone. On web, use the button below.
      </Text>
      {target ? (
        <Pressable
          style={styles.btn}
          onPress={() => openMaps(target.lat, target.lng)}
        >
          <Text style={styles.btnText}>Open in Google Maps</Text>
        </Pressable>
      ) : (
        <Text style={styles.muted}>Location will appear when the driver is on the way.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    backgroundColor: Theme.backgroundSecondary,
    padding: 14,
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '700', color: Theme.text, marginBottom: 6 },
  muted: { fontSize: 13, color: Theme.textSecondary, lineHeight: 18 },
  btn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: Theme.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
