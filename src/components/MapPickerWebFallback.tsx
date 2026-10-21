import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';

interface Props {
  title: string;
  latitude: number | null;
  longitude: number | null;
  isLocating: boolean;
  errorMsg: string | null;
  onRequestLocation: () => void;
}

/** Web (and maps-unavailable) stand-in for the native MapPicker. */
export function MapPickerWebFallback({
  title,
  latitude,
  longitude,
  isLocating,
  errorMsg,
  onRequestLocation,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <FontAwesome name="map" size={16} color={Theme.primary} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.gpsBtn, pressed && styles.btnPressed]}
          onPress={onRequestLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <FontAwesome name="location-arrow" size={12} color="#fff" style={styles.gpsIcon} />
              <Text style={styles.gpsBtnText}>Current GPS</Text>
            </>
          )}
        </Pressable>
      </View>
      {errorMsg && (
        <View style={styles.errorBanner}>
          <FontAwesome name="exclamation-circle" size={14} color="#D32F2F" style={styles.errorIcon} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}
      <View style={styles.webFallback}>
        <FontAwesome name="map-o" size={40} color={Theme.textMuted} style={styles.webIcon} />
        <Text style={styles.webFallbackText}>
          Interactive Map is not available on Web.
        </Text>
        <Text style={styles.webFallbackSub}>
          {'Use the Address Search or press "Current GPS" to set your coordinates.'}
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
  header: { marginBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  gpsBtn: {
    backgroundColor: Theme.primary || '#0070F3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  btnPressed: { opacity: 0.8 },
  gpsIcon: { marginRight: 6 },
  gpsBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorIcon: { marginRight: 6 },
  errorText: { color: '#D32F2F', fontSize: 12, fontWeight: '500', flex: 1 },
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
  webIcon: { marginBottom: 8 },
  webFallbackText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    marginBottom: 4,
  },
  webFallbackSub: { fontSize: 11, color: '#64748B', textAlign: 'center' },
  coordRow: { flexDirection: 'row', gap: 8 },
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
  coordLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', marginRight: 4 },
  coordVal: { fontSize: 11, fontWeight: '600', color: '#334155' },
});
