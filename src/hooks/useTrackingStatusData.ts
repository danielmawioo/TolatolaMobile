import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { apiGet, apiPost } from '@/src/services/api';
import { logger } from '@/src/lib/logger';

export interface TrackingTimelineEntry {
  status: string;
  completed_at?: string | null;
}

export interface TrackingTransporter {
  name: string;
  phone_masked?: string | null;
}

export interface FundStatusTimelineStep {
  key: string;
  status: string;
  label: string;
  description: string;
}

export interface FundStatus {
  status: string;
  timeline: FundStatusTimelineStep[];
}

export interface TrackingOrder {
  id: string;
  order_number?: string;
  tracking_code?: string;
  status: string;
  delivery_confirmation_requested?: boolean;
  estimated_arrival?: string | null;
}

/** Shape of the normalized `/tracking/status` response, as consumed by the guest tracking screen. */
export interface TrackingStatusData {
  order: TrackingOrder;
  timeline: TrackingTimelineEntry[];
  transporter?: TrackingTransporter | null;
  fund_status?: FundStatus | null;
}

export const TIMELINE_STEPS = [
  { id: 'ORDER_RECEIVED', label: 'Order Received' },
  { id: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed' },
  { id: 'PROCESSING', label: 'Processing' },
  { id: 'DISPATCHED', label: 'Dispatched' },
  { id: 'IN_TRANSIT', label: 'In Transit' },
  { id: 'DELIVERED', label: 'Delivered' },
];

export const STATUS_INDEX_MAP: Record<string, number> = {
  ORDER_RECEIVED: 0,
  pending: 0,
  pending_payment: 0,
  PAYMENT_CONFIRMED: 1,
  confirmed: 1,
  paid: 1,
  PROCESSING: 2,
  processing: 2,
  preparing: 2,
  DISPATCHED: 3,
  dispatched: 3,
  ready_for_pickup: 3,
  picked_up: 3,
  IN_TRANSIT: 4,
  in_transit: 4,
  shipped: 4,
  DELIVERED: 5,
  delivered: 5,
  completed: 5,
};

/**
 * Owns fetching/polling of the guest order-tracking status payload and the
 * "confirm delivery" action, for app/(guest)/track/status.tsx.
 */
export function useTrackingStatusData(token: string | undefined) {
  const [data, setData] = useState<TrackingStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiGet<any>(`/tracking/status?token=${encodeURIComponent(token)}`);
      const normalized = res?.data || res;
      const order = normalized?.order || normalized;
      if (!order) {
        throw new Error('Order status data not found.');
      }
      setData({ ...normalized, order });
      setError(null);
    } catch (e: any) {
      logger.error('Failed to fetch tracking status:', e);
      setError(e?.message || 'Failed to load order status.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError('Missing tracking session. Please start from the track order page.');
      setLoading(false);
      return;
    }
    fetchStatus();
  }, [token, fetchStatus]);

  const handleConfirmDelivery = useCallback(async () => {
    if (!data?.order?.id) return;
    setConfirming(true);
    try {
      await apiPost(`/orders/${data.order.id}/confirm-delivery`, {});
      Alert.alert(
        'Delivery Confirmed! 🎉',
        'Thank you for confirming your delivery. Escrow funds have been successfully released to the vendor and transporter.'
      );
      await fetchStatus();
    } catch (e: any) {
      logger.error('Failed to confirm delivery:', e);
      Alert.alert('Error', e?.message || 'Failed to confirm delivery. Please try again.');
    } finally {
      setConfirming(false);
    }
  }, [data?.order?.id, fetchStatus]);

  const currentIndex = data
    ? STATUS_INDEX_MAP[String(data.order.status)] ?? TIMELINE_STEPS.findIndex(s => s.id === data.order.status)
    : -1;
  const progressPercent = currentIndex >= 0 ? ((currentIndex + 1) / TIMELINE_STEPS.length) * 100 : 0;

  return {
    data,
    loading,
    error,
    confirming,
    fetchStatus,
    handleConfirmDelivery,
    currentIndex,
    progressPercent,
  };
}
