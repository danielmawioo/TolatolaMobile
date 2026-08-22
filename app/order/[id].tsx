import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { TrackingMap } from '@/components/TrackingMap';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { gap, scaleByWidth } from '@/constants/layout';
import { useAuth } from '@/src/contexts/AuthContext';
import { apiGet } from '@/src/services/api';
import { queryKeys } from '@/src/lib/queryKeys';
import { fetchOrderTrackingSnapshot } from '@/src/api/orderTracking';
import type { Order } from '@/src/types';
import { useLanguage } from '@/src/contexts/LanguageContext';

function parseId(raw: string | string[] | undefined): string | undefined {
  if (raw == null) return undefined;
  return typeof raw === 'string' ? raw : raw[0];
}

function unwrapOrder(raw: unknown): Order | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const inner = o.data ?? o.order;
  const doc = (inner && typeof inner === 'object' ? inner : o) as Record<string, unknown>;
  const id = doc.id != null ? String(doc.id) : '';
  if (!id) return null;
  return { ...doc, id } as Order;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Placed',
  pending_payment: 'Pending payment',
  paid: 'Paid',
  vendor_preparing: 'Preparing',
  ready_for_pickup: 'Ready for pickup',
  picked_up: 'Picked up',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function statusLabel(s?: string) {
  if (!s) return '—';
  const k = s.toLowerCase().replace(/\s+/g, '_');
  return STATUS_LABELS[k] ?? s;
}

function isTrackingActive(status?: string): boolean {
  const s = (status ?? '').toLowerCase().replace(/\s+/g, '_');
  return s === 'picked_up' || s === 'out_for_delivery' || s === 'in_transit' || s === 'dispatched';
}

function orderDropoffCoords(order: Order): { lat: number; lng: number } | null {
  const o = order as Record<string, unknown>;
  const ship = o.shipping_address;
  if (ship && typeof ship === 'object') {
    const s = ship as Record<string, unknown>;
    const lat = Number(s.latitude ?? s.lat);
    const lng = Number(s.longitude ?? s.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const lat = Number(o.delivery_latitude ?? o.dropoff_lat);
  const lng = Number(o.delivery_longitude ?? o.dropoff_lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
}

export default function OrderDetailScreen() {
  const { pick } = useLanguage();
  const insets = useSafeAreaInsets();
  const { id: idParam } = useLocalSearchParams<{ id?: string | string[] }>();
  const orderId = parseId(idParam);
  const { session, isAuthenticated } = useAuth();
  const token = session?.access_token ?? '';

  const orderQuery = useQuery({
    queryKey: queryKeys.api.order(orderId ?? '', token),
    queryFn: async () => {
      const raw = await apiGet<unknown>(`/orders/${orderId}`, token);
      const parsed = unwrapOrder(raw);
      if (!parsed) throw new Error(pick('Order not found', 'Oda haijapatikana'));
      return parsed;
    },
    enabled: Boolean(orderId && isAuthenticated && token),
  });

  const order = orderQuery.data ?? null;
  const trackingQuery = useQuery({
    queryKey: ['api', 'order-tracking', orderId ?? '', token],
    queryFn: () => fetchOrderTrackingSnapshot(token, orderId!),
    enabled: Boolean(orderId && token && order && isTrackingActive(order.status)),
    refetchInterval: 15_000,
  });

  const error = useMemo(() => {
    if (!orderId) return pick('Missing order', 'Oda haijajazwa');
    if (!isAuthenticated || !token) return pick('Please sign in to view this order.', 'Tafadhali ingia kuona oda hii.');
    if (orderQuery.isPending) return null;
    if (orderQuery.isError) {
      const e = orderQuery.error;
      const msg = e instanceof Error ? e.message : pick('Could not load order', 'Haikuwezekana kupakia oda');
      const status = (e as { status?: number })?.status;
      if (status === 401 || /invalid token|unauthori/i.test(msg)) {
        return pick('Session expired. Please log in again.', 'Muda wa akaunti umeisha. Tafadhali ingia tena.');
      }
      return msg;
    }
    if (!order) return pick('Could not load order', 'Haikuwezekana kupakia oda');
    return null;
  }, [orderId, isAuthenticated, token, orderQuery.isPending, orderQuery.isError, orderQuery.error, order, pick]);

  const loading = Boolean(orderId && isAuthenticated && token && orderQuery.isPending);

  const safePad = {
    paddingTop: insets.top + 12,
    paddingBottom: 32 + insets.bottom,
    paddingHorizontal: gap.md,
  };

  if (loading) {
    return (
      <View style={[styles.center, safePad]}>
        <ActivityIndicator size="large" color={Theme.primary} />
        <Text style={styles.muted}>{pick('Loading order…', 'Inapakia oda…')}</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={[styles.center, safePad]}>
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <FontAwesome name="chevron-left" size={18} color={Theme.primary} />
          <Text style={styles.backLink}>{pick('Back', 'Rudi')}</Text>
        </Pressable>
        <FontAwesome name="exclamation-circle" size={48} color={Theme.textMuted} style={{ marginBottom: 16 }} />
        <Text style={styles.errTitle}>{pick("Couldn't open order", 'Imeshindikana kufungua oda')}</Text>
        <Text style={styles.errBody}>{error ?? pick('Unknown error', 'Hitilafu isiyojulikana')}</Text>
        {/log in again/i.test(error ?? '') ? (
          <Pressable style={styles.primaryBtn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.primaryBtnText}>{pick('Log in', 'Ingia')}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const items = order.order_items;
  const lineRows = Array.isArray(items) ? items : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, safePad]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={() => router.back()} style={styles.backRow}>
        <FontAwesome name="chevron-left" size={18} color={Theme.primary} />
        <Text style={styles.backLink}>{pick('Orders', 'Oda')}</Text>
      </Pressable>

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>{pick('Order', 'Oda')}</Text>
        <Text style={styles.heroNumber}>
          #{order.order_number || String(order.id).slice(0, 10)}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{statusLabel(order.status)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Row icon="calendar" label={pick('Date', 'Tarehe')} value={order.created_at ? new Date(order.created_at).toLocaleString() : '—'} />
        <Row icon="money" label={pick('Total', 'Jumla')} value={`TSh ${(order.total_amount ?? 0).toLocaleString()}`} emphasize />
        <Row
          icon="map-marker"
          label={pick('Tracking', 'Ufuatiliaji')}
          value={
            typeof order.tracking_code === 'string' && order.tracking_code.trim()
              ? order.tracking_code.trim()
              : '—'
          }
        />
      </View>
      {trackingQuery.data ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{pick('Live delivery', 'Uwasilishaji wa moja kwa moja')}</Text>
          <Row
            icon="clock-o"
            label={pick('ETA', 'Muda wa kufika')}
            value={
              trackingQuery.data.eta_minutes != null
                ? `${trackingQuery.data.eta_minutes} min`
                : '—'
            }
          />
          <Row
            icon="road"
            label={pick('Distance remaining', 'Umbali uliobaki')}
            value={
              trackingQuery.data.distance_km != null
                ? `${trackingQuery.data.distance_km.toFixed(1)} km`
                : '—'
            }
          />
          <Row icon="user" label={pick('Driver', 'Dereva')} value={trackingQuery.data.driver_name || '—'} />
          {trackingQuery.data.driver_phone_masked ? (
            <Row icon="phone" label={pick('Driver phone', 'Simu ya dereva')} value={trackingQuery.data.driver_phone_masked} />
          ) : null}
          <Text style={styles.liveHint}>
            {pick('Updates every 15 seconds while your order is in transit.', 'Inasasishwa kila sekunde 15 oda ikiwa safarini.')}
          </Text>
          <View style={{ marginTop: 14 }}>
            <TrackingMap
              driverLocation={trackingQuery.data.driver_location ?? null}
              routePoints={trackingQuery.data.route_points}
              destination={orderDropoffCoords(order)}
              height={220}
            />
          </View>
        </View>
      ) : null}

      {lineRows.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{pick('Items', 'Bidhaa')}</Text>
          {lineRows.map((line, idx) => {
            const l = line && typeof line === 'object' ? (line as Record<string, unknown>) : {};
            const name =
              (l.product_name as string) ||
              (l.name as string) ||
              pick(`Item ${idx + 1}`, `Bidhaa ${idx + 1}`);
            const qty = Number(l.quantity ?? 1);
            const price = Number(l.price ?? l.unit_price ?? 0);
            return (
              <View key={idx} style={styles.lineRow}>
                <View style={styles.lineMain}>
                  <Text style={styles.lineName} numberOfLines={2}>
                    {name}
                  </Text>
                  <Text style={styles.lineMeta}>
                    {qty} × TSh {price.toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.lineTotal}>TSh {(qty * price).toLocaleString()}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <Pressable style={styles.secondaryBtn} onPress={() => router.push('/(tabs)/orders')}>
        <Text style={styles.secondaryBtnText}>{pick('All orders', 'Oda zote')}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({
  icon,
  label,
  value,
  emphasize,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <View style={styles.row}>
      <FontAwesome name={icon} size={16} color={Theme.primary} style={styles.rowIcon} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, emphasize && styles.rowValueEm]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  content: { paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.backgroundSecondary },
  muted: { marginTop: 12, fontSize: 14, color: Theme.textMuted },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backLink: { fontSize: 16, fontWeight: '600', color: Theme.primary },
  hero: {
    backgroundColor: Theme.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Theme.shadowMd,
  },
  heroLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  heroNumber: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  card: {
    backgroundColor: Theme.background,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    ...Theme.shadowSm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.text,
    marginBottom: 14,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  rowIcon: { marginRight: 12, marginTop: 2 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 12, fontWeight: '600', color: Theme.textMuted, marginBottom: 2 },
  rowValue: { fontSize: 16, color: Theme.text },
  rowValueEm: { fontWeight: '800', color: Theme.primary, fontSize: scaleByWidth(18) },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.inputBorder,
  },
  lineMain: { flex: 1, marginRight: 12 },
  lineName: { fontSize: 15, fontWeight: '600', color: Theme.text },
  lineMeta: { fontSize: 13, color: Theme.textMuted, marginTop: 4 },
  lineTotal: { fontSize: 15, fontWeight: '700', color: Theme.text },
  liveHint: { marginTop: 6, fontSize: 12, color: Theme.textMuted },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: Theme.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 14,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '600', color: Theme.primary },
  errTitle: { fontSize: 18, fontWeight: '700', color: Theme.text, marginBottom: 8 },
  errBody: { fontSize: 14, color: Theme.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
});
