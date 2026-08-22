import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';
import { useNotifications } from '@/src/contexts/NotificationsContext';
import type { Notification } from '@/src/api/notifications';
import {
  NOTIFICATION_ROLE_SUBTITLE,
  getNotificationDeepLink,
  notificationIconForType,
} from '@/src/lib/notificationsForRole';

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (Number.isNaN(diff) || diff < 0) return d.toLocaleString();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const EMPTY_COPY: Record<string, { title: string; body: string }> = {
  customer: {
    title: 'No notifications yet',
    body: 'We will show order updates, delivery status, payments, and offers for your account here.',
  },
  vendor: {
    title: 'No seller alerts',
    body: 'New orders, listing reviews, payouts, and shop messages will appear here.',
  },
  transporter: {
    title: 'No logistics updates',
    body: 'Assignments, route changes, and payout notices for your transporter account show up here.',
  },
  admin: {
    title: 'No operations alerts',
    body: 'Moderation queues, KYC reviews, and platform events will be listed here.',
  },
};

type Props = {
  /** e.g. back button for vendor / transporter / admin stacks */
  leadingAccessory?: React.ReactNode;
};

export function NotificationsFeed({ leadingAccessory }: Props) {
  const insets = useSafeAreaInsets();
  const {
    notifications,
    unreadCount,
    loading,
    isRefetching,
    userRole,
    refresh,
    markAsRead,
    markAllRead,
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.is_read);
    return notifications;
  }, [notifications, filter]);

  const subtitle = NOTIFICATION_ROLE_SUBTITLE[userRole];
  const emptyCopy = EMPTY_COPY[userRole] ?? EMPTY_COPY.customer;

  const onMarkAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    await markAllRead();
  }, [markAllRead, unreadCount]);

  const handleOpen = useCallback(
    async (n: Notification) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!n.is_read) {
        await markAsRead(n.id);
      }
      const link = getNotificationDeepLink(n);
      if (link) {
        router.push(link as never);
        return;
      }
      setExpandedId((id) => (id === n.id ? null : n.id));
    },
    [markAsRead]
  );

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => {
      const icon = notificationIconForType(item.type);
      const expanded = expandedId === item.id;
      const link = getNotificationDeepLink(item);
      return (
        <Pressable
          onPress={() => handleOpen(item)}
          style={({ pressed }) => [
            styles.card,
            !item.is_read && styles.cardUnread,
            pressed && styles.cardPressed,
          ]}
        >
          {!item.is_read ? <View style={styles.unreadStripe} /> : null}
          <View style={styles.cardInner}>
            <View style={[styles.iconBubble, !item.is_read && styles.iconBubbleActive]}>
              <FontAwesome
                name={icon}
                size={18}
                color={item.is_read ? Theme.textMuted : Theme.primary}
              />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <Text style={[styles.itemTitle, !item.is_read && styles.itemTitleUnread]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.itemMeta}>{formatRelativeTime(item.created_at)}</Text>
              </View>
              <Text
                style={styles.itemBody}
                numberOfLines={expanded ? undefined : 3}
                ellipsizeMode="tail"
              >
                {item.message}
              </Text>
              <View style={styles.cardFooter}>
                {link ? (
                  <Text style={styles.openLink}>
                    Open <FontAwesome name="chevron-right" size={11} color={Theme.link} />
                  </Text>
                ) : (
                  <Text style={styles.openLinkMuted}>
                    {expanded ? 'Tap to collapse' : 'Tap to read more'}
                  </Text>
                )}
              </View>
            </View>
            {!item.is_read ? <View style={styles.newDot} /> : null}
          </View>
        </Pressable>
      );
    },
    [expandedId, handleOpen]
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.headerCard, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTopRow}>
          {leadingAccessory ? <View style={styles.leadingSlot}>{leadingAccessory}</View> : null}
          <View style={[styles.headerTitleBlock, !leadingAccessory && styles.headerTitleBlockFull]}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          {unreadCount > 0 ? (
            <Pressable
              onPress={onMarkAllRead}
              style={({ pressed }) => [styles.markAllBtn, pressed && styles.markAllBtnPressed]}
              hitSlop={8}
            >
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          ) : (
            <View style={styles.markAllPlaceholder} />
          )}
        </View>

        <View style={styles.filterRow}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setFilter('all');
            }}
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>All</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setFilter('unread');
            }}
            style={[styles.filterChip, filter === 'unread' && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === 'unread' && styles.filterChipTextActive]}>
              Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
            </Text>
          </Pressable>
        </View>

        {unreadCount > 0 ? (
          <View style={styles.badgeRow}>
            <View style={styles.unreadPill}>
              <View style={styles.unreadDot} />
              <Text style={styles.unreadPillText}>{unreadCount} new</Text>
            </View>
          </View>
        ) : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        extraData={expandedId}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refresh}
            colors={[Theme.primary]}
            tintColor={Theme.primary}
          />
        }
        ListEmptyComponent={
          loading && notifications.length === 0 ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator size="large" color={Theme.primary} />
              <Text style={styles.loadingHint}>Loading your updates…</Text>
            </View>
          ) : !loading ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <FontAwesome name="bell-o" size={44} color={Theme.primary} />
              </View>
              <Text style={styles.emptyTitle}>{emptyCopy.title}</Text>
              <Text style={styles.emptyBody}>{emptyCopy.body}</Text>
              {filter === 'unread' && notifications.length > 0 ? (
                <Pressable
                  style={styles.emptyCta}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setFilter('all');
                  }}
                >
                  <Text style={styles.emptyCtaText}>Show all notifications</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  headerCard: {
    backgroundColor: Theme.background,
    paddingHorizontal: gap.md,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.inputBorder,
    ...Theme.shadowSm,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  leadingSlot: { paddingTop: 4, marginRight: 4 },
  headerTitleBlock: { flex: 1, minWidth: 0 },
  headerTitleBlockFull: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: Theme.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: Theme.textSecondary, marginTop: 4, lineHeight: 18 },
  markAllBtn: { paddingVertical: 8, paddingHorizontal: 4, maxWidth: 104 },
  markAllPlaceholder: { width: 104 },
  markAllBtnPressed: { opacity: 0.7 },
  markAllText: { fontSize: 13, fontWeight: '700', color: Theme.link, textAlign: 'right' },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Theme.inputBg,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  filterChipActive: {
    backgroundColor: 'rgba(26, 86, 219, 0.12)',
    borderColor: Theme.primary,
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  filterChipTextActive: { color: Theme.primaryDark },
  badgeRow: { marginTop: 12 },
  unreadPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(26, 86, 219, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.primary,
  },
  unreadPillText: { fontSize: 13, fontWeight: '700', color: Theme.primaryDark },
  listContent: {
    paddingHorizontal: gap.md,
    paddingTop: 16,
    flexGrow: 1,
  },
  card: {
    backgroundColor: Theme.background,
    borderRadius: Theme.radiusMd,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    overflow: 'hidden',
    ...Theme.shadowSm,
  },
  cardUnread: {
    borderColor: 'rgba(26, 86, 219, 0.35)',
    backgroundColor: '#f8faff',
  },
  cardPressed: { opacity: 0.92 },
  unreadStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: Theme.primary,
    borderTopLeftRadius: Theme.radiusMd,
    borderBottomLeftRadius: Theme.radiusMd,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingLeft: 16,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Theme.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconBubbleActive: {
    backgroundColor: 'rgba(26, 86, 219, 0.12)',
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemTitle: { fontSize: 15, fontWeight: '600', color: Theme.text, flex: 1 },
  itemTitleUnread: { fontWeight: '800', color: Theme.primaryDark },
  itemBody: { fontSize: 14, color: Theme.textSecondary, marginTop: 6, lineHeight: 20 },
  itemMeta: { fontSize: 11, fontWeight: '600', color: Theme.textMuted },
  cardFooter: { marginTop: 8 },
  openLink: { fontSize: 13, fontWeight: '700', color: Theme.link },
  openLinkMuted: { fontSize: 12, fontWeight: '600', color: Theme.textMuted },
  newDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.primary,
    marginTop: 4,
    marginLeft: 4,
  },
  loadingBlock: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingHint: { marginTop: 12, fontSize: 14, color: Theme.textSecondary },
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: gap.lg,
    paddingTop: 32,
    paddingBottom: 24,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(26, 86, 219, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Theme.text, marginBottom: 8 },
  emptyBody: {
    fontSize: 15,
    color: Theme.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  emptyCta: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 18 },
  emptyCtaText: { fontSize: 15, fontWeight: '700', color: Theme.link },
});
