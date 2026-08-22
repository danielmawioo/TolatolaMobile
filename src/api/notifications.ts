import { apiGet, apiPost } from '@/src/services/api';

/** Mirrors users.user_type for optional API filtering. */
export type UserTypeForApi = 'customer' | 'vendor' | 'transporter' | 'admin';

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
};

export async function fetchNotifications(
  token: string,
  opts?: { unreadOnly?: boolean; limit?: number; userType?: UserTypeForApi }
): Promise<Notification[]> {
  const params = new URLSearchParams();
  if (opts?.unreadOnly) params.set('unread_only', 'true');
  if (opts?.limit) params.set('limit', String(opts.limit));
  /** Backend may filter by role (web parity); ignored if unsupported. */
  if (opts?.userType) params.set('user_type', opts.userType);
  const qs = params.toString();
  const path = `/notifications${qs ? `?${qs}` : ''}`;

  const res = await apiGet<{ data?: Notification[] } | Notification[]>(path, token);
  if (Array.isArray(res)) return res;
  return res.data ?? [];
}

export async function fetchUnreadCount(
  token: string,
  opts?: { userType?: UserTypeForApi }
): Promise<number> {
  const qs = opts?.userType ? `?user_type=${encodeURIComponent(opts.userType)}` : '';
  const res = await apiGet<{ unread_count?: number }>(`/notifications/unread-count${qs}`, token);
  return res.unread_count ?? 0;
}

export async function markNotificationRead(token: string, id: string): Promise<void> {
  await apiPost(`/notifications/${id}/read`, {}, token);
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  await apiPost('/notifications/read-all', {}, token);
}

