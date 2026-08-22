import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import {
  Notification,
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type UserTypeForApi,
} from '@/src/api/notifications';
import { queryKeys } from '@/src/lib/queryKeys';
import { getUserRoleFromSession } from '@/src/lib/roleRedirect';
import { filterNotificationsForRole } from '@/src/lib/notificationsForRole';

const NOTIFICATIONS_PAGE_SIZE = 64;

export type NotificationsContextValue = {
  notifications: Notification[];
  /** Count for tab badge / headers — role-aware when possible. */
  unreadCount: number;
  loading: boolean;
  isRefetching: boolean;
  userRole: UserTypeForApi;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const queryClient = useQueryClient();

  const userRole = useMemo<UserTypeForApi>(() => {
    if (!session) return 'customer';
    return getUserRoleFromSession(session);
  }, [session]);

  const listKey = queryKeys.api.notifications.list(token ?? '', NOTIFICATIONS_PAGE_SIZE, userRole);
  const unreadKey = queryKeys.api.notifications.unread(token ?? '', userRole);

  const notificationsQuery = useQuery({
    queryKey: listKey,
    queryFn: () =>
      fetchNotifications(token!, {
        limit: NOTIFICATIONS_PAGE_SIZE,
        userType: userRole,
      }),
    enabled: Boolean(token),
  });

  const unreadQuery = useQuery({
    queryKey: unreadKey,
    queryFn: () => fetchUnreadCount(token!, { userType: userRole }),
    enabled: Boolean(token),
  });

  const rawList = notificationsQuery.data ?? [];
  const notifications = useMemo(
    () => filterNotificationsForRole(rawList, userRole),
    [rawList, userRole]
  );

  const clientFiltered = rawList.length > notifications.length;
  const unreadInLoaded = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const unreadCount = useMemo(() => {
    if (clientFiltered) {
      return unreadInLoaded;
    }
    return unreadQuery.data ?? unreadInLoaded;
  }, [clientFiltered, unreadInLoaded, unreadQuery.data]);

  const refresh = useCallback(async () => {
    if (!token) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.api.notifications.scope(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.api.notifications.unreadScope(token) }),
    ]);
  }, [queryClient, token]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!token) return;
      try {
        await markNotificationRead(token, id);
        queryClient.setQueryData<Notification[]>(listKey, (prev) =>
          prev?.map((n) => (n.id === id ? { ...n, is_read: true } : n)) ?? []
        );
        queryClient.setQueryData<number>(unreadKey, (c) => Math.max(0, (c ?? 0) - 1));
      } catch (e) {
        console.error('Failed to mark notification as read:', e);
        await refresh();
      }
    },
    [queryClient, refresh, token, listKey, unreadKey]
  );

  const markAllRead = useCallback(async () => {
    if (!token) return;
    try {
      await markAllNotificationsRead(token);
      queryClient.setQueryData<Notification[]>(listKey, (prev) =>
        prev?.map((n) => ({ ...n, is_read: true })) ?? []
      );
      queryClient.setQueryData<number>(unreadKey, 0);
    } catch (e) {
      console.error('Failed to mark all notifications as read:', e);
      await refresh();
    }
  }, [queryClient, refresh, token, listKey, unreadKey]);

  const isRefetching = Boolean(
    token &&
      ((notificationsQuery.isFetching && !notificationsQuery.isPending) ||
        (unreadQuery.isFetching && !unreadQuery.isPending))
  );

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      loading: Boolean(token) && (notificationsQuery.isPending || unreadQuery.isPending),
      isRefetching,
      userRole,
      refresh,
      markAsRead,
      markAllRead,
    }),
    [
      notifications,
      unreadCount,
      notificationsQuery.isPending,
      notificationsQuery.isFetching,
      unreadQuery.isPending,
      unreadQuery.isFetching,
      token,
      isRefetching,
      userRole,
      refresh,
      markAsRead,
      markAllRead,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return ctx;
}
