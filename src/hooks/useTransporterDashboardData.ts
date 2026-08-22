import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { apiGet, apiPut } from '@/src/services/api';
import { logger } from '@/src/lib/logger';
import type { Session } from '@/src/contexts/AuthContext';

export type TransporterProfileFormData = {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  business_name: string;
  vehicle_type: string;
  license_plate: string;
  profile_image_url: string;
};

const EMPTY_PROFILE_DATA: TransporterProfileFormData = {
  full_name: '',
  email: '',
  phone: '',
  address: '',
  business_name: '',
  vehicle_type: '',
  license_plate: '',
  profile_image_url: '',
};

export function useTransporterDashboardData(session: Session | null) {
  const accessToken = session?.access_token;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [transporter, setTransporter] = useState<any>(null);
  const [transporterId, setTransporterId] = useState<string>('');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [financeSummary, setFinanceSummary] = useState<any>(null);
  const [profileData, setProfileData] = useState<TransporterProfileFormData>(EMPTY_PROFILE_DATA);

  // Location update (manual, user-triggered)
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'updated' | 'error' | 'idle'>('idle');

  const fetchData = useCallback(async (silent = false) => {
    if (!accessToken) return;
    if (!silent) setLoading(true);
    try {
      const [profileRes, transporterRes] = await Promise.all([
        apiGet<any>('/profile', accessToken).catch(() => null),
        apiGet<any>('/transporters/me', accessToken).catch(() => null),
      ]);

      const profile = profileRes?.profile || profileRes?.user || null;
      const tData = transporterRes?.transporter || null;
      setTransporter(tData);
      const tId = tData?.id || profile?.transporter_id || session?.user?.id || '';
      setTransporterId(tId);

      setProfileData({
        full_name: profile?.full_name || '',
        email: profile?.email || session?.user?.email || '',
        phone: profile?.phone || '',
        address: profile?.address || '',
        business_name: tData?.business_name || '',
        vehicle_type: tData?.vehicle_type || '',
        license_plate: tData?.license_plate || tData?.vehicle_registration || '',
        profile_image_url: profile?.profile_image_url || '',
      });

      // Fetch assignments, payments, and finance summary for stats
      if (tId) {
        const [assignRes, payRes, financeRes] = await Promise.all([
          apiGet<any>('/transporter/jobs', accessToken).catch(() => []),
          apiGet<any>('/transporters/payments', accessToken).catch(() => ({ payments: [] })),
          apiGet<any>('/transporter/finance-summary', accessToken).catch(() => null),
        ]);
        setAssignments(Array.isArray(assignRes) ? assignRes : assignRes?.assignments || assignRes?.data || []);
        setPayments(payRes?.payments || []);
        // Use finance summary for accurate balance if available
        if (financeRes) {
          setFinanceSummary(financeRes);
        }
      }

      // Notification count
      try {
        const notifRes = await apiGet<any>('/notifications/unread-count', accessToken);
        setUnreadNotifs(notifRes?.unread_count || 0);
      } catch (err) {
        // Non-critical — the badge just stays at its previous value. Kept
        // non-throwing/non-alerting on purpose, just logged for visibility.
        logger.error('[TRANSPORTER DASHBOARD] Failed to fetch unread notification count:', err);
      }
    } catch (error) {
      logger.error('Transporter Dashboard Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, session?.user?.id, session?.user?.email]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useFocusEffect(
    useCallback(() => { fetchData(true); }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  }, [fetchData]);

  const handleUpdateLocation = useCallback(async () => {
    setIsUpdatingLocation(true);
    setLocationStatus('idle');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is needed to update your position.');
        setIsUpdatingLocation(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await apiPut('/transporters/me/location', {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        bearing: loc.coords.heading || null,
        speed: loc.coords.speed || null,
      }, accessToken);
      setLocationStatus('updated');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      logger.error('Location update error:', e);
      setLocationStatus('error');
    } finally {
      setIsUpdatingLocation(false);
    }
  }, [accessToken]);

  // Real-time active GPS streaming loop for Uber-like driver tracking
  useEffect(() => {
    if (!accessToken || assignments.length === 0) return;

    // Check if there are active assignments in transit or picked up
    const hasActiveTrip = assignments.some(a => ['picked_up', 'in_transit'].includes(a.status));
    if (!hasActiveTrip) return;

    let locationInterval: any;

    const startLocationStreaming = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        // Perform immediate sync
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await apiPut('/transporters/me/location', {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          bearing: loc.coords.heading || null,
          speed: loc.coords.speed || null,
        }, accessToken);

        // Stream every 10 seconds
        locationInterval = setInterval(async () => {
          try {
            const currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            await apiPut('/transporters/me/location', {
              latitude: currentLoc.coords.latitude,
              longitude: currentLoc.coords.longitude,
              bearing: currentLoc.coords.heading || null,
              speed: currentLoc.coords.speed || null,
            }, accessToken);
          } catch (err) {
            logger.warn('Real-time location stream error:', err);
          }
        }, 10000);
      } catch (err) {
        logger.warn('Location streaming setup failed:', err);
      }
    };

    startLocationStreaming();

    return () => {
      if (locationInterval) clearInterval(locationInterval);
    };
  }, [assignments, accessToken]);

  // Stats
  const activeAssignments = useMemo(() => assignments.filter(a => {
    const isAccepted = ['accepted', 'picked_up', 'in_transit'].includes(a.status) || (a.status === 'assigned' && a.accepted_at);
    const isReady = a.status === 'ready_for_pickup';
    return isAccepted || isReady;
  }), [assignments]);

  const completedAssignments = useMemo(
    () => assignments.filter(a => a.status === 'delivered' && a.is_customer_verified),
    [assignments]
  );

  const availableBalance = useMemo(
    () => financeSummary?.withdrawable_balance ?? payments.filter(p => p.status === 'available').reduce((s, p) => s + Number(p.amount), 0),
    [financeSummary, payments]
  );

  return {
    loading,
    setLoading,
    refreshing,
    transporter,
    setTransporter,
    transporterId,
    assignments,
    payments,
    unreadNotifs,
    financeSummary,
    profileData,
    setProfileData,
    isUpdatingLocation,
    locationStatus,
    handleUpdateLocation,
    activeAssignments,
    completedAssignments,
    availableBalance,
    fetchData,
    onRefresh,
  };
}
