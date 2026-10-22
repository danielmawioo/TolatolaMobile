import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, ActivityIndicator,
  Alert, Platform, Animated,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Location from 'expo-location';
import { Theme } from '@/constants/Theme';
import { UBER_MAP_STYLE } from '@/src/constants/mapStyle';
import { logger } from '@/src/lib/logger';
import { MapPickerWebFallback } from '@/src/components/MapPickerWebFallback';
import { styles } from '@/src/components/MapPicker.styles';

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

  if (Platform.OS === 'web' || !MapView) {
    return (
      <MapPickerWebFallback
        title={title}
        latitude={latitude}
        longitude={longitude}
        isLocating={isLocating}
        errorMsg={errorMsg}
        onRequestLocation={requestCurrentLocation}
      />
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
            customMapStyle={UBER_MAP_STYLE}
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
