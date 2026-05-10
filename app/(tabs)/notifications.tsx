import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';
import { apiGet, apiPost } from '@/src/services/api';
import * as Haptics from 'expo-haptics';

const TYPE_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  order_status_update: { icon: 'shopping-bag', color: '#7c3aed', bg: '#f3e8ff' },
  order_received: { icon: 'inbox', color: '#2563eb', bg: '#dbeafe' },
  payment_confirmed: { icon: 'check-circle', color: '#16a34a', bg: '#dcfce7' },
  payment_failed: { icon: 'times-circle', color: '#ef4444', bg: '#fef2f2' },
  delivery_assignment: { icon: 'truck', color: '#ea580c', bg: '#fff7ed' },
  delivery_update: { icon: 'truck', color: '#0891b2', bg: '#ecfeff' },
  delivery_completed: { icon: 'check', color: '#16a34a', bg: '#dcfce7' },
  vendor_order: { icon: 'store', color: '#7c3aed', bg: '#f3e8ff' },
  payout: { icon: 'money', color: '#16a34a', bg: '#dcfce7' },
  subscription: { icon: 'star', color: '#eab308', bg: '#fefce8' },
  support_ticket: { icon: 'headphones', color: '#6366f1', bg: '#eef2ff' },
  kyc_update: { icon: 'shield', color: '#0891b2', bg: '#ecfeff' },
};

function getIcon(type: string) {
  return TYPE_ICONS[type] || { icon: 'bell', color: '#6b7280', bg: '#f3f4f6' };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await apiGet<any>('/notifications?limit=50', session.access_token);
      setNotifications(res?.data || []);
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
    setLoading(false);
    setRefreshing(false);
  }, [session?.access_token]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const handleMarkRead = async (id: string) => {
    if (!session?.access_token) return;
    try {
      await apiPost(`/notifications/${id}/read`, {}, session.access_token);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) { console.error('Mark read error', e); }
  };

  const handleMarkAllRead = async () => {
    if (!session?.access_token) return;
    try {
      await apiPost('/notifications/read-all', {}, session.access_token);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) { console.error('Mark all read error', e); }
  };

  const handleNotificationPress = (notif: any) => {
    if (!notif.is_read) handleMarkRead(notif.id);
    const data = notif.data || {};
    if (data.screen) {
      router.push(data.screen);
    } else if (data.order_id) {
      router.push('/(tabs)/orders');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!session) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.empty}>
          <FontAwesome name="bell-slash" size={48} color={Theme.textMuted} />
          <Text style={s.emptyTitle}>Sign in to view notifications</Text>
          <Pressable style={s.loginBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={s.loginBtnText}>Log In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <FontAwesome name="arrow-left" size={18} color={Theme.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Notifications</Text>
          {unreadCount > 0 && <Text style={s.headerSub}>{unreadCount} unread</Text>}
        </View>
        {unreadCount > 0 && (
          <Pressable style={s.markAllBtn} onPress={handleMarkAllRead}>
            <FontAwesome name="check-double" size={12} color={Theme.primary} />
            <Text style={s.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={s.loadingCenter}><ActivityIndicator color={Theme.primary} size="large" /></View>
      ) : notifications.length === 0 ? (
        <View style={s.empty}>
          <FontAwesome name="bell-o" size={56} color={Theme.textMuted} />
          <Text style={s.emptyTitle}>All caught up!</Text>
          <Text style={s.emptyText}>You have no notifications right now.</Text>
        </View>
      ) : (
        <ScrollView
          style={s.list}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotifications(); }} colors={[Theme.primary]} />}
        >
          {notifications.map(notif => {
            const ti = getIcon(notif.type);
            return (
              <Pressable
                key={notif.id}
                style={[s.notifCard, !notif.is_read && s.notifUnread]}
                onPress={() => handleNotificationPress(notif)}
              >
                <View style={[s.notifIcon, { backgroundColor: ti.bg }]}>
                  <FontAwesome name={ti.icon as any} size={16} color={ti.color} />
                </View>
                <View style={s.notifBody}>
                  <View style={s.notifTitleRow}>
                    <Text style={[s.notifTitle, !notif.is_read && { fontWeight: '800' }]} numberOfLines={1}>{notif.title}</Text>
                    {!notif.is_read && <View style={s.unreadDot} />}
                  </View>
                  <Text style={s.notifMessage} numberOfLines={2}>{notif.message}</Text>
                  <Text style={s.notifTime}>{timeAgo(notif.created_at)}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Theme.background, borderBottomWidth: 1, borderBottomColor: Theme.inputBorder },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Theme.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Theme.text },
  headerSub: { fontSize: 11, color: Theme.primary, fontWeight: '600' },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: Theme.primary + '10', borderWidth: 1, borderColor: Theme.primary + '20' },
  markAllText: { fontSize: 11, fontWeight: '700', color: Theme.primary },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Theme.text },
  emptyText: { fontSize: 13, color: Theme.textMuted, textAlign: 'center' },
  loginBtn: { backgroundColor: Theme.primary, paddingVertical: 12, paddingHorizontal: 32, borderRadius: Theme.radiusMd, marginTop: 8 },
  loginBtnText: { color: '#fff', fontWeight: '700' },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 6 },
  notifCard: { flexDirection: 'row', gap: 12, padding: 14, backgroundColor: Theme.background, borderRadius: Theme.radiusMd, borderWidth: 1, borderColor: Theme.inputBorder },
  notifUnread: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' },
  notifIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notifBody: { flex: 1, gap: 3 },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: Theme.text, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Theme.primary },
  notifMessage: { fontSize: 12, color: Theme.textSecondary, lineHeight: 18 },
  notifTime: { fontSize: 10, color: Theme.textMuted, marginTop: 2 },
});
