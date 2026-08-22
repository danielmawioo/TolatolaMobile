import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  Alert, Platform, Animated,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Location from 'expo-location';
import { Theme } from '@/constants/Theme';
import { logger } from '@/src/lib/logger';

// Only import MapView on native platforms
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  } catch (e) {
    logger.warn('[MapPicker] react-native-maps not available:', e);
  }
}

interface Props {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (coords: { lat: number; lng: number }) => void;
  title?: string;
}

const DAR_ES_SALAAM = {
  latitude: -6.7924,
  longitude: 39.2083,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

export default function MapPicker({
  latitude,
  longitude,
  onLocationSelect,
  title = 'Pin Location on Map',
}: Props) {
  const [isLocating, setIsLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const mapRef = useRef<any>(null);
  const expandAnim = useRef(new Animated.Value(0)).current;

  // Animate expansion
  useEffect(() => {
    Animated.spring(expandAnim, {
      toValue: isExpanded ? 1 : 0,
      useNativeDriver: false,
      tension: 50,
      friction: 9,
    }).start();
  }, [isExpanded]);

  const mapHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 280],
  });

  const currentRegion = {
    latitude: latitude || DAR_ES_SALAAM.latitude,
    longitude: longitude || DAR_ES_SALAAM.longitude,
    latitudeDelta: 0.008,
    longitudeDelta: 0.008,
  };

  const animateToCoords = (lat: number, lng: number) => {
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: 0.006, longitudeDelta: 0.006 },
      600,
    );
  };

  const handleMapPress = (e: any) => {
    const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
    onLocationSelect({ lat, lng });
  };

  const handleMarkerDragEnd = (e: any) => {
    const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
    onLocationSelect({ lat, lng });
  };

  const requestCurrentLocation = async () => {
    setIsLocating(true);
    setErrorMsg(null);
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setErrorMsg('Location services are disabled.');
        setIsLocating(false);
        Alert.alert(
          'Location Services Disabled',
          'Please enable Location Services to use this feature.',
        );
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission was denied.');
        setIsLocating(false);
        Alert.alert(
          'Location Permission Required',
          'TOLA needs access to your location. Please grant permission in settings.',
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = location.coords.latitude;
      const lng = location.coords.longitude;

      onLocationSelect({ lat, lng });

      // Auto-expand and animate map
      if (!isExpanded) setIsExpanded(true);
      setTimeout(() => animateToCoords(lat, lng), 300);
    } catch (error: any) {
      logger.error('[MapPicker] Error getting location:', error);
      setErrorMsg('Could not fetch current GPS location.');
    } finally {
      setIsLocating(false);
    }
  };

  const toggleMap = () => {
    setIsExpanded((prev) => !prev);
  };

  // Web fallback
  if (Platform.OS === 'web' || !MapView) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <FontAwesome name="map" size={16} color={Theme.primary} />
            <Text style={styles.title}>{title}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.gpsBtn, pressed && styles.btnPressed]}
            onPress={requestCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <FontAwesome name="location-arrow" size={12} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.gpsBtnText}>Current GPS</Text>
              </>
            )}
          </Pressable>
        </View>
        {errorMsg && (
          <View style={styles.errorBanner}>
            <FontAwesome name="exclamation-circle" size={14} color="#D32F2F" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}
        <View style={styles.webFallback}>
          <FontAwesome name="map-o" size={40} color={Theme.textMuted} style={{ marginBottom: 8 }} />
          <Text style={styles.webFallbackText}>
            Interactive Map is not available on Web.
          </Text>
          <Text style={styles.webFallbackSub}>
            Use the Address Search or press "Current GPS" to set your coordinates.
          </Text>
        </View>
        <View style={styles.coordRow}>
          <View style={styles.coordBadge}>
            <Text style={styles.coordLabel}>Lat:</Text>
            <Text style={styles.coordVal}>{latitude ? latitude.toFixed(6) : 'Not set'}</Text>
          </View>
          <View style={styles.coordBadge}>
            <Text style={styles.coordLabel}>Lng:</Text>
            <Text style={styles.coordVal}>{longitude ? longitude.toFixed(6) : 'Not set'}</Text>
          </View>
        </View>
      </View>
    );
  }

  // Native (Android/iOS) — real interactive map
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.titleRow} onPress={toggleMap}>
          <View style={styles.mapIconCircle}>
            <FontAwesome name="map-marker" size={16} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              {isExpanded ? 'Tap map to place pin' : 'Tap to open map'}
            </Text>
          </View>
          <FontAwesome
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={Theme.textMuted}
          />
        </Pressable>
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <Pressable
          style={({ pressed }) => [styles.gpsBtn, pressed && styles.btnPressed]}
          onPress={requestCurrentLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <FontAwesome name="crosshairs" size={13} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.gpsBtnText}>My Location</Text>
            </>
          )}
        </Pressable>
        {!isExpanded && (
          <Pressable
            style={({ pressed }) => [styles.expandBtn, pressed && styles.btnPressed]}
            onPress={toggleMap}
          >
            <FontAwesome name="map" size={13} color={Theme.primary} style={{ marginRight: 6 }} />
            <Text style={styles.expandBtnText}>Open Map</Text>
          </Pressable>
        )}
      </View>

      {errorMsg && (
        <View style={styles.errorBanner}>
          <FontAwesome name="exclamation-circle" size={14} color="#D32F2F" style={{ marginRight: 6 }} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Map (animated expand/collapse) */}
      <Animated.View style={[styles.mapWrapper, { height: mapHeight, opacity: expandAnim }]}>
        {isExpanded && (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={currentRegion}
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
            mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
            customMapStyle={mapStyle}
          >
            {latitude && longitude && (
              <Marker
                coordinate={{ latitude, longitude }}
                draggable
                onDragEnd={handleMarkerDragEnd}
                pinColor={Theme.primary}
              >
                <View style={styles.customMarker}>
                  <View style={styles.markerDot} />
                  <View style={styles.markerStem} />
                </View>
              </Marker>
            )}
          </MapView>
        )}

        {/* Recenter button inside map */}
        {isExpanded && latitude && longitude && (
          <Pressable
            style={styles.recenterBtn}
            onPress={() => animateToCoords(latitude, longitude)}
          >
            <FontAwesome name="crosshairs" size={18} color={Theme.primary} />
          </Pressable>
        )}
      </Animated.View>

      {/* Coordinates display */}
      <View style={styles.coordRow}>
        <View style={[styles.coordBadge, latitude ? styles.coordBadgeActive : null]}>
          <FontAwesome name="map-pin" size={10} color={latitude ? Theme.primary : Theme.textMuted} style={{ marginRight: 4 }} />
          <Text style={styles.coordLabel}>Lat:</Text>
          <Text style={[styles.coordVal, latitude ? styles.coordValActive : null]}>
            {latitude ? latitude.toFixed(6) : 'Not set'}
          </Text>
        </View>
        <View style={[styles.coordBadge, longitude ? styles.coordBadgeActive : null]}>
          <FontAwesome name="map-pin" size={10} color={longitude ? Theme.primary : Theme.textMuted} style={{ marginRight: 4 }} />
          <Text style={styles.coordLabel}>Lng:</Text>
          <Text style={[styles.coordVal, longitude ? styles.coordValActive : null]}>
            {longitude ? longitude.toFixed(6) : 'Not set'}
          </Text>
        </View>
      </View>
    </View>
  );
}

// Uber-inspired subtle map style
const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
];

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginVertical: 8,
    overflow: 'hidden',
  },
  header: {
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mapIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: Theme.textMuted,
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  gpsBtn: {
    backgroundColor: Theme.primary || '#0070F3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  btnPressed: {
    opacity: 0.8,
  },
  gpsBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  expandBtn: {
    backgroundColor: Theme.primary + '10',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.primary + '30',
  },
  expandBtnText: {
    color: Theme.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  mapWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative',
  },
  map: {
    flex: 1,
    borderRadius: 14,
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  customMarker: {
    alignItems: 'center',
  },
  markerDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Theme.primary,
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  markerStem: {
    width: 2,
    height: 10,
    backgroundColor: Theme.primary,
    marginTop: -1,
  },
  coordRow: {
    flexDirection: 'row',
    gap: 8,
  },
  coordBadge: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordBadgeActive: {
    backgroundColor: Theme.primary + '08',
    borderColor: Theme.primary + '25',
  },
  coordLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 4,
  },
  coordVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  coordValActive: {
    color: Theme.primary,
    fontWeight: '700',
  },
  // Web fallback
  webFallback: {
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 10,
  },
  webFallbackText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    marginBottom: 4,
  },
  webFallbackSub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
});
