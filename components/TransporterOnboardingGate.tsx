import React, { useLayoutEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/contexts/AuthContext';
import { resolveTransporterGate } from '@/src/lib/dashboardBootstrap';
import { queryKeys } from '@/src/lib/queryKeys';
import { Theme } from '@/constants/Theme';
import { logger } from '@/src/lib/logger';

const SKIP_SEGMENTS = new Set(['register', 'kyc-pending', 'kyc-rejected']);

type Props = { children: React.ReactNode };

export function TransporterOnboardingGate({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, isLoading: authLoading } = useAuth();
  const token = session?.access_token ?? '';

  const tail = pathname.split('/').filter(Boolean).pop() ?? '';
  const skipBootstrap = SKIP_SEGMENTS.has(tail);

  const q = useQuery({
    queryKey: queryKeys.api.transporterOnboarding(token),
    queryFn: () => resolveTransporterGate(token),
    enabled: Boolean(token) && !skipBootstrap,
    staleTime: 30_000,
  });

  useLayoutEffect(() => {
    if (authLoading || !token || skipBootstrap || !q.isSuccess || !q.data) return;
    const snap = q.data;

    if (__DEV__) {
      // eslint-disable-next-line no-console
      logger.info('[transporter:gate]', snap.screen);
    }

    if (snap.screen === 'dashboard') return;
    const target =
      snap.screen === 'register'
        ? '/(transporter)/register'
        : snap.screen === 'kyc-pending'
          ? '/(transporter)/kyc-pending'
          : '/(transporter)/kyc-rejected';
    router.replace(target as Parameters<typeof router.replace>[0]);
  }, [authLoading, token, skipBootstrap, q.isSuccess, q.data, router]);

  if (authLoading || !token) {
    return (
      <View style={styles.center} accessibilityLabel="Loading transporter workspace">
        <ActivityIndicator size="large" color={Theme.primary} />
      </View>
    );
  }

  if (!skipBootstrap && (q.isPending || q.isFetching)) {
    return (
      <View style={styles.center} accessibilityLabel="Loading transporter workspace">
        <ActivityIndicator size="large" color={Theme.primary} />
      </View>
    );
  }

  if (!skipBootstrap && q.isError) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      logger.warn('[transporter:gate] bootstrap failed', q.error);
    }
    return <>{children}</>;
  }

  if (!skipBootstrap && q.isSuccess && q.data && q.data.screen !== 'dashboard') {
    return (
      <View style={styles.center} accessibilityLabel="Redirecting transporter">
        <ActivityIndicator size="large" color={Theme.primary} />
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
});
