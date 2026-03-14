import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiGet } from '@/src/services/api';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';

const STATUS_LABELS: Record<string, string> = {
  ORDER_RECEIVED: 'Order received',
  PAYMENT_SECURED: 'Payment secured',
  VENDOR_PREPARING: 'Vendor preparing',
  PICKED_UP: 'Picked up',
  IN_TRANSIT: 'In transit',
  DELIVERED: 'Delivered',
};

export default function TrackStatusScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<{
    order_number?: string;
    tracking_code?: string;
    status?: string;
    timeline?: { status: string; at?: string }[];
    transporter_name?: string;
    transporter_phone_masked?: string;
    eta?: string;
  } | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Missing token');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await apiGet(`/tracking/status?token=${encodeURIComponent(token)}`);
        setData(res as any);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load status');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const safePadding = {
    paddingTop: insets.top + 16,
    paddingBottom: insets.bottom + 24,
    paddingHorizontal: gap.md,
  };

  if (loading) {
    return (
      <View style={[styles.container, safePadding]}>
        <Text style={styles.loading}>Loading…</Text>
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={[styles.container, safePadding]}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.error}>{error || 'Not found'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, safePadding]}
    >
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>Order status</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Order number</Text>
        <Text style={styles.value}>{data.order_number || '—'}</Text>
        <Text style={styles.label}>Tracking code</Text>
        <Text style={styles.value}>{data.tracking_code || '—'}</Text>
        <View style={styles.badgeWrap}>
          <Text style={styles.badge}>{data.status ? STATUS_LABELS[data.status] || data.status : '—'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        {(data.timeline || []).map((item, i) => (
          <View key={i} style={styles.timelineRow}>
            <Text style={styles.timelineStatus}>
              {STATUS_LABELS[item.status] || item.status}
            </Text>
            {item.at ? <Text style={styles.timelineAt}>{item.at}</Text> : null}
          </View>
        ))}
      </View>

      {(data.transporter_name || data.eta) && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery</Text>
          {data.transporter_name ? (
            <Text style={styles.value}>Transporter: {data.transporter_name}</Text>
          ) : null}
          {data.transporter_phone_masked ? (
            <Text style={styles.muted}>Phone: {data.transporter_phone_masked}</Text>
          ) : null}
          {data.eta ? <Text style={styles.muted}>ETA: {data.eta}</Text> : null}
        </View>
      )}

      <Pressable
        style={styles.button}
        onPress={() =>
          router.push({
            pathname: '/(guest)/track/complaint',
            params: { token: token!, orderId: (data as any).order_id || '' },
          })
        }
      >
        <Text style={styles.buttonText}>Raise complaint</Text>
      </Pressable>
      <Pressable style={styles.linkBtn} onPress={() => router.push('/(guest)/home')}>
        <Text style={styles.linkBtnText}>Contact support</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  content: { paddingBottom: 24, paddingHorizontal: gap.md },
  back: { marginBottom: 16 },
  backText: { fontSize: 16, color: Theme.link },
  loading: { textAlign: 'center', marginTop: 48, color: Theme.textSecondary },
  error: { color: Theme.error, padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: Theme.text, marginBottom: 20 },
  card: {
    backgroundColor: Theme.background,
    borderRadius: Theme.radiusMd,
    padding: 18,
    marginBottom: 16,
    ...Theme.shadowSm,
  },
  label: { fontSize: 12, color: Theme.textSecondary, marginBottom: 4 },
  value: { fontSize: 16, color: Theme.text, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Theme.text, marginBottom: 12 },
  badgeWrap: { marginTop: 8 },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Theme.primary,
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  timelineStatus: { fontSize: 14, color: Theme.text },
  timelineAt: { fontSize: 12, color: Theme.textMuted },
  muted: { fontSize: 14, color: Theme.textMuted, marginTop: 4 },
  button: {
    backgroundColor: Theme.primary,
    paddingVertical: 16,
    borderRadius: Theme.radiusMd,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkBtn: { alignItems: 'center', marginTop: 16 },
  linkBtnText: { fontSize: 15, color: Theme.link },
});
