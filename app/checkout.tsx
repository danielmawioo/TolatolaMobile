import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';
import { useAuth } from '@/src/contexts/AuthContext';
import { useCart } from '@/src/contexts/CartContext';
import { apiGet, apiPost } from '@/src/services/api';
import { OptimizedImage } from '@/components/OptimizedImage';
import { TanzaniaAddressForm } from '@/src/components/checkout/TanzaniaAddressForm';
import { PaymentMethodPicker } from '@/src/components/checkout/PaymentMethodPicker';
import {
  BUYER_PROTECTION_RATE, INITIAL_ADDRESS,
  MOBILE_MONEY_PROVIDERS, CARD_PROVIDERS,
  type AddressData, type TransportMethod,
} from '@/src/constants/checkout';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { session, isAuthenticated } = useAuth();
  const { items, totalAmount, clearCart } = useCart();

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

  // Transport
  const [transportMethods, setTransportMethods] = useState<TransportMethod[]>([]);
  const [selectedTransportId, setSelectedTransportId] = useState('');
  const [showTransportPicker, setShowTransportPicker] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('airtel-money');
  const [paymentPhone, setPaymentPhone] = useState(
    (session?.user?.phone as string) || ''
  );
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [isAwaitingPayment, setIsAwaitingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delivery fee & Logistics
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [shopDeliveries, setShopDeliveries] = useState<Record<string, { distanceKm: number, duration: string }>>({});
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);

  useEffect(() => {
    if (items.length === 0) {
      router.replace('/(tabs)/cart');
      return;
    }
    apiGet<{ data: TransportMethod[] }>('/transport-methods')
      .then((res) => {
        const methods = (res as any).data || (Array.isArray(res) ? res : []);
        setTransportMethods(methods);
        if (methods.length > 0) setSelectedTransportId(methods[0].id);
      })
      .catch(() => {});
  }, []);

  // Calculate derived fees per shop based on distances
  const shopFees = React.useMemo(() => {
    const method = transportMethods.find((m) => m.id === selectedTransportId);
    const rateKm = Number(method?.rate_per_km) || 0;
    const rateKg = Number(method?.rate_per_kg) || 0;
    
    const fees: Record<string, number> = {};
    for (const sId in shopDeliveries) {
       const distanceKm = shopDeliveries[sId].distanceKm;
       const weight = items.filter(i => (i.shop_id || 'unknown') === sId).reduce((sum, i) => sum + i.quantity, 0);
       let fee = 0;
       if (rateKg > 0) fee = weight * rateKg;
       else if (rateKm > 0) fee = distanceKm * rateKm;
       else {
         if (distanceKm <= 5) fee = 3000;
         else if (distanceKm <= 15) fee = 5000;
         else fee = distanceKm * 500;
       }
       fees[sId] = Math.round(fee);
    }
    return fees;
  }, [shopDeliveries, selectedTransportId, transportMethods, items]);

  // Recalculate total delivery fee
  useEffect(() => {
    if (Object.keys(shopDeliveries).length > 0) {
      const totalFee = Object.values(shopFees).reduce((a, b) => a + b, 0);
      setDeliveryFee(totalFee);
    } else {
      if (!selectedTransportId || transportMethods.length === 0) return;
      const method = transportMethods.find((m) => m.id === selectedTransportId);
      if (!method) return;
      
      const rateKm = Number(method.rate_per_km) || 0;
      const rateKg = Number(method.rate_per_kg) || 0;
      let fee = 0;
      if (rateKg > 0) fee = items.length * rateKg;
      else if (rateKm > 0) fee = 5 * rateKm;
      else fee = 3000;
      
      setDeliveryFee(Math.round(fee));
    }
  }, [shopFees, shopDeliveries, selectedTransportId, transportMethods, items.length]);

  const handleAddressComplete = async (fullAddress: string, coords?: { lat: number, lng: number }) => {
    if (!coords) return;
    
    setIsCalculatingDelivery(true);
    const newDeliveries: Record<string, any> = {};
    
    try {
      const shopsData: Record<string, { lat: number, lng: number }> = {};
      
      // Group items by shop
      items.forEach(item => {
        const sId = item.shop_id || 'unknown';
        if (!shopsData[sId]) {
          shopsData[sId] = { lat: -6.7924, lng: 39.2083 }; // Default to Dar es Salaam if unknown
        }
      });

      for (const sId in shopsData) {
        const shop = shopsData[sId];
        const res = await apiPost<any>('/maps/distance', {
          destLat: coords.lat,
          destLng: coords.lng,
          originLat: shop.lat,
          originLng: shop.lng
        });
        
        if (res && res.distanceKm !== undefined) {
          newDeliveries[sId] = {
            distanceKm: res.distanceKm,
            duration: res.duration || 'Fast',
          };
        }
      }
      setShopDeliveries(newDeliveries);
    } catch (error) {
      console.error('Failed to calculate delivery', error);
      Alert.alert('Delivery Error', 'Could not calculate delivery routes');
    } finally {
      setIsCalculatingDelivery(false);
    }
  };

  const subtotal = totalAmount;
  const insuranceFee = Math.round((subtotal + deliveryFee) * BUYER_PROTECTION_RATE);
  const total = subtotal + deliveryFee + insuranceFee;

  const selectedMethodName = transportMethods.find(
    (m) => m.id === selectedTransportId
  )?.name || 'Select method';

  const validate = (): string | null => {
    if (paymentMethod === 'm-pesa') return 'M-Pesa is currently under maintenance. Please select another method.';
    if (!fullName.trim()) return 'Please enter your full name';
    if (!phone.trim()) return 'Please enter your phone number';
    if (!isAuthenticated && (!guestEmail || !guestEmail.includes('@')))
      return 'Please enter a valid email address';
    if (!addressData.region || !addressData.district || !addressData.ward || !addressData.street)
      return 'Please fill in all required address fields (Region, District, Ward, Street)';
    if (Object.keys(shopDeliveries).length === 0 && selectedTransportId)
      return 'Please select your location using the autocomplete search to calculate delivery fees.';
    if (!selectedTransportId) return 'Please select a delivery method';
    const isMobile = MOBILE_MONEY_PROVIDERS.some((p) => p.id === paymentMethod);
    if (isMobile && !paymentPhone.trim()) return 'Please enter your mobile money phone number';
    const isCard = CARD_PROVIDERS.some((p) => p.id === paymentMethod);
    if (isCard && (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv))
      return 'Please enter complete card details';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      Alert.alert('Missing Information', validationError);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setError(null);

    try {
      // Build order items
      const orderItems = items.map((item) => {
        const sId = item.shop_id || 'unknown';
        return {
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          shop_id: item.shop_id || '',
          delivery_fee: shopFees[sId] || 0,
        };
      });

      const shippingAddress = {
        full_name: fullName,
        phone,
        email: guestEmail || session?.user?.email,
        country: addressData.country,
        region: addressData.region,
        district: addressData.district,
        ward: addressData.ward,
        village: addressData.village,
        street: addressData.street,
        address: [addressData.street, addressData.ward, addressData.district, addressData.region].filter(Boolean).join(', '),
        delivery_fee: deliveryFee,
      };

      const isMobile = MOBILE_MONEY_PROVIDERS.some((p) => p.id === paymentMethod);
      const isCard = CARD_PROVIDERS.some((p) => p.id === paymentMethod);

      const orderPayload = {
        items: orderItems,
        shippingAddress,
        totalAmount: total,
        insuranceFee,
        paymentMethod,
        paymentDetails: {
          phoneNumber: isMobile ? paymentPhone : undefined,
          cardNumber: isCard ? cardDetails.number : undefined,
          expiryDate: isCard ? cardDetails.expiry : undefined,
          cvv: isCard ? cardDetails.cvv : undefined,
        },
        transportMethodId: selectedTransportId || null,
        deliveryFee,
      };

      // 1. Create order
      const orderRes = await apiPost<any>('/orders', orderPayload, session?.access_token);
      const orderId = orderRes?.order?.id || orderRes?.id;

      if (!orderId) throw new Error('Order ID not returned from API');

      // 2. Handle payment
      if (paymentMethod === 'cash-on-delivery') {
        await clearCart();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace({ pathname: '/payment-success', params: { orderId, paymentMethod } });
        return;
      }

      setIsAwaitingPayment(true);

      // Use the mobile-specific payment endpoint
      const payRes = await apiPost<any>(
        '/payments/mobile/initiate',
        {
          orderId,
          provider: paymentMethod,
          phone: paymentPhone,
          amount: total,
          currency: 'TZS',
        },
        session?.access_token
      );

      if (payRes.success) {
        await clearCart();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace({
          pathname: '/payment-success',
          params: {
            orderId,
            paymentMethod,
            transactionId: payRes.transactionId || payRes.payment_intent_id || '',
            controlNumber: payRes.controlNumber || '',
          },
        });
      } else {
        throw new Error(payRes.message || 'Failed to initiate payment');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during checkout');
      Alert.alert('Checkout Error', err.message || 'Something went wrong');
      setIsAwaitingPayment(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Payment Processing Overlay */}
      <Modal visible={isAwaitingPayment} transparent animationType="fade">
        <View style={styles.overlayBg}>
          <View style={styles.overlayCard}>
            <View style={styles.overlayHeader}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.overlayTitle}>Processing Payment</Text>
            </View>
            <View style={styles.overlayBody}>
              <Text style={styles.overlayText}>
                Please wait while we process your payment...
              </Text>
              <View style={styles.overlaySecure}>
                <FontAwesome name="shield" size={14} color={Theme.success} />
                <Text style={styles.overlaySecureText}>Encrypted secure transaction</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <FontAwesome name="arrow-left" size={20} color={Theme.text} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Checkout</Text>
            <Text style={styles.headerSub}>Secure checkout</Text>
          </View>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeLabel}>Total</Text>
            <Text style={styles.totalBadgeValue}>TSh {total.toLocaleString()}</Text>
          </View>
        </View>

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
              
              {isCalculatingDelivery && (
                <View style={styles.calculatingBox}>
                  <ActivityIndicator size="small" color={Theme.primary} />
                  <Text style={styles.calculatingText}>Calculating delivery fee...</Text>
                </View>
              )}

              {Object.keys(shopDeliveries).length > 0 && (
                <View style={styles.logisticsContainer}>
                  <Text style={styles.logisticsTitle}>DELIVERY LOGISTICS BREAKDOWN</Text>
                  {Object.entries(shopDeliveries).map(([shopId, info]) => (
                    <View key={shopId} style={styles.logisticsCard}>
                      <View style={styles.logisticsHeader}>
                        <View>
                          <Text style={styles.logisticsShopLabel}>FROM SHOP</Text>
                          <Text style={styles.logisticsShopName}>Tola Verified Vendor</Text>
                        </View>
                        <View style={styles.logisticsMethodBadge}>
                          <Text style={styles.logisticsMethodText}>{selectedMethodName}</Text>
                        </View>
                      </View>
                      <View style={styles.logisticsStats}>
                        <View style={styles.logisticsStatBox}>
                          <Text style={styles.logisticsStatLabel}>DISTANCE</Text>
                          <Text style={styles.logisticsStatValue}>{info.distanceKm} KM</Text>
                        </View>
                        <View style={styles.logisticsStatBox}>
                          <Text style={styles.logisticsStatLabel}>STATUS</Text>
                          <Text style={styles.logisticsStatValue}>{info.duration}</Text>
                        </View>
                        <View style={[styles.logisticsStatBox, styles.logisticsFeeBox]}>
                          <Text style={[styles.logisticsStatLabel, { color: Theme.primary }]}>FEE</Text>
                          <Text style={[styles.logisticsStatValue, { color: Theme.primary }]}>TSh {shopFees[shopId]?.toLocaleString() || 0}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Step 2: Delivery Method */}
          <View style={styles.section}>
            <View style={styles.stepRow}>
              <View style={styles.stepBadge}><Text style={styles.stepNumber}>2</Text></View>
              <Text style={styles.stepTitle}>Delivery Method</Text>
            </View>
            <Pressable
              style={styles.transportSelector}
              onPress={() => setShowTransportPicker(!showTransportPicker)}
            >
              <View style={styles.transportLeft}>
                <View style={styles.transportIcon}>
                  <FontAwesome name="truck" size={20} color={Theme.primary} />
                </View>
                <View>
                  <Text style={styles.transportLabel}>Delivery Method</Text>
                  <Text style={styles.transportValue}>{selectedMethodName}</Text>
                </View>
              </View>
              <FontAwesome name="chevron-down" size={14} color={Theme.textMuted} />
            </Pressable>
            {showTransportPicker && (
              <View style={styles.transportDropdown}>
                {transportMethods.map((method) => (
                  <Pressable
                    key={method.id}
                    style={[styles.transportOption, selectedTransportId === method.id && styles.transportOptionActive]}
                    onPress={() => { setSelectedTransportId(method.id); setShowTransportPicker(false); }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.transportOptionName}>{method.name}</Text>
                      {method.description ? (
                        <Text style={styles.transportOptionDesc} numberOfLines={2}>{method.description}</Text>
                      ) : null}
                    </View>
                    <View style={styles.transportRate}>
                      <Text style={styles.transportRateText}>
                        {method.rate_per_km
                          ? `TSh ${method.rate_per_km.toLocaleString()}/KM`
                          : method.rate_per_kg
                          ? `TSh ${method.rate_per_kg.toLocaleString()}/KG`
                          : ''}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
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
            <View style={[styles.summaryCard, Theme.shadowMd]}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryHeaderText}>Order Summary</Text>
                <Text style={styles.summaryItemCount}>{items.length} item(s)</Text>
              </View>

              {/* Items preview */}
              <View style={styles.summaryItems}>
                {items.slice(0, 3).map((item) => (
                  <View key={item.id} style={styles.summaryItem}>
                    <OptimizedImage source={item.image_url} width={44} height={44} style={styles.summaryItemImg} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.summaryItemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.summaryItemQty}>Qty: {item.quantity}</Text>
                    </View>
                    <Text style={styles.summaryItemPrice}>
                      TSh {(item.price * item.quantity).toLocaleString()}
                    </Text>
                  </View>
                ))}
                {items.length > 3 && (
                  <Text style={styles.moreItems}>+{items.length - 3} more item(s)</Text>
                )}
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>TSh {subtotal.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery</Text>
                <Text style={styles.summaryValue}>TSh {deliveryFee.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Buyer Protection (1.5%)</Text>
                <Text style={styles.summaryValue}>TSh {insuranceFee.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryTotalRow}>
                <Text style={styles.summaryTotalLabel}>Total</Text>
                <Text style={styles.summaryTotalValue}>TSh {total.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <FontAwesome name="exclamation-circle" size={16} color={Theme.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom CTA */}
        <View style={[styles.bottomBar, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.bottomInfo}>
            <Text style={styles.bottomTotal}>TSh {total.toLocaleString()}</Text>
            <Text style={styles.bottomItems}>{items.length} item(s)</Text>
          </View>
          <Pressable
            style={[styles.submitBtn, (isLoading || paymentMethod === 'm-pesa') && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading || paymentMethod === 'm-pesa'}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>
                  {paymentMethod === 'm-pesa' ? 'Unavailable' : 'Complete Order'}
                </Text>
                <FontAwesome name="arrow-right" size={16} color="#fff" />
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: gap.md, paddingBottom: 14,
    backgroundColor: Theme.background, borderBottomWidth: 1, borderBottomColor: Theme.inputBorder,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Theme.text },
  headerSub: { fontSize: 11, color: Theme.textMuted, fontWeight: '600' },
  totalBadge: {
    backgroundColor: Theme.primary + '10', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Theme.radiusMd, alignItems: 'flex-end',
  },
  totalBadgeLabel: { fontSize: 9, fontWeight: '700', color: Theme.primary, textTransform: 'uppercase' },
  totalBadgeValue: { fontSize: 14, fontWeight: '800', color: Theme.primary },
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
  // Logistics
  calculatingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    backgroundColor: Theme.backgroundSecondary, borderRadius: Theme.radiusMd,
    marginTop: 8,
  },
  calculatingText: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  logisticsContainer: { marginTop: 8, gap: 12 },
  logisticsTitle: { fontSize: 10, fontWeight: '800', color: Theme.textMuted, letterSpacing: 1 },
  logisticsCard: {
    backgroundColor: Theme.backgroundSecondary, borderRadius: 16, padding: 16, gap: 16,
    borderWidth: 1, borderColor: Theme.inputBorder,
  },
  logisticsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logisticsShopLabel: { fontSize: 9, fontWeight: '800', color: Theme.primary, letterSpacing: 1, marginBottom: 2 },
  logisticsShopName: { fontSize: 13, fontWeight: '800', color: Theme.text },
  logisticsMethodBadge: {
    backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1, borderColor: Theme.inputBorder,
  },
  logisticsMethodText: { fontSize: 9, fontWeight: '800', color: Theme.textSecondary, textTransform: 'uppercase' },
  logisticsStats: { flexDirection: 'row', gap: 8 },
  logisticsStatBox: {
    flex: 1, backgroundColor: '#fff', padding: 10, borderRadius: 12,
    borderWidth: 1, borderColor: Theme.inputBorder, gap: 4,
  },
  logisticsFeeBox: { backgroundColor: Theme.primary + '08', borderColor: Theme.primary + '20' },
  logisticsStatLabel: { fontSize: 8, fontWeight: '800', color: Theme.textMuted, letterSpacing: 1 },
  logisticsStatValue: { fontSize: 12, fontWeight: '800', color: Theme.text },
  // Transport
  transportSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Theme.background, borderRadius: 24,
    padding: 20, borderWidth: 1.5, borderColor: Theme.inputBorder, ...Theme.shadowLg,
  },
  transportLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  transportIcon: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: Theme.primary + '10',
    alignItems: 'center', justifyContent: 'center',
  },
  transportLabel: { fontSize: 10, fontWeight: '700', color: Theme.textMuted, textTransform: 'uppercase' },
  transportValue: { fontSize: 16, fontWeight: '800', color: Theme.text },
  transportDropdown: {
    backgroundColor: Theme.background, borderRadius: Theme.radiusMd,
    marginTop: 8, ...Theme.shadowMd, overflow: 'hidden',
  },
  transportOption: {
    padding: 16, borderBottomWidth: 1, borderBottomColor: Theme.inputBorder,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  transportOptionActive: { backgroundColor: Theme.primary + '08' },
  transportOptionName: { fontSize: 15, fontWeight: '700', color: Theme.text },
  transportOptionDesc: { fontSize: 12, color: Theme.textMuted, marginTop: 2 },
  transportRate: {
    backgroundColor: Theme.primary + '10', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
  },
  transportRateText: { fontSize: 10, fontWeight: '800', color: Theme.primary, textTransform: 'uppercase' },
  // Summary
  summaryCard: {
    backgroundColor: Theme.background, borderRadius: 24,
    overflow: 'hidden', ...Theme.shadowLg,
  },
  summaryHeader: {
    backgroundColor: Theme.success, paddingHorizontal: 20, paddingVertical: 18,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  summaryHeaderText: { fontSize: 19, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  summaryItemCount: { fontSize: 12, fontWeight: '600', color: '#ffffffcc' },
  summaryItems: { padding: 16, gap: 12 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryItemImg: { borderRadius: 8, backgroundColor: Theme.backgroundSecondary },
  summaryItemName: { fontSize: 13, fontWeight: '700', color: Theme.text },
  summaryItemQty: { fontSize: 10, fontWeight: '600', color: Theme.textMuted },
  summaryItemPrice: { fontSize: 13, fontWeight: '800', color: Theme.text },
  moreItems: { fontSize: 12, color: Theme.textMuted, fontWeight: '600', textAlign: 'center' },
  summaryDivider: { height: 1, backgroundColor: Theme.inputBorder, marginHorizontal: 16 },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 8,
  },
  summaryLabel: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  summaryValue: { fontSize: 13, fontWeight: '700', color: Theme.text },
  summaryTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
  },
  summaryTotalLabel: { fontSize: 12, fontWeight: '800', color: Theme.primary, textTransform: 'uppercase' },
  summaryTotalValue: { fontSize: 20, fontWeight: '900', color: Theme.text },
  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14,
    backgroundColor: Theme.error + '10', borderRadius: Theme.radiusMd,
    borderWidth: 1, borderColor: Theme.error + '20',
  },
  errorText: { flex: 1, fontSize: 13, fontWeight: '600', color: Theme.error },
  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Theme.background, paddingHorizontal: gap.md, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: Theme.inputBorder,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    ...Theme.shadowLg,
  },
  bottomInfo: { flex: 1 },
  bottomTotal: { fontSize: 18, fontWeight: '800', color: Theme.text },
  bottomItems: { fontSize: 11, color: Theme.textMuted, fontWeight: '600' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Theme.primary, paddingHorizontal: 28, paddingVertical: 18,
    borderRadius: 14, ...Theme.shadowLg,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  // Overlay
  overlayBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  overlayCard: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', width: '100%', maxWidth: 360 },
  overlayHeader: {
    backgroundColor: Theme.primary, padding: 32, alignItems: 'center', gap: 16,
  },
  overlayTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  overlayBody: { padding: 24, gap: 16, alignItems: 'center' },
  overlayText: { fontSize: 14, color: Theme.textSecondary, textAlign: 'center', lineHeight: 22 },
  overlaySecure: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Theme.backgroundSecondary, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: Theme.radiusMd,
  },
  overlaySecureText: { fontSize: 11, fontWeight: '700', color: Theme.textSecondary, textTransform: 'uppercase' },
});
