import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';
import { useAuth } from '@/src/contexts/AuthContext';
import { useCart } from '@/src/contexts/CartContext';
import { useNotifications } from '@/src/contexts/NotificationContext';
import { TanzaniaAddressForm } from '@/src/components/checkout/TanzaniaAddressForm';
import { PaymentMethodPicker } from '@/src/components/checkout/PaymentMethodPicker';
import { OrderSummary } from '@/src/components/checkout/OrderSummary';
import { DeliveryLogisticsCard } from '@/src/components/checkout/DeliveryLogisticsCard';
import { TransportMethodPicker } from '@/src/components/checkout/TransportMethodPicker';
import { CheckoutErrorModal } from '@/src/components/checkout/CheckoutErrorModal';
import { PaymentProcessingOverlay } from '@/src/components/checkout/PaymentProcessingOverlay';
import { CheckoutHeader } from '@/src/components/checkout/CheckoutHeader';
import { CheckoutBottomBar } from '@/src/components/checkout/CheckoutBottomBar';
import { useCheckoutSubmit } from '@/src/hooks/useCheckoutSubmit';
import { useDeliveryLogistics } from '@/src/hooks/useDeliveryLogistics';

// Lazy-load the map picker so it doesn't block checkout page render
const MapPicker = lazy(() => import('@/src/components/MapPicker'));

import {
  BUYER_PROTECTION_RATE, INITIAL_ADDRESS,
  type AddressData,
} from '@/src/constants/checkout';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { session, isAuthenticated } = useAuth();
  const { items, totalAmount, clearCart } = useCart();
  const { expoPushToken } = useNotifications();

  // Contact
  const [fullName, setFullName] = useState(
    (session?.user?.full_name as string) || ''
  );
  const [phone, setPhone] = useState(
    (session?.user?.phone as string) || ''
  );
  const [guestEmail, setGuestEmail] = useState('');

  // Address
  const [addressData, setAddressData] = useState<AddressData>(INITIAL_ADDRESS);

  // Transport dropdown UI state (data lives in useDeliveryLogistics)
  const [showTransportPicker, setShowTransportPicker] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('airtel-money');
  const [paymentPhone, setPaymentPhone] = useState(
    (session?.user?.phone as string) || ''
  );
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });

  // Map UI state
  const [showMap, setShowMap] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (items.length === 0) {
      router.replace('/(tabs)/cart');
      return;
    }
    // Mark page as ready immediately so UI renders fast
    setIsReady(true);
  }, []);

  const {
    transportMethods, selectedTransportId, setSelectedTransportId,
    shopDeliveries, shopFees, deliveryFee, isCalculatingDelivery,
    latitude, longitude, setLatitude, setLongitude, handleAddressComplete,
  } = useDeliveryLogistics({
    items,
    onError: (message) => {
      setError(message);
      setShowErrorModal(true);
    },
  });

  const subtotal = totalAmount;
  const insuranceFee = Math.round((subtotal + deliveryFee) * BUYER_PROTECTION_RATE);
  const total = subtotal + deliveryFee + insuranceFee;

  const selectedMethodName = transportMethods.find(
    (m) => m.id === selectedTransportId
  )?.name || 'Select method';

  const { handleSubmit, isLoading, isAwaitingPayment, error, setError, showErrorModal, setShowErrorModal } = useCheckoutSubmit({
    items, fullName, phone, guestEmail, isAuthenticated, addressData, selectedTransportId,
    shopDeliveries, shopFees, paymentMethod, paymentPhone, cardDetails, deliveryFee,
    insuranceFee, total, latitude, longitude, session, expoPushToken, clearCart,
  });

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <PaymentProcessingOverlay visible={isAwaitingPayment} />
      <CheckoutErrorModal visible={showErrorModal} error={error} onClose={() => setShowErrorModal(false)} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <CheckoutHeader total={total} paddingTop={insets.top + 8} onBack={() => router.back()} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 180 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step 1: Contact & Address */}
          <View style={styles.section}>
            <View style={styles.stepRow}>
              <View style={styles.stepBadge}><Text style={styles.stepNumber}>1</Text></View>
              <Text style={styles.stepTitle}>Enter Location</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput style={styles.input} value={fullName} onChangeText={setFullName}
                  placeholder="Enter name" placeholderTextColor={Theme.textMuted} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput style={styles.input} value={phone} onChangeText={setPhone}
                  placeholder="+255..." placeholderTextColor={Theme.textMuted} keyboardType="phone-pad" />
              </View>
              {!isAuthenticated && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Email Address *</Text>
                  <TextInput style={styles.input} value={guestEmail} onChangeText={setGuestEmail}
                    placeholder="your@email.com" placeholderTextColor={Theme.textMuted}
                    keyboardType="email-address" autoCapitalize="none" />
                  <Text style={styles.fieldHint}>We'll send your order confirmation here.</Text>
                </View>
              )}
              <View style={styles.divider} />
              <TanzaniaAddressForm
                value={addressData}
                onChange={setAddressData}
                onAddressComplete={handleAddressComplete}
              />

              {/* Map section — only rendered when user requests it */}
              {!showMap ? (
                <Pressable
                  style={styles.showMapBtn}
                  onPress={() => setShowMap(true)}
                >
                  <View style={styles.showMapIcon}>
                    <FontAwesome name="map-marker" size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.showMapTitle}>Verify on Map</Text>
                    <Text style={styles.showMapSub}>Tap to open interactive map and pin your exact delivery location</Text>
                  </View>
                  <FontAwesome name="chevron-right" size={14} color={Theme.textMuted} />
                </Pressable>
              ) : (
                <Suspense fallback={
                  <View style={styles.mapLoading}>
                    <ActivityIndicator size="small" color={Theme.primary} />
                    <Text style={styles.mapLoadingText}>Loading map...</Text>
                  </View>
                }>
                  <MapPicker
                    latitude={latitude}
                    longitude={longitude}
                    onLocationSelect={({ lat, lng }) => {
                      setLatitude(lat);
                      setLongitude(lng);
                      const dummyAddress = [addressData.street, addressData.ward, addressData.district, addressData.region].filter(Boolean).join(', ') || 'Selected Pin';
                      handleAddressComplete(dummyAddress, { lat, lng });
                    }}
                    title="Verify Delivery Location Pin"
                  />
                </Suspense>
              )}

              <DeliveryLogisticsCard
                isCalculating={isCalculatingDelivery}
                shopDeliveries={shopDeliveries}
                shopFees={shopFees}
                selectedMethodName={selectedMethodName}
              />
            </View>
          </View>

          {/* Step 2: Delivery Method */}
          <View style={styles.section}>
            <View style={styles.stepRow}>
              <View style={styles.stepBadge}><Text style={styles.stepNumber}>2</Text></View>
              <Text style={styles.stepTitle}>Delivery Method</Text>
            </View>
            <TransportMethodPicker
              transportMethods={transportMethods}
              selectedTransportId={selectedTransportId}
              selectedMethodName={selectedMethodName}
              showPicker={showTransportPicker}
              onTogglePicker={() => setShowTransportPicker(!showTransportPicker)}
              onSelect={(transportId) => { setSelectedTransportId(transportId); setShowTransportPicker(false); }}
            />
          </View>

          {/* Step 3: Payment */}
          <View style={styles.section}>
            <View style={styles.stepRow}>
              <View style={styles.stepBadge}><Text style={styles.stepNumber}>3</Text></View>
              <Text style={styles.stepTitle}>Choose Payment</Text>
            </View>
            <View style={styles.card}>
              <PaymentMethodPicker
                paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
                phoneNumber={paymentPhone} setPhoneNumber={setPaymentPhone}
                cardDetails={cardDetails} setCardDetails={setCardDetails}
              />
            </View>
          </View>

          {/* Order Summary */}
          <View style={styles.section}>
            <OrderSummary items={items} subtotal={subtotal} deliveryFee={deliveryFee} insuranceFee={insuranceFee} total={total} />
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <FontAwesome name="exclamation-circle" size={16} color={Theme.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        <CheckoutBottomBar
          total={total}
          itemCount={items.length}
          isLoading={isLoading}
          disabled={isLoading || paymentMethod === 'm-pesa'}
          submitLabel={paymentMethod === 'm-pesa' ? 'Unavailable' : 'Complete Order'}
          paddingBottom={16 + insets.bottom}
          onSubmit={handleSubmit}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  // Content
  scrollContent: { paddingHorizontal: gap.md, paddingTop: 16 },
  section: { marginBottom: 24 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  stepBadge: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: Theme.text,
    alignItems: 'center', justifyContent: 'center',
    ...Theme.shadowSm,
  },
  stepNumber: { fontSize: 15, fontWeight: '800', color: '#fff' },
  stepTitle: { fontSize: 18, fontWeight: '800', color: Theme.text, letterSpacing: -0.3 },
  card: {
    backgroundColor: Theme.background, borderRadius: 24,
    padding: 20, gap: 16, ...Theme.shadowLg,
  },
  fieldGroup: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', color: Theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    height: 48, backgroundColor: Theme.inputBg, borderRadius: Theme.radiusMd,
    borderWidth: 1, borderColor: Theme.inputBorder, paddingHorizontal: 14,
    fontSize: 15, color: Theme.text, fontWeight: '500',
  },
  fieldHint: { fontSize: 10, color: Theme.textMuted, fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: Theme.inputBorder, marginVertical: 4 },
  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14,
    backgroundColor: Theme.error + '10', borderRadius: Theme.radiusMd,
    borderWidth: 1, borderColor: Theme.error + '20',
  },
  errorText: { flex: 1, fontSize: 13, fontWeight: '600', color: Theme.error },
  // Show Map Button Styles
  showMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: Theme.inputBorder,
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    gap: 12,
  },
  showMapIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showMapTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.text,
  },
  showMapSub: {
    fontSize: 11,
    color: Theme.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  mapLoading: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    marginTop: 8,
    gap: 8,
  },
  mapLoadingText: {
    fontSize: 12,
    color: Theme.textMuted,
    fontWeight: '600',
  },
});
