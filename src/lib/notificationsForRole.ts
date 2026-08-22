import type { ComponentProps } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { Notification } from '@/src/api/notifications';
import type { UserType } from '@/src/lib/roleRedirect';

type FaName = ComponentProps<typeof FontAwesome>['name'];

/**
 * Decide which app role a notification is intended for when the API does not tag `data`.
 * Conservative: unknown types default to customer (buyer) so vendors/transporters are not spammed.
 */
export function inferNotificationAudience(type: string): UserType | 'all' {
  const t = (type || '').toLowerCase();
  if (!t) return 'customer';

  if (
    /\badmin\b|moderation|kyc_queue|platform_alert|staff_|flagged_|dispute_staff|payout_review/.test(t)
  ) {
    return 'admin';
  }
  if (
    /transporter|transport_|assignment|delivery_request|rider_|pickup_|route_|driver_task|logistics_/.test(t)
  ) {
    return 'transporter';
  }
  if (
    /vendor_|seller_|shop_|merchant_|product_approved|product_rejected|listing_|incoming_order|new_sale|stock_alert|payout_ready|subscription_/.test(
      t
    )
  ) {
    return 'vendor';
  }
  if (/promo|campaign|marketing|broadcast|announcement|everyone/.test(t)) {
    return 'all';
  }
  return 'customer';
}

function normalizeRoleString(s: string): UserType | 'all' | null {
  const x = s.trim().toLowerCase();
  if (x === 'all' || x === 'everyone' || x === 'broadcast') return 'all';
  if (['customer', 'buyer', 'shopper'].includes(x)) return 'customer';
  if (['vendor', 'seller', 'merchant'].includes(x)) return 'vendor';
  if (['transporter', 'driver', 'courier', 'rider', 'logistics'].includes(x)) return 'transporter';
  if (['admin', 'staff', 'moderator'].includes(x)) return 'admin';
  return null;
}

function audienceFromPayload(data: Record<string, unknown> | null): UserType | 'all' | null {
  if (!data) return null;
  const singleKeys = ['for_role', 'user_type', 'audience', 'scope', 'target_role', 'recipient_role'];
  for (const k of singleKeys) {
    const v = data[k];
    if (typeof v === 'string') {
      const n = normalizeRoleString(v);
      if (n) return n;
    }
  }
  const arr = data.for_roles ?? data.roles ?? data.audiences;
  if (Array.isArray(arr) && arr.length > 0) {
    const normalized: (UserType | 'all')[] = [];
    for (const x of arr) {
      const n = normalizeRoleString(String(x));
      if (n) normalized.push(n);
    }
    if (normalized.includes('all')) return 'all';
    if (normalized.length === 1) return normalized[0];
    return null;
  }
  return null;
}

const ROLE_ALIASES: Record<UserType, string[]> = {
  customer: ['customer', 'buyer', 'shopper'],
  vendor: ['vendor', 'seller', 'merchant'],
  transporter: ['transporter', 'driver', 'courier', 'rider', 'logistics'],
  admin: ['admin', 'staff', 'moderator'],
};

function roleInAudienceList(role: UserType, data: Record<string, unknown>): boolean {
  const arr = data.for_roles ?? data.roles ?? data.audiences;
  if (!Array.isArray(arr) || arr.length === 0) return false;
  const set = new Set(arr.map((x) => String(x).trim().toLowerCase()));
  if (set.has('all') || set.has('everyone')) return true;
  return ROLE_ALIASES[role].some((a) => set.has(a));
}

/**
 * Whether this notification should appear for the signed-in user's role.
 */
export function matchesNotificationRole(n: Notification, role: UserType): boolean {
  const data =
    n.data && typeof n.data === 'object' && !Array.isArray(n.data)
      ? (n.data as Record<string, unknown>)
      : null;

  const explicit = audienceFromPayload(data);
  if (explicit === 'all') return true;
  if (explicit !== null) {
    return explicit === role;
  }

  if (data && roleInAudienceList(role, data)) {
    return true;
  }

  const inferred = inferNotificationAudience(n.type);
  if (inferred === 'all') return true;
  return inferred === role;
}

export function filterNotificationsForRole(notifications: Notification[], role: UserType): Notification[] {
  return notifications.filter((n) => matchesNotificationRole(n, role));
}

export function notificationIconForType(type: string): FaName {
  const t = (type || '').toLowerCase();
  if (/order|purchase|checkout/.test(t)) return 'shopping-bag';
  if (/payment|payout|wallet|invoice/.test(t)) return 'credit-card';
  if (/deliver|ship|transit|pickup|rider|assignment/.test(t)) return 'truck';
  if (/vendor|shop|seller|product|listing|stock/.test(t)) return 'briefcase';
  if (/kyc|verif|document/.test(t)) return 'id-card';
  if (/promo|campaign|offer|discount/.test(t)) return 'tag';
  if (/admin|moderat|flag|report|dispute/.test(t)) return 'shield';
  if (/message|chat|support/.test(t)) return 'comment';
  if (/system|account|security|login/.test(t)) return 'cog';
  return 'bell';
}

/**
 * Map notification payload to an in-app route (expo-router path).
 */
export function getNotificationDeepLink(n: Notification): string | null {
  const data =
    n.data && typeof n.data === 'object' && !Array.isArray(n.data)
      ? (n.data as Record<string, unknown>)
      : null;
  if (!data) return null;

  const screen = data.screen ?? data.navigate_to;
  if (typeof screen === 'string' && screen.trim()) {
    const s = screen.trim();
    if (s.startsWith('/(tabs)') || s.startsWith('/(guest)') || s.startsWith('/(vendor)') || s.startsWith('/(transporter)') || s.startsWith('/(admin)') || s.startsWith('/order/')) {
      return s;
    }
  }

  const url = data.url ?? data.deep_link ?? data.link;
  if (typeof url === 'string' && url.trim()) {
    const u = url.trim();
    if (u.startsWith('http')) return null;
    if (u.startsWith('/order/')) return u;
    if (u.startsWith('/orders')) return '/(tabs)/orders';
    if (u.startsWith('/cart')) return '/(tabs)/cart';
    if (u.startsWith('/vendor')) return '/(vendor)/dashboard';
    if (u.startsWith('/admin')) return '/(admin)';
    if (u.startsWith('/')) return u;
  }

  const orderId = data.order_id ?? data.orderId;
  if (orderId != null && String(orderId).length > 0) {
    return `/order/${String(orderId)}`;
  }

  const productId = data.product_id ?? data.productId;
  if (productId != null && String(productId).length > 0) {
    return `/(guest)/product/${String(productId)}`;
  }

  const shopId = data.shop_id ?? data.shopId;
  if (shopId != null && String(shopId).length > 0) {
    return `/(guest)/shop-detail/${String(shopId)}`;
  }

  return null;
}

export const NOTIFICATION_ROLE_SUBTITLE: Record<UserType, string> = {
  customer: 'Orders, deliveries, and account updates for your shopping.',
  vendor: 'Orders, listings, payouts, and shop activity.',
  transporter: 'Assignments, routes, and logistics updates.',
  admin: 'Operations, moderation, and platform alerts.',
};
