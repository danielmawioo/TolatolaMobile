import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';

/**
 * App-wide "you're offline" indicator. Renders nothing while connected;
 * shows a small, unobtrusive banner when the device has no network
 * connection or the network is up but the internet isn't reachable.
 */
export function OfflineBanner() {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isOffline = !isConnected || isInternetReachable === false;

  if (!isOffline) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>You&apos;re offline — some features may not work</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#fffbeb',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    textAlign: 'center',
  },
});
