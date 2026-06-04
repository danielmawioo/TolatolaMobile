import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking, Alert } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Location from 'expo-location';
import { Theme } from '@/constants/Theme';

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

export default function MapPicker({ latitude, longitude, onLocationSelect, title = 'Pin Location on Map' }: Props) {
  const [isLocating, setIsLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
          'Please enable Location Services to use this feature.'
        );
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission was denied.');
        setIsLocating(false);
        Alert.alert(
          'Location Permission Required',
          'TOLA needs access to your location. Please grant permission in settings.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      onLocationSelect({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error: any) {
      console.error('[MapPicker Web] Error getting location:', error);
      setErrorMsg('Could not fetch current GPS location.');
    } finally {
      setIsLocating(false);
    }
  };

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
        <View style={styles.errorBanner}>
          <FontAwesome name="exclamation-circle" size={14} color="#D32F2F" style={{ marginRight: 6 }} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      <View style={styles.mapContainer}>
        <View style={styles.placeholderContainer}>
          <FontAwesome name="map-o" size={48} color={Theme.textMuted} style={{ marginBottom: 12 }} />
          <Text style={styles.placeholderText}>
            Interactive Map is not available on Web.
          </Text>
          <Text style={styles.placeholderSubtext}>
            Please use the Address Search to resolve coordinates, or press "Current GPS" to fetch your location coordinates automatically.
          </Text>
        </View>
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
});
