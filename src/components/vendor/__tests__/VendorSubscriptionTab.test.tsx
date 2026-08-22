import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { VendorSubscriptionTab } from '@/src/components/vendor/VendorSubscriptionTab';
import { apiGet } from '@/src/services/api';

jest.mock('@/src/services/api');

const mockedApiGet = apiGet as jest.Mock;

const plans = [
  { id: 'free', name: 'Free', price: 0, features: { description: 'Basic tier' }, support_level: 'Community' },
  { id: 'premium', name: 'Premium', price: 20000, features: { description: 'Pro tier' }, support_level: 'Priority', has_verification_badge: true },
];

describe('VendorSubscriptionTab', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows the current plan and the list of available plans', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/subscriptions/plans') return Promise.resolve({ plans });
      if (path.includes('/subscription')) {
        return Promise.resolve({ vendor: { current_subscription: { plan: { id: 'free', name: 'Free', price: 0 } } } });
      }
      return Promise.resolve({});
    });

    render(<VendorSubscriptionTab vendorId="v1" accessToken="tok" />);

    await waitFor(() => expect(screen.getByText('Available Plans')).toBeTruthy());
    expect(screen.getByText('Current: Free')).toBeTruthy();
    expect(screen.getByText('Premium')).toBeTruthy();
    expect(screen.getByText('Upgrade to Premium')).toBeTruthy();
  });

  it('opens the upgrade modal with the plan price when "Upgrade" is pressed', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/subscriptions/plans') return Promise.resolve({ plans });
      if (path.includes('/subscription')) return Promise.resolve({ vendor: { current_subscription: null } });
      return Promise.resolve({});
    });

    render(<VendorSubscriptionTab vendorId="v1" accessToken="tok" />);
    await waitFor(() => screen.getByText('Upgrade to Premium'));

    fireEvent.press(screen.getByText('Upgrade to Premium'));
    expect(screen.getByText('Choose your payment method')).toBeTruthy();
    expect(screen.getByText('Premium Plan')).toBeTruthy();
  });

  it('does not show a "Current" plan card when there is no active subscription', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/subscriptions/plans') return Promise.resolve({ plans: [] });
      if (path.includes('/subscription')) return Promise.resolve({ vendor: {} });
      return Promise.resolve({});
    });

    render(<VendorSubscriptionTab vendorId="v1" accessToken="tok" />);
    await waitFor(() => screen.getByText('Available Plans'));
    expect(screen.queryByText(/^Current:/)).toBeNull();
  });
});
