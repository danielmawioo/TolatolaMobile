import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export type NetworkStatus = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
};

/**
 * Subscribes to device network connectivity changes and exposes a small,
 * NetInfo-shaped status: whether a network interface is connected, and
 * whether the internet is actually reachable through it (null while
 * NetInfo hasn't determined this yet).
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setStatus({
        isConnected: !!state.isConnected,
        isInternetReachable: state.isInternetReachable,
      });
    });

    return () => unsubscribe();
  }, []);

  return status;
}
