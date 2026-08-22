import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, Linking, Platform
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';
import { apiGet } from '@/src/services/api';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { WebView } from 'react-native-webview';
import { logger } from '@/src/lib/logger';

/**
 * Generates the HTML for the transporter interactive Leaflet/OpenStreetMap inside a WebView.
 * Shows the active route, shop location, customer location, and driver location.
 */
function buildDeliveryLeafletHtml(
  driverLoc: { latitude: number; longitude: number } | null,
  sLat: number, sLng: number, shopName: string,
  cLat: number, cLng: number, custName: string,
  routeCoords: Array<{ latitude: number; longitude: number }>,
  isHeadingToCustomer: boolean
): string {
  const routeCoordsJson = JSON.stringify(routeCoords.map(c => [c.latitude, c.longitude]));
  const startLat = driverLoc?.latitude || sLat || -6.7924;
  const startLng = driverLoc?.longitude || sLng || 39.2083;

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
    var map = L.map('map', { zoomControl: false }).setView([${startLat}, ${startLng}], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    var routeCoords = ${routeCoordsJson};
    if (routeCoords.length > 0) {
      var polyline = L.polyline(routeCoords, {
        color: '${isHeadingToCustomer ? '#7c3aed' : '#0284c7'}',
        weight: 5
      }).addTo(map);
      map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
    }

    // Driver Marker
    ${driverLoc ? `
      L.marker([${driverLoc.latitude}, ${driverLoc.longitude}], {
        icon: L.divIcon({
          className: 'driver-marker',
          html: '<div style="width: 24px; height: 24px; border-radius: 12px; background: #6366f1; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">D</div>',
          iconSize: [24, 24]
        })
      }).addTo(map).bindPopup("Your Location");
    ` : ''}

    // Shop Marker
    ${sLat !== 0 ? `
      L.marker([${sLat}, ${sLng}], {
        icon: L.divIcon({
          className: 'shop-marker',
          html: '<div style="width: 24px; height: 24px; border-radius: 12px; background: #0284c7; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">S</div>',
          iconSize: [24, 24]
        })
      }).addTo(map).bindPopup(${JSON.stringify(shopName)});
    ` : ''}

    // Customer Marker
    ${cLat !== 0 ? `
      L.marker([${cLat}, ${cLng}], {
        icon: L.divIcon({
          className: 'customer-marker',
          html: '<div style="width: 24px; height: 24px; border-radius: 12px; background: #7c3aed; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">C</div>',
          iconSize: [24, 24]
        })
      }).addTo(map).bindPopup(${JSON.stringify(custName)});
    ` : ''}
  </script>
</body>
</html>`;
}

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

  const mapRef = useRef<MapView>(null);

  // Parse coords
  const sLat = parseFloat(params.shopLat || '0');
  const sLng = parseFloat(params.shopLng || '0');
  const cLat = parseFloat(params.custLat || '0');
  const cLng = parseFloat(params.custLng || '0');

  const [loading, setLoading] = useState(true);
  const [driverLoc, setDriverLoc] = useState<{ latitude: number; longitude: number; heading?: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance?: string; duration?: string } | null>(null);
  const [useLiveLocation, setUseLiveLocation] = useState(true);
  
  // Custom manual start location for flexibility
  const [routingSource, setRoutingSource] = useState<'my_location' | 'shop'>('my_location');

  // 1. Get Live Driver Location & watch position
  useEffect(() => {
    let watchSubscription: any = null;

    const setupLocation = async () => {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          Alert.alert(
            'Location Services Disabled',
            'Your device GPS is turned off. Please enable Location Services to use live guiding instructions.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
          setLoading(false);
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Location Permission Required',
            'Allow location access to get live guiding instructions. Please grant permission in settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
          setLoading(false);
          return;
        }

        // Get initial location
        const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setDriverLoc({
          latitude: initial.coords.latitude,
          longitude: initial.coords.longitude,
          heading: initial.coords.heading || 0
        });

        // Watch driver movements
        watchSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 5
          },
          (newLoc) => {
            setDriverLoc({
              latitude: newLoc.coords.latitude,
              longitude: newLoc.coords.longitude,
              heading: newLoc.coords.heading || 0
            });
          }
        );
      } catch (err) {
        logger.error('Location setup error', err);
      }
    };

    setupLocation();

    return () => {
      if (watchSubscription) {
        watchSubscription.remove();
      }
    };
  }, []);

  // 2. Fetch Directions Route
  useEffect(() => {
    const fetchDirections = async () => {
      // Determine origin and destination based on trip status
      const originLatitude = routingSource === 'my_location' ? (driverLoc?.latitude || sLat) : sLat;
      const originLongitude = routingSource === 'my_location' ? (driverLoc?.longitude || sLng) : sLng;
      
      // If order is picked_up/in_transit, route to customer. If accepted, route to shop first.
      const isHeadingToCustomer = ['picked_up', 'in_transit'].includes(params.status || '');
      const destLatitude = isHeadingToCustomer ? cLat : sLat;
      const destLongitude = isHeadingToCustomer ? cLng : sLng;

      if (!originLatitude || !originLongitude || !destLatitude || !destLongitude) {
        setLoading(false);
        return;
      }

      try {
        const res = await apiGet<any>(
          `/maps/directions?originLat=${originLatitude}&originLng=${originLongitude}&destLat=${destLatitude}&destLng=${destLongitude}`,
          session?.access_token || ''
        );

        if (res && res.routes?.[0]) {
          const route = res.routes[0];
          
          // If we received structured polyline coordinates, use them
          if (route.coordinates && route.coordinates.length > 0) {
            setRouteCoords(route.coordinates);
          } 
          // Otherwise parse Google's overview_polyline if returned
          else if (route.overview_polyline?.points) {
            const decoded = decodePolyline(route.overview_polyline.points);
            setRouteCoords(decoded);
          }

          const leg = route.legs?.[0];
          if (leg) {
            setRouteInfo({
              distance: leg.distance?.text || 'N/A',
              duration: leg.duration?.text || 'N/A'
            });
          }
        }
      } catch (err) {
        logger.error('Error fetching route directions', err);
      } finally {
        setLoading(false);
      }
    };

    if (driverLoc || routingSource === 'shop') {
      fetchDirections();
    }
  }, [driverLoc?.latitude, driverLoc?.longitude, routingSource, params.status]);

  // Decode Google polyline string helper
  const decodePolyline = (t: string) => {
    let points: Array<{ latitude: number; longitude: number }> = [];
    let index = 0, len = t.length;
    let lat = 0, lng = 0;
    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = t.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      shift = 0;
      result = 0;
      do {
        b = t.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  };

  const handleRecenter = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (mapRef.current && driverLoc) {
      mapRef.current.animateToRegion({
        latitude: driverLoc.latitude,
        longitude: driverLoc.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015
      }, 1000);
    }
  };

  const handleNavigateExternally = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isHeadingToCustomer = ['picked_up', 'in_transit'].includes(params.status || '');
    const lat = isHeadingToCustomer ? cLat : sLat;
    const lng = isHeadingToCustomer ? cLng : sLng;
    const label = encodeURIComponent(isHeadingToCustomer ? params.custName : params.shopName);

    const url = Platform.select({
      ios: `maps://app?daddr=${lat},${lng}&q=${label}`,
      android: `google.navigation:q=${lat},${lng}`
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Failed to launch external navigation app.');
      });
    }
  };

  const handleNavigateVendorToCustomer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRoutingSource(prev => prev === 'my_location' ? 'shop' : 'my_location');
  };

  const isHeadingToCustomer = ['picked_up', 'in_transit'].includes(params.status || '');

  const [nativeMapFailed, setNativeMapFailed] = useState(false);

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

      {/* Map Content */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Theme.primary} size="large" />
          <Text style={styles.loadingText}>Fetching GPS directions...</Text>
        </View>
      ) : !nativeMapFailed ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: driverLoc?.latitude || sLat,
            longitude: driverLoc?.longitude || sLng,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03
          }}
          showsUserLocation={false}
          showsCompass={true}
        >
          {/* Driver Marker */}
          {driverLoc && (
            <Marker 
              coordinate={{ latitude: driverLoc.latitude, longitude: driverLoc.longitude }}
              title="Your Location"
              flat
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.markerDriver, { transform: [{ rotate: `${driverLoc.heading || 0}deg` }] }]}>
                <FontAwesome name="location-arrow" size={18} color="#fff" />
              </View>
            </Marker>
          )}

          {/* Shop Marker */}
          {sLat !== 0 && (
            <Marker coordinate={{ latitude: sLat, longitude: sLng }} title={params.shopName}>
              <View style={styles.markerShop}>
                <FontAwesome name="shopping-bag" size={14} color="#fff" />
              </View>
            </Marker>
          )}

          {/* Customer Marker */}
          {cLat !== 0 && (
            <Marker coordinate={{ latitude: cLat, longitude: cLng }} title={params.custName}>
              <View style={styles.markerCustomer}>
                <FontAwesome name="home" size={15} color="#fff" />
              </View>
            </Marker>
          )}

          {/* Polyline Route */}
          {routeCoords.length > 0 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor={isHeadingToCustomer ? '#7c3aed' : '#0284c7'}
              strokeWidth={5}
            />
          )}
        </MapView>
      ) : (
        <WebView
          source={{
            html: buildDeliveryLeafletHtml(
              driverLoc,
              sLat,
              sLng,
              params.shopName || 'Shop',
              cLat,
              cLng,
              params.custName || 'Customer',
              routeCoords,
              isHeadingToCustomer
            )
          }}
          style={styles.map}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
        />
      )}

      {/* Floating Controls */}
      {driverLoc && !nativeMapFailed && (
        <Pressable style={styles.recenterFloat} onPress={handleRecenter}>
          <FontAwesome name="crosshairs" size={18} color={Theme.text} />
        </Pressable>
      )}

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
  
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', gap: 14 },
  loadingText: { fontSize: 14, color: Theme.textMuted },
  
  map: { flex: 1 },
  
  // Custom Markers
  markerDriver: { width: 32, height: 32, borderRadius: 16, backgroundColor: Theme.primary, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', ...Theme.shadowSm },
  markerShop: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#0284c7', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', ...Theme.shadowSm },
  markerCustomer: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#7c3aed', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', ...Theme.shadowSm },
  
  // Floating Controls
  recenterFloat: { position: 'absolute', right: 16, bottom: 210, width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...Theme.shadowMd },
  
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
