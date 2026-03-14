import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { apiGet } from '@/src/services/api';
import type { Order } from '@/src/types';

export function useOrders() {
  const { session, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!isAuthenticated || !session?.access_token) {
      setLoading(false);
      setOrders([]);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await apiGet<{ orders?: Order[] } | Order[]>('/orders', session.access_token);
      const list = (data as { orders?: Order[] })?.orders ?? (Array.isArray(data) ? data : []);
      setOrders(list);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load orders'));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, session?.access_token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const refetch = useCallback(() => {
    return fetchOrders();
  }, [fetchOrders]);

  return { orders, loading, error, refetch };
}
