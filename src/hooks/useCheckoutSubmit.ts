import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { createOrder, initiateCheckoutPayment } from '@/src/services/checkout';
import { MOBILE_MONEY_PROVIDERS, CARD_PROVIDERS, type AddressData } from '@/src/constants/checkout';
import type { CartItem } from '@/src/contexts/CartContext';
import type { Session } from '@/src/contexts/AuthContext';

interface UseCheckoutSubmitParams {
  items: CartItem[];
  fullName: string;
  phone: string;
  guestEmail: string;
  isAuthenticated: boolean;
  addressData: AddressData;
  selectedTransportId: string;
  shopDeliveries: Record<string, { distanceKm: number; duration: string }>;
  shopFees: Record<string, number>;
  paymentMethod: string;
  paymentPhone: string;
  cardDetails: { number: string; expiry: string; cvv: string };
  deliveryFee: number;
  insuranceFee: number;
  total: number;
  latitude: number | null;
  longitude: number | null;
  session: Session | null;
  expoPushToken: string | null | undefined;
  clearCart: () => Promise<void>;
}

function validate(params: UseCheckoutSubmitParams): string | null {
  const { paymentMethod, fullName, phone, isAuthenticated, guestEmail, addressData, shopDeliveries, selectedTransportId, paymentPhone, cardDetails } = params;
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
}

export function useCheckoutSubmit(params: UseCheckoutSubmitParams) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAwaitingPayment, setIsAwaitingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const handleSubmit = async () => {
    const validationError = validate(params);
    if (validationError) {
      setError(validationError);
      setShowErrorModal(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const {
      items, fullName, phone, guestEmail, addressData, shopFees, deliveryFee,
      selectedTransportId, paymentMethod, paymentPhone, cardDetails, insuranceFee,
      total, latitude, longitude, session, expoPushToken, clearCart,
    } = params;

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
          selected_color: item.selected_color || null,
          selected_size: item.selected_size || null,
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
        latitude,
        longitude,
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
        pushToken: expoPushToken || null,
      };

      const orderRes = await createOrder(orderPayload, session?.access_token);
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
      const payBody: {
        orderId: string;
        provider: string;
        amount: number;
        currency: string;
        phone?: string;
        paymentDetails?: { cardNumber: string; expiryDate: string; cvv: string };
      } = {
        orderId: String(orderId),
        provider: paymentMethod,
        amount: total,
        currency: 'TZS',
      };
      if (isCard) {
        payBody.paymentDetails = {
          cardNumber: cardDetails.number || '',
          expiryDate: cardDetails.expiry || '',
          cvv: cardDetails.cvv || '',
        };
      } else {
        payBody.phone = paymentPhone;
      }

      const payRes = await initiateCheckoutPayment(payBody, session?.access_token);

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
      const msg = err.message || 'An error occurred during checkout';
      setError(msg);
      setShowErrorModal(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsAwaitingPayment(false);
    } finally {
      setIsLoading(false);
    }
  };

  return { handleSubmit, isLoading, isAwaitingPayment, error, setError, showErrorModal, setShowErrorModal };
}
