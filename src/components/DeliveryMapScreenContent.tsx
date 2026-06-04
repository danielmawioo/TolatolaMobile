import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, Alert, Linking
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';
import { apiGet } from '@/src/services/api';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeliveryMapScreenContent() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    assignmentId: string;
    orderId: string;
    shopLat: string;
    shopLng: string;
    shopName: string;
    custLat: string;
    custLng: string;
    custName: string;
    status: string;
  }>();

  // Parse coords
  const sLat = parseFloat(params.shopLat || '0');
  const sLng = parseFloat(params.shopLng || '0');
  const cLat = parseFloat(params.custLat || '0');
  const cLng = parseFloat(params.custLng || '0');

  const [driverLoc, setDriverLoc] = useState<{ latitude: number; longitude: number; heading?: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance?: string; duration?: string } | null>(null);
  
  // Custom manual start location for flexibility
  const [routingSource, setRoutingSource] = useState<'my_location' | 'shop'>('my_location');

  // 1. Get Live Driver Location
  useEffect(() => {
    const setupLocation = async () => {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return;
        }

        const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setDriverLoc({
          latitude: initial.coords.latitude,
          longitude: initial.coords.longitude,
          heading: initial.coords.heading || 0
        });
      } catch (err) {
        console.error('Location setup error', err);
      }
    };

    setupLocation();
  }, []);

  // 2. Fetch Directions Route Info
  useEffect(() => {
    const fetchDirections = async () => {
      const originLatitude = routingSource === 'my_location' ? (driverLoc?.latitude || sLat) : sLat;
      const originLongitude = routingSource === 'my_location' ? (driverLoc?.longitude || sLng) : sLng;
      
      const isHeadingToCustomer = ['picked_up', 'in_transit'].includes(params.status || '');
      const destLatitude = isHeadingToCustomer ? cLat : sLat;
      const destLongitude = isHeadingToCustomer ? cLng : sLng;

      if (!originLatitude || !originLongitude || !destLatitude || !destLongitude) {
        return;
      }

      try {
        const res = await apiGet<any>(
          `/maps/directions?originLat=${originLatitude}&originLng=${originLongitude}&destLat=${destLatitude}&destLng=${destLongitude}`,
          session?.access_token || ''
        );

        if (res && res.routes?.[0]) {
          const route = res.routes[0];
          const leg = route.legs?.[0];
          if (leg) {
            setRouteInfo({
              distance: leg.distance?.text || 'N/A',
              duration: leg.duration?.text || 'N/A'
            });
          }
        }
      } catch (err) {
        console.error('Error fetching route directions', err);
      }
    };

    if (driverLoc || routingSource === 'shop') {
      fetchDirections();
    }
  }, [driverLoc?.latitude, driverLoc?.longitude, routingSource, params.status]);

  const handleNavigateExternally = () => {
    const isHeadingToCustomer = ['picked_up', 'in_transit'].includes(params.status || '');
    const lat = isHeadingToCustomer ? cLat : sLat;
    const lng = isHeadingToCustomer ? cLng : sLng;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Failed to launch navigation link.');
    });
  };

  const handleNavigateVendorToCustomer = () => {
    if (!sLat || !sLng || !cLat || !cLng) {
      Alert.alert('Error', 'Vendor or Customer coordinates are missing.');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&origin=${sLat},${sLng}&destination=${cLat},${cLng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Failed to open Google Maps directions.');
    });
  };

  const toggleRoutingSource = () => {
    setRoutingSource(prev => prev === 'my_location' ? 'shop' : 'my_location');
  };

  const isHeadingToCustomer = ['picked_up', 'in_transit'].includes(params.status || '');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={16} color={Theme.text} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Delivery Navigator</Text>
          <Text style={styles.headerSubtitle}>Order #{params.orderId?.slice(0, 8)}</Text>
        </View>
        <Pressable 
          style={[styles.sourceBtn, routingSource === 'shop' && styles.sourceBtnActive]} 
          onPress={toggleRoutingSource}
        >
          <FontAwesome name="exchange" size={12} color={routingSource === 'shop' ? '#fff' : Theme.primary} />
          <Text style={[styles.sourceBtnText, routingSource === 'shop' && { color: '#fff' }]}>
            {routingSource === 'my_location' ? 'Live GPS' : 'Shop Route'}
          </Text>
        </Pressable>
      </View>

      {/* Fallback routing details on web */}
      <View style={styles.fallbackContainer}>
        <FontAwesome name="map" size={54} color={Theme.textMuted} />
        <Text style={styles.fallbackTitle}>Interactive Map Interface</Text>
        <Text style={styles.fallbackDesc}>
          Dynamic routing is active from **{routingSource === 'my_location' ? 'Your Live Location' : params.shopName}** to **{isHeadingToCustomer ? params.custName : params.shopName}**.
        </Text>

        <View style={styles.fallbackCard}>
          <View style={styles.fallbackLeg}>
            <FontAwesome name="dot-circle-o" size={16} color={Theme.primary} />
            <Text style={styles.fallbackLegText}>Origin: {routingSource === 'my_location' ? 'My GPS Location' : params.shopName}</Text>
          </View>
          <View style={styles.fallbackLine} />
          <View style={styles.fallbackLeg}>
            <FontAwesome name="map-marker" size={18} color={isHeadingToCustomer ? '#7c3aed' : '#16a34a'} />
            <Text style={styles.fallbackLegText}>Destination: {isHeadingToCustomer ? params.custName : params.shopName}</Text>
          </View>
        </View>
      </View>

      {/* Bottom Guidance Sheet */}
      <View style={[styles.guidanceSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.guidanceMeta}>
          <View style={[styles.guidanceStatus, { backgroundColor: isHeadingToCustomer ? '#f3e8ff' : '#e0f2fe' }]}>
            <FontAwesome name={isHeadingToCustomer ? 'truck' : 'shopping-bag'} size={12} color={isHeadingToCustomer ? '#7c3aed' : '#0284c7'} />
            <Text style={[styles.guidanceStatusText, { color: isHeadingToCustomer ? '#7c3aed' : '#0284c7' }]}>
              {isHeadingToCustomer ? 'Delivering to Customer' : 'Heading to Pickup Merchant'}
            </Text>
          </View>
          
          {routeInfo ? (
            <Text style={styles.guidanceMetrics}>
              {routeInfo.distance} • {routeInfo.duration}
            </Text>
          ) : (
            <Text style={styles.guidanceMetrics}>Calculating path...</Text>
          )}
        </View>

        <Text style={styles.destinationName}>
          Target: {isHeadingToCustomer ? params.custName : params.shopName}
        </Text>

        <View style={styles.buttonRow}>
          <Pressable style={[styles.actionBtn, { flex: 1 }]} onPress={handleNavigateExternally}>
            <FontAwesome name="location-arrow" size={14} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>To Target</Text>
          </Pressable>

          <Pressable style={[styles.actionBtn, styles.routeBtn, { flex: 1 }]} onPress={handleNavigateVendorToCustomer}>
            <FontAwesome name="map-signs" size={14} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>Shop ➔ Cust</Text>
          </Pressable>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBorder,
    ...Theme.shadowSm
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
  headerTitleContainer: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Theme.text },
  headerSubtitle: { fontSize: 11, color: Theme.textMuted, marginTop: 1 },
  sourceBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Theme.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  sourceBtnActive: { backgroundColor: Theme.primary },
  sourceBtnText: { fontSize: 11, fontWeight: '700', color: Theme.primary },
  
  // Fallback View
  fallbackContainer: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  fallbackTitle: { fontSize: 20, fontWeight: '800', color: Theme.text },
  fallbackDesc: { fontSize: 13, color: Theme.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },
  fallbackCard: { width: '100%', backgroundColor: Theme.backgroundSecondary, borderRadius: 16, padding: 16, marginTop: 12, gap: 2 },
  fallbackLeg: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  fallbackLegText: { fontSize: 13, fontWeight: '700', color: Theme.text },
  fallbackLine: { width: 2, height: 24, backgroundColor: Theme.inputBorder, marginLeft: 7 },

  // Guidance Sheet
  guidanceSheet: { backgroundColor: '#fff', padding: 18, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 12, ...Theme.shadowLg },
  guidanceMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  guidanceStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  guidanceStatusText: { fontSize: 11, fontWeight: '800' },
  guidanceMetrics: { fontSize: 14, fontWeight: '700', color: Theme.text },
  destinationName: { fontSize: 18, fontWeight: '800', color: Theme.text },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#16a34a', paddingVertical: 14, borderRadius: 12, marginTop: 4 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  routeBtn: { backgroundColor: '#7c3aed' },
});
