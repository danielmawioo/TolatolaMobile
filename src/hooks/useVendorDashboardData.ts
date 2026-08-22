import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { apiGet } from '@/src/services/api';
import { logger } from '@/src/lib/logger';

export function useVendorDashboardData(accessToken: string | null | undefined) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [vendor, setVendor] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!accessToken) return;
      if (!silent) setLoading(true);
      try {
        // Fetch vendor profile
        const vendorRes = await apiGet<{ data: any[] }>('/vendors', accessToken);
        const vendorData = vendorRes?.data?.[0];
        setVendor(vendorData || null);

        // Fetch shop details
        const shopRes = await apiGet<any>('/vendor/shop', accessToken);
        const actualShop = shopRes?.shops?.[0] || shopRes?.data?.[0] || null;
        setShop(actualShop);

        if (actualShop?.id) {
          // Fetch products and orders in parallel
          const [productsData, ordersData] = await Promise.all([
            apiGet<any>(`/shops/${actualShop.id}/products`, accessToken).catch(() => ({ data: [] })),
            apiGet<any>(`/shops/${actualShop.id}/orders`, accessToken).catch(() => ({ orders: [] })),
          ]);
          setProducts(Array.isArray(productsData?.data) ? productsData.data : (Array.isArray(productsData) ? productsData : []));
          setOrders(ordersData?.orders || (Array.isArray(ordersData) ? ordersData : []));
        }

        // Fetch notification count
        try {
          const notifRes = await apiGet<any>('/notifications/unread-count', accessToken);
          setUnreadNotifs(notifRes?.unread_count || 0);
        } catch (err) {
          // Non-critical: dashboard should still render without the notification badge.
          // `err` may be an AppError (see src/lib/errors.ts) exposing `.kind`/`.status`
          // for future handling, but we simply log and move on for now.
          logger.error('[VENDOR DASHBOARD] Failed to fetch unread notification count', err);
        }
      } catch (error) {
        logger.error('[VENDOR DASHBOARD] Fetch Error:', error);
      } finally {
        setLoading(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh data when screen gains focus (e.g. after editing product/shop)
  useFocusEffect(
    useCallback(() => {
      fetchData(true);
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  }, [fetchData]);

  return {
    loading,
    refreshing,
    vendor,
    setVendor,
    shop,
    products,
    setProducts,
    orders,
    unreadNotifs,
    fetchData,
    onRefresh,
  };
}
