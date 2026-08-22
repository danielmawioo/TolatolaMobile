import { renderHook, act } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';

jest.mock('@react-native-community/netinfo');

const mockedAddEventListener = NetInfo.addEventListener as jest.Mock;

describe('useNetworkStatus', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts optimistic (connected, reachability unknown) before any event fires', () => {
    const unsubscribe = jest.fn();
    mockedAddEventListener.mockReturnValue(unsubscribe);

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current).toEqual({ isConnected: true, isInternetReachable: null });
    expect(mockedAddEventListener).toHaveBeenCalledTimes(1);
  });

  it('updates state when the NetInfo listener fires with a new state', () => {
    let listener: (state: any) => void = () => {};
    mockedAddEventListener.mockImplementation(cb => {
      listener = cb;
      return jest.fn();
    });

    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      listener({ isConnected: false, isInternetReachable: false });
    });

    expect(result.current).toEqual({ isConnected: false, isInternetReachable: false });

    act(() => {
      listener({ isConnected: true, isInternetReachable: true });
    });

    expect(result.current).toEqual({ isConnected: true, isInternetReachable: true });
  });

  it('coerces a nullish isConnected to false', () => {
    let listener: (state: any) => void = () => {};
    mockedAddEventListener.mockImplementation(cb => {
      listener = cb;
      return jest.fn();
    });

    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      listener({ isConnected: null, isInternetReachable: null });
    });

    expect(result.current).toEqual({ isConnected: false, isInternetReachable: null });
  });

  it('unsubscribes the NetInfo listener on unmount', () => {
    const unsubscribe = jest.fn();
    mockedAddEventListener.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useNetworkStatus());

    expect(unsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
