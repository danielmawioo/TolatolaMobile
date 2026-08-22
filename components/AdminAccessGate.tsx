import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { adminMyRoleGranted, fetchAdminMyRole } from '@/src/lib/dashboardBootstrap';
import { queryKeys } from '@/src/lib/queryKeys';
import { Theme } from '@/constants/Theme';
import { logger } from '@/src/lib/logger';

type Props = { children: React.ReactNode };

export function AdminAccessGate({ children }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, isLoading: authLoading } = useAuth();
  const token = session?.access_token ?? '';
  const [granted, setGranted] = useState<boolean | null>(null);

  const q = useQuery({
    queryKey: queryKeys.api.adminMyRole(token),
    queryFn: () => fetchAdminMyRole(token),
    enabled: Boolean(token),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!token || authLoading) {
      setGranted(null);
      return;
    }
    if (q.isPending) {
      setGranted(null);
      return;
    }
    const ok = adminMyRoleGranted(q.data ?? null);
    if (__DEV__) {
      // eslint-disable-next-line no-console
      logger.info('[admin:gate]', { adminRolePresent: ok, raw: q.data });
    }
    setGranted(ok);
  }, [token, authLoading, q.isPending, q.data]);

  if (authLoading || !token || granted === null || q.isPending) {
    return (
      <View style={styles.center} accessibilityLabel="Loading admin access">
        <ActivityIndicator size="large" color={Theme.primary} />
      </View>
    );
  }

  if (!granted) {
    return (
      <View style={[styles.denied, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.deniedTitle}>No admin access</Text>
        <Text style={styles.deniedBody}>
          Your account is not authorized for the operations console. If you believe this is a mistake, contact support.
        </Text>
        <Pressable style={styles.btn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.btnText}>Go to shop</Text>
        </Pressable>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.backgroundSecondary,
  },
  denied: {
    flex: 1,
    backgroundColor: Theme.backgroundSecondary,
    paddingHorizontal: 24,
  },
  deniedTitle: { fontSize: 20, fontWeight: '700', color: Theme.text, marginBottom: 8 },
  deniedBody: { fontSize: 15, color: Theme.textSecondary, lineHeight: 22, marginBottom: 24 },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: Theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
