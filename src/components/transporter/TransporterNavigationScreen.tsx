import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';
import { MAPBOX_ACCESS_TOKEN, MAPBOX_STYLE_URL } from '@/src/config/env';
import { buildNavigationMapHtml } from '@/src/lib/navigationMapHtml';
import {
  formatDistanceText,
  maneuverIcon,
  productPositionDescription,
  productPositionLabel,
} from '@/src/lib/navigation';
import {
  useTransporterNavigation,
  type TransporterNavigationParams,
} from '@/src/hooks/useTransporterNavigation';
import type { NavigationTarget } from '@/src/schemas/navigation';
import {
  NavigationMapFrame,
  type NavigationMapFrameHandle,
} from '@/src/components/transporter/NavigationMapFrame';
import { verifyAssignmentPin } from '@/src/services/assignments';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toNumber(value: string | undefined): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function tripHeadline(status: string): string {
  switch (status) {
    case 'picked_up':
      return 'Package picked up';
    case 'in_transit':
      return 'Delivering to customer';
    case 'delivered':
    case 'completed':
      return 'Delivery complete';
    default:
      return 'Heading to pickup';
  }
}

export default function TransporterNavigationScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const raw = useLocalSearchParams<Record<string, string | string[]>>();

  const assignmentId = first(raw.assignmentId);
  const orderId = first(raw.orderId);
  const statusParam = first(raw.status);
  const targetParam = first(raw.target);
  const shopLat = first(raw.shopLat);
  const shopLng = first(raw.shopLng);
  const shopName = first(raw.shopName);
  const shopAddress = first(raw.shopAddress);
  const shopPhone = first(raw.shopPhone);
  const custLat = first(raw.custLat);
  const custLng = first(raw.custLng);
  const custName = first(raw.custName);
  const custAddress = first(raw.custAddress);
  const custPhone = first(raw.custPhone);

  const params = useMemo<TransporterNavigationParams>(
    () => ({
      assignmentId,
      orderId,
      status: statusParam,
      target:
        targetParam === 'pickup' || targetParam === 'dropoff' || targetParam === 'auto'
          ? targetParam
          : 'auto',
      shop: shopLat && shopLng
        ? {
            latitude: toNumber(shopLat) ?? 0,
            longitude: toNumber(shopLng) ?? 0,
            name: shopName,
            address: shopAddress,
            phone: shopPhone,
          }
        : null,
      customer: custLat && custLng
        ? {
            latitude: toNumber(custLat) ?? 0,
            longitude: toNumber(custLng) ?? 0,
            name: custName,
            address: custAddress,
            phone: custPhone,
          }
        : null,
    }),
    [
      assignmentId,
      orderId,
      statusParam,
      targetParam,
      shopLat,
      shopLng,
      shopName,
      shopAddress,
      shopPhone,
      custLat,
      custLng,
      custName,
      custAddress,
      custPhone,
    ],
  );

  const navigation = useTransporterNavigation({
    accessToken: session?.access_token ?? '',
    params,
  });

  const {
    assignment,
    status,
    target,
    selectTarget,
    destination,
    driverLoc,
    locationDenied,
    route,
    routeLoading,
    routeError,
    retryRoute,
    nextStep,
    etaText,
    remainingDistanceText,
    productPosition,
    follow,
    startFollowing,
    fitRoute,
    recenter,
    recenterSignal,
    fitSignal,
    mapReady,
    mapError,
    forceLeaflet,
    handleMapMessage,
    mapPayload,
    advanceStatus,
    advancing,
    progress,
    refreshAssignment,
  } = navigation;

  const [arrivedManually, setArrivedManually] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [deliveryPin, setDeliveryPin] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);

  const isArrivedAtDropoff = useMemo(() => {
    if (arrivedManually) return true;
    if (target === 'dropoff' && status === 'in_transit') {
      if (progress?.remainingMeters !== undefined && progress.remainingMeters <= 80) return true;
      if (nextStep?.step.maneuver === 'arrive' && nextStep.distanceToStepMeters <= 50) return true;
    }
    return false;
  }, [arrivedManually, target, status, progress?.remainingMeters, nextStep]);

  const handleVerifyPin = async () => {
    const targetId = assignmentId || assignment?.id;
    if (!targetId || deliveryPin.trim().length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit PIN.');
      return;
    }
    setVerifyingPin(true);
    try {
      await verifyAssignmentPin(targetId, deliveryPin.trim(), session?.access_token || '');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Delivery Verified', 'Delivery completed and your payout has been released.');
      setPinModalOpen(false);
      setDeliveryPin('');
      await refreshAssignment();
    } catch (err: any) {
      Alert.alert('Verification Failed', err?.message || 'Could not verify PIN. Please try again.');
    } finally {
      setVerifyingPin(false);
    }
  };

  const mapRef = useRef<NavigationMapFrameHandle>(null);

  const mapHtml = useMemo(
    () =>
      buildNavigationMapHtml({
        accessToken: forceLeaflet ? null : MAPBOX_ACCESS_TOKEN || null,
        styleUrl: MAPBOX_STYLE_URL,
        route: [],
        driver: null,
        pickup: null,
        dropoff: null,
        activeTarget: 'pickup',
        productWithDriver: false,
        follow: true,
      }),
    [forceLeaflet],
  );

  useEffect(() => {
    if (!mapReady) return;
    mapRef.current?.post({ type: 'state', payload: mapPayload });
  }, [mapReady, mapPayload]);

  useEffect(() => {
    if (!mapReady || recenterSignal === 0) return;
    mapRef.current?.post({ type: 'state', payload: { recenter: true, follow: true } });
  }, [recenterSignal, mapReady]);

  useEffect(() => {
    if (!mapReady || fitSignal === 0) return;
    mapRef.current?.post({ type: 'state', payload: { fit: true } });
  }, [fitSignal, mapReady]);

  const handleAdvance = useCallback(
    async (nextStatus: 'picked_up' | 'in_transit') => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        await advanceStatus(nextStatus);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err: any) {
        Alert.alert('Could not update trip', err?.message || 'Please try again.');
      }
    },
    [advanceStatus],
  );

  const handleCall = useCallback(() => {
    if (!destination?.phone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${destination.phone}`).catch(() => {
      Alert.alert('Call failed', 'Could not open the phone app.');
    });
  }, [destination?.phone]);

  const selectAndHaptic = useCallback(
    (next: NavigationTarget) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      selectTarget(next);
    },
    [selectTarget],
  );

  const headline = tripHeadline(status);
  const currentInstruction = nextStep?.step.instruction;
  const instructionDistance = nextStep
    ? formatDistanceText(nextStep.distanceToStepMeters)
    : route
      ? 'Arriving'
      : null;
  const hasDestination = Boolean(destination);
  const delivered = status === 'delivered' || status === 'completed';

  return (
    <View style={styles.container}>
      <NavigationMapFrame
        key={forceLeaflet ? 'leaflet' : 'mapbox'}
        ref={mapRef}
        html={mapHtml}
        onMessage={handleMapMessage}
        style={styles.map}
      />

      {!mapReady && (
        <View style={styles.mapLoading}>
          <ActivityIndicator color={Theme.primary} size="large" />
          <Text style={styles.mapLoadingText}>
            {forceLeaflet ? 'Loading fallback map…' : 'Starting navigation map…'}
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          style={styles.iconButton}
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityLabel="Go back"
        >
          <FontAwesome name="arrow-left" size={17} color={Theme.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {headline}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Order #{assignment?.orders?.order_number || orderId?.slice(0, 8) || '—'}
            {driverLoc ? ' • Live GPS' : locationDenied ? ' • GPS off' : ' • Locating…'}
          </Text>
        </View>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: delivered ? Theme.success : Theme.primary }]} />
          <Text style={[styles.statusText, { color: delivered ? Theme.success : Theme.primary }]}>
            {delivered ? 'Delivered' : productPositionLabel(productPosition)}
          </Text>
        </View>
      </View>

      {/* Turn-by-turn card */}
      <View style={[styles.instructionCard, { top: insets.top + 78 }]}>
        <View style={[styles.maneuverCircle, target === 'dropoff' && styles.maneuverCircleDropoff]}>
          {routeLoading && !route ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <FontAwesome
              name={maneuverIcon(nextStep?.step ?? null)}
              size={22}
              color="#fff"
            />
          )}
        </View>
        <View style={styles.instructionTextWrap}>
          <Text style={styles.instructionDistance}>
            {routeLoading && !route ? 'Calculating route…' : instructionDistance || 'Continue'}
          </Text>
          <Text style={styles.instructionText} numberOfLines={3}>
            {routeError
              ? routeError
              : currentInstruction ||
                (hasDestination
                  ? `Head to the ${target === 'pickup' ? 'pickup point' : 'customer'}`
                  : 'Waiting for destination details')}
          </Text>
        </View>
        {routeError ? (
          <Pressable style={styles.retryButton} onPress={retryRoute} hitSlop={8}>
            <FontAwesome name="refresh" size={15} color={Theme.primary} />
          </Pressable>
        ) : null}
      </View>

      {/* Map controls */}
      <View style={[styles.mapControls, { bottom: 300 + insets.bottom }]}>
        <Pressable
          style={styles.mapControl}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            recenter();
          }}
          accessibilityLabel="Recenter on me"
        >
          <FontAwesome name="crosshairs" size={19} color={Theme.text} />
        </Pressable>
        <Pressable
          style={styles.mapControl}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            fitRoute();
          }}
          accessibilityLabel="Fit route on screen"
        >
          <FontAwesome name="expand" size={18} color={Theme.text} />
        </Pressable>
      </View>

      {/* Bottom guidance sheet */}
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={styles.sheetHandle} />

        <View style={styles.metricsRow}>
          <View>
            <Text style={styles.metricValue}>{etaText || '—'}</Text>
            <Text style={styles.metricLabel}>ETA</Text>
          </View>
          <View style={styles.metricDivider} />
          <View>
            <Text style={styles.metricValue}>{remainingDistanceText || '—'}</Text>
            <Text style={styles.metricLabel}>Remaining</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={styles.productChip}>
            <FontAwesome
              name={productPosition === 'with_driver' ? 'cube' : productPosition === 'delivered' ? 'check-circle' : 'shopping-bag'}
              size={12}
              color={productPosition === 'delivered' ? Theme.success : '#0284c7'}
            />
            <Text
              style={[
                styles.productChipText,
                productPosition === 'delivered' && { color: Theme.success },
              ]}
            >
              {productPositionLabel(productPosition)}
            </Text>
          </View>
        </View>

        <Text style={styles.productDescription} numberOfLines={1}>
          {productPositionDescription(productPosition)}
        </Text>

        <View style={styles.destinationRow}>
          <View style={[styles.destinationIcon, target === 'dropoff' && styles.destinationIconDropoff]}>
            <FontAwesome
              name={target === 'pickup' ? 'shopping-bag' : 'home'}
              size={16}
              color="#fff"
            />
          </View>
          <View style={styles.destinationText}>
            <Text style={styles.destinationLabel}>
              {target === 'pickup' ? 'Pick up from' : 'Deliver to'}
            </Text>
            <Text style={styles.destinationName} numberOfLines={1}>
              {destination?.name || 'Destination coordinates missing'}
            </Text>
            {destination?.address ? (
              <Text style={styles.destinationAddress} numberOfLines={1}>
                {destination.address}
              </Text>
            ) : null}
          </View>
          {destination?.phone ? (
            <Pressable style={styles.callButton} onPress={handleCall} hitSlop={8} accessibilityLabel="Call destination">
              <FontAwesome name="phone" size={15} color={Theme.primary} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.segmented}>
          <Pressable
            style={[styles.segment, target === 'pickup' && styles.segmentActive]}
            onPress={() => selectAndHaptic('pickup')}
          >
            <FontAwesome
              name="shopping-bag"
              size={11}
              color={target === 'pickup' ? '#fff' : Theme.textSecondary}
            />
            <Text style={[styles.segmentText, target === 'pickup' && styles.segmentTextActive]}>
              Pickup
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segment, target === 'dropoff' && styles.segmentActiveDropoff]}
            onPress={() => selectAndHaptic('dropoff')}
          >
            <FontAwesome
              name="home"
              size={11}
              color={target === 'dropoff' ? '#fff' : Theme.textSecondary}
            />
            <Text style={[styles.segmentText, target === 'dropoff' && styles.segmentTextActive]}>
              Drop-off
            </Text>
          </Pressable>
        </View>

        {!hasDestination ? (
          <View style={styles.warning}>
            <FontAwesome name="exclamation-triangle" size={13} color="#b45309" />
            <Text style={styles.warningText}>
              This {target === 'pickup' ? 'pickup' : 'delivery'} address has no map coordinates yet.
            </Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (follow) fitRoute();
              else startFollowing();
            }}
            disabled={!hasDestination}
          >
            <FontAwesome name={follow ? 'expand' : 'location-arrow'} size={15} color="#fff" />
            <Text style={styles.primaryButtonText}>
              {follow ? 'Route overview' : 'Start navigation'}
            </Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              recenter();
            }}
            accessibilityLabel="Recenter"
          >
            <FontAwesome name="crosshairs" size={16} color={Theme.primary} />
          </Pressable>
        </View>

        {status === 'accepted' || status === 'assigned' ? (
          <Pressable
            style={[styles.stepButton, advancing && styles.disabled]}
            onPress={() => handleAdvance('picked_up')}
            disabled={advancing}
          >
            {advancing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <FontAwesome name="cube" size={14} color="#fff" />
                <Text style={styles.stepButtonText}>Mark as picked up</Text>
              </>
            )}
          </Pressable>
        ) : null}

        {status === 'picked_up' ? (
          <Pressable
            style={[styles.stepButton, { backgroundColor: '#7c3aed' }, advancing && styles.disabled]}
            onPress={() => handleAdvance('in_transit')}
            disabled={advancing}
          >
            {advancing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <FontAwesome name="truck" size={14} color="#fff" />
                <Text style={styles.stepButtonText}>Start delivery</Text>
              </>
            )}
          </Pressable>
        ) : null}

        {status === 'in_transit' ? (
          <View style={{ gap: 8 }}>
            {isArrivedAtDropoff ? (
              <Pressable
                style={[styles.stepButton, { backgroundColor: Theme.success }]}
                onPress={() => setPinModalOpen(true)}
              >
                <FontAwesome name="check-circle" size={14} color="#fff" />
                <Text style={styles.stepButtonText}>Complete Delivery (Enter PIN)</Text>
              </Pressable>
            ) : (
              <View style={styles.completeNote}>
                <FontAwesome name="info-circle" size={13} color={Theme.primary} />
                <Text style={styles.completeNoteText}>Heading to customer...</Text>
                <Pressable onPress={() => setArrivedManually(true)}>
                  <Text style={styles.completeNoteLink}>Arrived?</Text>
                </Pressable>
              </View>
            )}
            <Pressable onPress={() => router.back()} style={{ alignSelf: 'center', marginTop: 2 }}>
              <Text style={styles.completeNoteLink}>Open Trips</Text>
            </Pressable>
          </View>
        ) : null}

        {locationDenied ? (
          <Text style={styles.footnote}>
            Location is off — routing from the pickup point. Turn on GPS for live turn-by-turn.
          </Text>
        ) : null}
        {mapError ? (
          <Text style={styles.footnote} numberOfLines={2}>
            Map note: {mapError}
          </Text>
        ) : null}
      </View>

      <Modal visible={pinModalOpen} transparent animationType="fade">
        <View style={styles.pinOverlay}>
          <View style={styles.pinCard}>
            <Text style={styles.pinTitle}>Verify Delivery 📦</Text>
            <Text style={styles.pinDesc}>
              Enter the 4-digit Delivery PIN sent to the customer&apos;s phone to complete this delivery.
            </Text>
            <TextInput
              style={styles.pinInput}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="1234"
              placeholderTextColor="#94a3b8"
              value={deliveryPin}
              onChangeText={(t) => setDeliveryPin(t.replace(/\D/g, '').slice(0, 4))}
              autoFocus
            />
            <Pressable
              style={[
                styles.stepButton,
                { backgroundColor: Theme.success, width: '100%', marginTop: 8 },
                (verifyingPin || deliveryPin.length !== 4) && styles.disabled,
              ]}
              onPress={handleVerifyPin}
              disabled={verifyingPin || deliveryPin.length !== 4}
            >
              {verifyingPin ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <FontAwesome name="check-circle" size={14} color="#fff" />
                  <Text style={styles.stepButtonText}>Verify & Complete</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={{ marginTop: 8 }}
              onPress={() => {
                setPinModalOpen(false);
                setDeliveryPin('');
              }}
            >
              <Text style={{ fontSize: 13, color: Theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e8eef5' },
  map: { flex: 1 },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
  },
  mapLoadingText: { fontSize: 13, color: Theme.textMuted, fontWeight: '600' },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.inputBorder,
    ...Theme.shadowSm,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  headerText: { flex: 1, marginLeft: 10 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: Theme.text },
  headerSubtitle: { fontSize: 11, color: Theme.textMuted, marginTop: 1 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '800' },

  instructionCard: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.98)',
    ...Theme.shadowMd,
  },
  maneuverCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
  },
  maneuverCircleDropoff: { backgroundColor: '#7c3aed' },
  instructionTextWrap: { flex: 1 },
  instructionDistance: { fontSize: 12, fontWeight: '800', color: Theme.primary, marginBottom: 2 },
  instructionText: { fontSize: 14, fontWeight: '700', color: Theme.text, lineHeight: 19 },
  retryButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },

  mapControls: { position: 'absolute', right: 14, gap: 10 },
  mapControl: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    ...Theme.shadowMd,
  },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: 10,
    ...Theme.shadowLg,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginBottom: 2,
  },
  metricsRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  metricValue: { fontSize: 22, fontWeight: '900', color: Theme.text },
  metricLabel: { fontSize: 10, fontWeight: '700', color: Theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  metricDivider: { width: 1, height: 28, backgroundColor: Theme.inputBorder },
  productChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
  },
  productChipText: { fontSize: 10, fontWeight: '800', color: '#0284c7' },
  productDescription: { fontSize: 11, color: Theme.textMuted, marginTop: -4 },

  destinationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  destinationIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
  },
  destinationIconDropoff: { backgroundColor: '#7c3aed' },
  destinationText: { flex: 1 },
  destinationLabel: { fontSize: 10, fontWeight: '700', color: Theme.textMuted, textTransform: 'uppercase' },
  destinationName: { fontSize: 15, fontWeight: '800', color: Theme.text, marginTop: 1 },
  destinationAddress: { fontSize: 11, color: Theme.textSecondary, marginTop: 1 },
  callButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },

  segmented: {
    flexDirection: 'row',
    gap: 6,
    padding: 3,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  segmentActive: { backgroundColor: '#0284c7' },
  segmentActiveDropoff: { backgroundColor: '#7c3aed' },
  segmentText: { fontSize: 12, fontWeight: '700', color: Theme.textSecondary },
  segmentTextActive: { color: '#fff' },

  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 9,
    borderRadius: 10,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  warningText: { flex: 1, fontSize: 11, color: '#92400e', fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 10 },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Theme.primary,
  },
  primaryButtonText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  secondaryButton: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#eff6ff',
  },
  stepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#0284c7',
  },
  stepButtonText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  disabled: { opacity: 0.6 },

  completeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
  },
  completeNoteText: { flex: 1, fontSize: 11, color: Theme.textSecondary, fontWeight: '600' },
  completeNoteLink: { fontSize: 11, fontWeight: '800', color: Theme.primary },
  footnote: { fontSize: 10, color: Theme.textMuted, lineHeight: 14 },

  pinOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pinCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  pinTitle: { fontSize: 18, fontWeight: '800', color: Theme.text },
  pinDesc: { fontSize: 12, color: Theme.textSecondary, textAlign: 'center' },
  pinInput: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 10,
    textAlign: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    width: '100%',
    paddingVertical: 10,
    marginVertical: 6,
  },
});
