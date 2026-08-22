import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { TransporterSubscriptionTab } from '@/src/components/transporter/TransporterSubscriptionTab';
import { apiGet } from '@/src/services/api';

jest.mock('@/src/services/api');

const mockedApiGet = apiGet as jest.Mock;

const plans = [
  { id: 'free', name: 'Free', price: 0 },
  { id: 'elite', name: 'Elite', price: 30000, has_verification_badge: true },
];

describe('TransporterSubscriptionTab', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows the active plan and the list of available plans', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path.startsWith('/subscriptions/plans')) return Promise.resolve({ plans });
      if (path === '/transporters/me') {
        return Promise.resolve({ transporter: { current_subscription: { plan: { id: 'free', name: 'Free', price: 0 } } } });
      }
      return Promise.resolve({});
    });

    render(<TransporterSubscriptionTab transporterId="t1" accessToken="tok" />);

    await waitFor(() => expect(screen.getByText('Active: Free')).toBeTruthy());
    expect(screen.getByText('Elite')).toBeTruthy();
    expect(screen.getByText('Upgrade to Elite')).toBeTruthy();
  });

  it('opens the upgrade modal for the selected plan', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path.startsWith('/subscriptions/plans')) return Promise.resolve({ plans });
      if (path === '/transporters/me') return Promise.resolve({ transporter: { current_subscription: null } });
      return Promise.resolve({});
    });

    render(<TransporterSubscriptionTab transporterId="t1" accessToken="tok" />);
    await waitFor(() => screen.getByText('Upgrade to Elite'));

    fireEvent.press(screen.getByText('Upgrade to Elite'));
    expect(screen.getByText('Upgrade Account')).toBeTruthy();
    expect(screen.getByText('Elite Member')).toBeTruthy();
  });

  it('does not show an active plan card with no subscription', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path.startsWith('/subscriptions/plans')) return Promise.resolve({ plans: [] });
      if (path === '/transporters/me') return Promise.resolve({ transporter: {} });
      return Promise.resolve({});
    });

    render(<TransporterSubscriptionTab transporterId="t1" accessToken="tok" />);
    await waitFor(() => expect(mockedApiGet).toHaveBeenCalled());
    expect(screen.queryByText(/^Active:/)).toBeNull();
  });
});
