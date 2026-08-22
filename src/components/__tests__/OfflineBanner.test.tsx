import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { OfflineBanner } from '@/src/components/OfflineBanner';
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';

jest.mock('@/src/hooks/useNetworkStatus');

const mockedUseNetworkStatus = useNetworkStatus as jest.Mock;

describe('OfflineBanner', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when connected and the internet is reachable', () => {
    mockedUseNetworkStatus.mockReturnValue({ isConnected: true, isInternetReachable: true });

    const { toJSON } = render(<OfflineBanner />);

    expect(toJSON()).toBeNull();
  });

  it('renders nothing while reachability is still unknown but the device is connected', () => {
    mockedUseNetworkStatus.mockReturnValue({ isConnected: true, isInternetReachable: null });

    const { toJSON } = render(<OfflineBanner />);

    expect(toJSON()).toBeNull();
  });

  it('shows the offline message when the device has no network connection', () => {
    mockedUseNetworkStatus.mockReturnValue({ isConnected: false, isInternetReachable: false });

    render(<OfflineBanner />);

    expect(screen.getByText(/you're offline/i)).toBeTruthy();
  });

  it('shows the offline message when connected but the internet is unreachable', () => {
    mockedUseNetworkStatus.mockReturnValue({ isConnected: true, isInternetReachable: false });

    render(<OfflineBanner />);

    expect(screen.getByText(/you're offline/i)).toBeTruthy();
  });
});
