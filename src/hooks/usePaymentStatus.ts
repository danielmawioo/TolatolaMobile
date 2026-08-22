import { useEffect, useRef, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { apiGet } from '@/src/services/api';
import { logger } from '@/src/lib/logger';

export const TRACKING_STEPS = [
  { id: 'ORDER_RECEIVED', label: 'Order Received', icon: 'check-circle' },
  { id: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed', icon: 'shield' },
  { id: 'PROCESSING', label: 'Processing', icon: 'cube' },
  { id: 'DISPATCHED', label: 'Dispatched', icon: 'map-marker' },
  { id: 'IN_TRANSIT', label: 'In Transit', icon: 'truck' },
  { id: 'DELIVERED', label: 'Delivered', icon: 'home' },
] as const;

export const STATUS_MAP: Record<string, number> = {
  pending: 0, pending_payment: 0, PAYMENT_CONFIRMED: 1, confirmed: 1, paid: 1,
  PROCESSING: 2, processing: 2, preparing: 2, DISPATCHED: 3, dispatched: 3,
  ready_for_pickup: 3, picked_up: 3, IN_TRANSIT: 4, in_transit: 4, shipped: 4,
  DELIVERED: 5, delivered: 5, completed: 5,
};

const BANK_METHODS = ['crdb-simbanking', 'crdb-internet-banking', 'crdb-wakala', 'crdb-branch-otc'];
const CARD_METHODS = ['visa', 'mastercard', 'unionpay'];
const MAX_POLL_ATTEMPTS = 120;

export type PaymentStatus = 'processing' | 'paid' | 'failed';

interface UsePaymentStatusParams {
  orderId: string;
  paymentMethod: string;
  controlNumber?: string;
  accessToken?: string;
}

/**
 * Owns order fetch + payment-status polling for app/payment-success.tsx: fetches the
 * order once, then polls /payments/status until the backend reports 'paid' or 'failed'
 * (or the attempt budget is exhausted), and auto-opens the hosted card payment page.
 */
export function usePaymentStatus({ orderId, paymentMethod, controlNumber, accessToken }: UsePaymentStatusParams) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('processing');
  const cardBrowserOpened = useRef(false);

  const isCod = paymentMethod === 'cash-on-delivery';
  const isBank = BANK_METHODS.includes(paymentMethod);
  const isCard = CARD_METHODS.includes(paymentMethod);

  // Auto-open ClickPesa hosted payment page for card payments
  useEffect(() => {
    const paymentUrl = controlNumber || order?.stripe_payment_intent_id;
    if (isCard && paymentStatus !== 'paid' && paymentUrl && paymentUrl.startsWith('http') && !cardBrowserOpened.current) {
      cardBrowserOpened.current = true;
      WebBrowser.openBrowserAsync(paymentUrl).catch((err) => {
        logger.error('[PAYMENT_SUCCESS] Failed to open card payment browser:', err);
      });
    }
  }, [isCard, paymentStatus, controlNumber, order?.stripe_payment_intent_id]);

  // Fetch order details
  useEffect(() => {
    if (!orderId) { setLoading(false); return; }
    apiGet<any>(`/orders/${orderId}`, accessToken)
      .then((res) => {
        const data = res?.data || res;
        setOrder(data);
        if (data?.payment_status === 'paid' || isCod) setPaymentStatus('paid');
      })
      .catch((err) => logger.warn('[usePaymentStatus] initial order fetch failed', err))
      .finally(() => setLoading(false));
  }, [orderId]);

  // Poll payment status — backend actively queries the payment provider for confirmation
  useEffect(() => {
    if (paymentStatus !== 'processing' || isCod || !orderId) return;
    let attempts = 0;
    let cancelled = false;

    async function checkStatus() {
      if (cancelled) return;
      try {
        const res = await apiGet<any>(`/payments/status/${orderId}`, accessToken);
        const payload = res?.data || res;
        const pStatus = payload?.payment_status;
        const oStatus = payload?.status;
        if (pStatus === 'paid' || ['confirmed', 'processing', 'preparing'].includes(String(oStatus))) {
          setPaymentStatus('paid');
          setOrder((prev: any) => prev ? { ...prev, payment_status: 'paid', status: oStatus || prev.status } : prev);
          return; // Stop polling
        } else if (pStatus === 'failed') {
          setPaymentStatus('failed');
          return; // Stop polling
        }
      } catch (err) {
        // Transient poll failure — retried on the next tick, so don't interrupt the user.
        logger.warn('[PAYMENT SUCCESS] Status poll failed', err);
      }

      attempts++;
      if (attempts >= MAX_POLL_ATTEMPTS || cancelled) return;

      // Fast polling (2s) for first 30 seconds, then slower (5s) to reduce load
      const delay = attempts < 15 ? 2000 : 5000;
      setTimeout(checkStatus, delay);
    }

    // Start immediately — no initial delay
    checkStatus();

    return () => { cancelled = true; };
  }, [paymentStatus, orderId, isCod]);

  const currentStep = STATUS_MAP[order?.status || 'pending'] ?? 0;

  return { order, loading, paymentStatus, isCod, isBank, isCard, currentStep };
}
