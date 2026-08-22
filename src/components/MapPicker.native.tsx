import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform, Linking, Alert } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { WebView } from 'react-native-webview';
import { Theme } from '@/constants/Theme';
import { logger } from '@/src/lib/logger';

interface Props {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (coords: { lat: number; lng: number }) => void;
  title?: string;
}

const DEFAULT_REGION = {
  latitude: -6.7924, // Dar es Salaam
  longitude: 39.2083,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

/**
 * Generates the HTML for an interactive Leaflet/OpenStreetMap inside a WebView.
 * Supports tap-to-place and drag-to-move marker.
 */
function buildLeafletHtml(lat: number, lng: number, hasPin: boolean): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    var marker = ${hasPin ? `L.marker([${lat}, ${lng}], { draggable: true }).addTo(map);` : 'null;'}

    function sendCoords(lat, lng) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ lat: lat, lng: lng }));
    }

    map.on('click', function(e) {
      var lat = e.latlng.lat;
      var lng = e.latlng.lng;
      if (marker) {
        marker.setLatLng(e.latlng);
      } else {
        marker = L.marker(e.latlng, { draggable: true }).addTo(map);
        marker.on('dragend', function(ev) {
          var pos = ev.target.getLatLng();
          sendCoords(pos.lat, pos.lng);
        });
      }
      sendCoords(lat, lng);
    });

    if (marker) {
      marker.on('dragend', function(ev) {
        var pos = ev.target.getLatLng();
        sendCoords(pos.lat, pos.lng);
      });
    }
  </script>
</body>
</html>`;
}

export default function MapPicker({ latitude, longitude, onLocationSelect, title = 'Pin Location on Map' }: Props) {
  const [isLocating, setIsLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const webviewRef = useRef<WebView>(null);

  const region = {
    latitude: latitude || DEFAULT_REGION.latitude,
    longitude: longitude || DEFAULT_REGION.longitude,
    latitudeDelta: DEFAULT_REGION.latitudeDelta,
    longitudeDelta: DEFAULT_REGION.longitudeDelta,
  };

  const handleMapPress = (e: any) => {
    if (e.nativeEvent?.coordinate) {
      const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
      onLocationSelect({ lat, lng });
    }
  };

  const handleMarkerDragEnd = (e: any) => {
    if (e.nativeEvent?.coordinate) {
      const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
      onLocationSelect({ lat, lng });
    }
  };

  /** Handle messages from the WebView Leaflet map */
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.lat !== undefined && data.lng !== undefined) {
        onLocationSelect({ lat: data.lat, lng: data.lng });
      }
    } catch {
      // ignore malformed messages
    }
  };

  const requestCurrentLocation = async () => {
    setIsLocating(true);
    setErrorMsg(null);
    try {
      // 1. Check if location services are enabled on the device
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setErrorMsg('Location services are turned off. Please enable GPS in your device settings.');
        setIsLocating(false);
        Alert.alert(
          'Location Services Disabled',
          'Your device GPS is turned off. Please enable Location Services to use this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      // 2. Request foreground location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission is required. Please allow location access in your app settings.');
        setIsLocating(false);
        Alert.alert(
          'Location Permission Required',
          'TOLA needs access to your location to calculate accurate delivery fees. Please grant location permission.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      // 3. Fetch current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      onLocationSelect({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error: any) {
      logger.error('[MapPicker] Error getting location:', error);
      const msg = error?.message || '';
      if (msg.includes('denied') || msg.includes('permission')) {
        setErrorMsg('Location permission was denied. Tap to open Settings and grant access.');
      } else if (msg.includes('timeout') || msg.includes('timed out')) {
        setErrorMsg('GPS timed out. Please ensure you are outdoors or near a window, then try again.');
      } else {
        setErrorMsg('Could not fetch current GPS location. Please try again.');
      }
    } finally {
      setIsLocating(false);
    }
  };

  // On native platforms, we can fallback to WebView if native maps fails to load
  // (which happens in custom development clients or Expo Go on some setups)
  // But usually, standard native builds will use MapView.
  const [nativeMapFailed, setNativeMapFailed] = useState(false);

  const useNativeMap = !nativeMapFailed;
  const useWebViewMap = nativeMapFailed;

  const mapLat = latitude || DEFAULT_REGION.latitude;
  const mapLng = longitude || DEFAULT_REGION.longitude;
  const hasPin = latitude !== null && longitude !== null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <FontAwesome name="map" size={16} color={Theme.primary} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.locateBtn, pressed && styles.btnPressed]}
          onPress={requestCurrentLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <FontAwesome name="location-arrow" size={12} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.locateBtnText}>Current GPS</Text>
            </>
          )}
        </Pressable>
      </View>

      {errorMsg && (
        <Pressable
          style={styles.errorBanner}
          onPress={() => {
            if (errorMsg.includes('Settings')) {
              Linking.openSettings();
            }
          }}
        >
          <FontAwesome name="exclamation-circle" size={14} color="#D32F2F" style={{ marginRight: 6 }} />
          <Text style={styles.errorText}>{errorMsg}</Text>
          {errorMsg.includes('Settings') && (
            <FontAwesome name="external-link" size={12} color="#D32F2F" style={{ marginLeft: 6 }} />
          )}
        </Pressable>
      )}

      <View style={styles.mapContainer}>
        {useNativeMap ? (
          <MapView
            style={styles.map}
            initialRegion={region}
            region={region}
            onPress={handleMapPress}
            showsUserLocation
          >
            {latitude && longitude && (
              <Marker
                coordinate={{ latitude, longitude }}
                draggable
                onDragEnd={handleMarkerDragEnd}
                title="Delivery Location"
                description="Drag to adjust position"
              />
            )}
          </MapView>
        ) : useWebViewMap ? (
          <WebView
            ref={webviewRef}
            source={{ html: buildLeafletHtml(mapLat, mapLng, hasPin) }}
            style={styles.map}
            onMessage={handleWebViewMessage}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
            scrollEnabled={false}
            nestedScrollEnabled
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <FontAwesome name="map-o" size={48} color={Theme.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.placeholderText}>
              Interactive Map is loading...
            </Text>
            <Text style={styles.placeholderSubtext}>
              Press "Current GPS" above to fetch your location coordinates automatically, or use the address search to resolve coordinates.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.badgeContainer}>
        <View style={styles.coordBadge}>
          <Text style={styles.coordLabel}>Lat:</Text>
          <Text style={styles.coordVal}>
            {latitude ? latitude.toFixed(6) : 'Not set'}
          </Text>
        </View>
        <View style={styles.coordBadge}>
          <Text style={styles.coordLabel}>Lng:</Text>
          <Text style={styles.coordVal}>
            {longitude ? longitude.toFixed(6) : 'Not set'}
          </Text>
        </View>
      </View>

      <Text style={styles.instructionText}>
        💡 Tap map or drag the marker to adjust coordinates.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 6,
  },
  locateBtn: {
    backgroundColor: Theme.primary || '#0070F3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnPressed: {
    opacity: 0.8,
  },
  locateBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  mapContainer: {
    height: 220,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  placeholderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    marginBottom: 4,
  },
  placeholderSubtext: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  coordBadge: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 4,
  },
  coordVal: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  instructionText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
});
