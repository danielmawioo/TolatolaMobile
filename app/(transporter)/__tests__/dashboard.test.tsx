import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import TransporterDashboardScreen from '@/app/(transporter)/dashboard';
import { useAuth } from '@/src/contexts/AuthContext';
import { apiGet } from '@/src/services/api';

jest.mock('@/src/services/api');

jest.mock('@/src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}),
  useFocusEffect: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3, High: 4 },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedApiGet = apiGet as jest.Mock;

const TRANSPORTER = { id: 't-1', business_name: 'Fast Cargo', vehicle_type: 'car', kyc_status: 'approved' };

function mockApiForApprovedTransporter() {
  mockedApiGet.mockImplementation((path: string) => {
    if (path === '/profile') return Promise.resolve({ profile: { full_name: 'Asha', email: 'asha@test.com' } });
    if (path === '/transporters/me') return Promise.resolve({ transporter: TRANSPORTER });
    if (path === '/transporter/jobs') return Promise.resolve({ assignments: [] });
    if (path === '/transporters/payments') return Promise.resolve({ payments: [] });
    if (path === '/transporter/finance-summary') return Promise.resolve({ withdrawable_balance: 0 });
    if (path === '/notifications/unread-count') return Promise.resolve({ unread_count: 0 });
    return Promise.resolve(null);
  });
}

describe('TransporterDashboardScreen', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      session: { access_token: 'token-123', user: { id: 'user-1', email: 'driver@test.com' } },
      logout: jest.fn(),
      isAuthenticated: true,
      setSession: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads transporter data and switches between tabs', async () => {
    mockApiForApprovedTransporter();

    render(<TransporterDashboardScreen />);

    await waitFor(() => expect(screen.getByText('Transporter Dashboard')).toBeTruthy());

    // Defaults to the Deliveries tab
    expect(screen.getByText('Fast Cargo')).toBeTruthy();

    // Switch to the Profile tab
    fireEvent.press(screen.getByText('Profile'));
    await waitFor(() => expect(screen.getByText('Profile Details')).toBeTruthy());

    // Switch to the Payments tab
    fireEvent.press(screen.getByText('Payments'));
    await waitFor(() => expect(screen.queryByText('Profile Details')).toBeNull());
  });

  it('renders without crashing when the initial data fetch fails', async () => {
    mockedApiGet.mockRejectedValue(new Error('network down'));

    render(<TransporterDashboardScreen />);

    // No transporter profile could be loaded -> falls through to the KYC gate,
    // which should render gracefully rather than crash the screen.
    await waitFor(() => expect(screen.getByText('Transporter KYC Required')).toBeTruthy());
  });
});
