import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import VendorDashboardScreen from '@/app/(vendor)/dashboard';
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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedApiGet = apiGet as jest.Mock;

const SHOP = { id: 'shop-1', name: 'Acme Shop', region: 'Dar', district: 'Ilala' };
const VENDOR = { id: 'vendor-1', business_name: 'Acme Vendor', kyc_status: 'approved' };
const PRODUCTS = [{ id: 'p1', name: 'Widget', price: 1000, stock_quantity: 5, images: [] }];

function mockApiForApprovedVendor() {
  mockedApiGet.mockImplementation((path: string) => {
    if (path === '/vendors') return Promise.resolve({ data: [VENDOR] });
    if (path === '/vendor/shop') return Promise.resolve({ shops: [SHOP] });
    if (path === '/shops/shop-1/products') return Promise.resolve({ data: PRODUCTS });
    if (path === '/shops/shop-1/orders') return Promise.resolve({ orders: [] });
    if (path === '/notifications/unread-count') return Promise.resolve({ unread_count: 0 });
    return Promise.resolve(null);
  });
}

describe('VendorDashboardScreen', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      session: { access_token: 'token-123', user: { email: 'vendor@test.com' } },
      logout: jest.fn(),
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads vendor data and switches between tabs', async () => {
    mockApiForApprovedVendor();

    render(<VendorDashboardScreen />);

    await waitFor(() => expect(screen.getByText('Welcome, Acme Vendor')).toBeTruthy());

    // Defaults to the Products tab
    expect(screen.getByText('Your Products')).toBeTruthy();
    expect(screen.getByText('Widget')).toBeTruthy();

    // Switch to the Profile tab (only the tab bar has this label right now)
    fireEvent.press(screen.getByText('Profile'));
    await waitFor(() => expect(screen.getByText('Business Profile')).toBeTruthy());

    // Switch to the Shop tab (only the tab bar has this label right now,
    // since the Profile tab's content doesn't say "Shop")
    fireEvent.press(screen.getByText('Shop'));
    await waitFor(() => expect(screen.getByText('Shop Settings')).toBeTruthy());
  });

  it('renders without crashing when the initial data fetch fails', async () => {
    mockedApiGet.mockRejectedValue(new Error('network down'));

    render(<VendorDashboardScreen />);

    // No vendor profile could be loaded -> falls through to the KYC gate,
    // which should render gracefully rather than crash the screen.
    await waitFor(() => expect(screen.getByText('Vendor KYC Required')).toBeTruthy());
  });
});
