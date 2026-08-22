import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  getRoleRedirectPath,
  getUserRoleFromSession,
  sessionNeedsCompleteProfile,
  type UserType,
} from '@/src/lib/roleRedirect';
import { Theme } from '@/constants/Theme';

export type RoleGateMode = 'buyer-tabs' | 'vendor' | 'transporter' | 'admin';

type Props = {
  mode: RoleGateMode;
  children: React.ReactNode;
};

/**
 * Ensures each route group only renders for the right audience:
 * - buyer-tabs: guests + customers only (vendors/transporters/admins are sent to their apps).
 * - vendor / transporter / admin: must be logged in and match that role.
 */
export function RoleLayoutGate({ mode, children }: Props) {
  const router = useRouter();
  const { isAuthenticated, isLoading, session } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setReady(false);
      return;
    }

    if (mode === 'buyer-tabs') {
      if (!isAuthenticated) {
        setReady(true);
        return;
      }
      if (sessionNeedsCompleteProfile(session)) {
        router.replace('/(auth)/complete-profile' as any);
        return;
      }
      const role = getUserRoleFromSession(session);
      if (role !== 'customer') {
        router.replace(getRoleRedirectPath(role) as any);
        return;
      }
      setReady(true);
      return;
    }

    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }

    const actual = getUserRoleFromSession(session);
    const required: UserType = mode;
    if (actual !== required) {
      router.replace(getRoleRedirectPath(actual) as any);
      return;
    }
    setReady(true);
  }, [isLoading, isAuthenticated, session, mode, router]);

  if (isLoading || !ready) {
    return (
      <View style={styles.center} accessibilityLabel="Loading">
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
