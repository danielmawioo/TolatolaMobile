import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { TransporterAssignmentsTab } from '@/src/components/transporter/TransporterAssignmentsTab';
import { router } from 'expo-router';
import { apiGet } from '@/src/services/api';

jest.mock('@/src/services/api');

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

const mockedApiGet = apiGet as jest.Mock;
const mockedRouterPush = router.push as jest.Mock;

const acceptedJob = {
  id: 'a1',
  status: 'accepted',
  is_available_order: false,
  accepted_at: '2026-01-01T00:00:00.000Z',
  order_id: 'order-1',
  delivery_fee: 5000,
  distance_km: 4,
  shops: {
    name: 'Kariakoo Shop',
    district: 'Ilala',
    region: 'Dar es Salaam',
    ward: 'Kariakoo',
    address: 'Msimbazi Street',
    phone: '0712000000',
    latitude: -6.8161,
    longitude: 39.2803,
  },
  orders: {
    order_number: '1001',
    users: { full_name: 'Asha Mwinyi', phone: '0713000000' },
    shipping_address: {
      full_name: 'Asha Mwinyi',
      street: 'Mikocheni Road 12',
      ward: 'Mikocheni',
      district: 'Kinondoni',
      region: 'Dar es Salaam',
      latitude: -6.75,
      longitude: 39.27,
    },
  },
};

/** "Navigate to pickup"/"Navigate to drop-off" links only appear for accepted trips. */
async function renderAcceptedTrip() {
  mockedApiGet.mockResolvedValue([acceptedJob]);
  render(<TransporterAssignmentsTab transporterId="t1" accessToken="tok" />);
  fireEvent.press(await screen.findByText('Accepted'));
  await screen.findByText('Navigate to pickup');
}

describe('TransporterAssignmentsTab navigation', () => {
  beforeEach(() => {
    mockedRouterPush.mockClear();
  });

  afterEach(() => jest.clearAllMocks());

  it('pushes the in-app navigator for the pickup leg without external map links', async () => {
    await renderAcceptedTrip();

    fireEvent.press(screen.getByText('Navigate to pickup'));

    await waitFor(() => expect(mockedRouterPush).toHaveBeenCalledTimes(1));
    const call = mockedRouterPush.mock.calls[0][0];
    expect(call.pathname).toBe('/(transporter)/delivery-map');
    expect(call.params).toMatchObject({
      assignmentId: 'a1',
      target: 'pickup',
      status: 'accepted',
      shopName: 'Kariakoo Shop',
      shopLat: -6.8161,
      shopLng: 39.2803,
      custLat: -6.75,
      custLng: 39.27,
      custName: 'Asha Mwinyi',
    });
  });

  it('pushes the navigator for the drop-off leg', async () => {
    await renderAcceptedTrip();

    fireEvent.press(screen.getByText('Navigate to drop-off'));

    await waitFor(() => expect(mockedRouterPush).toHaveBeenCalledTimes(1));
    const call = mockedRouterPush.mock.calls[0][0];
    expect(call.pathname).toBe('/(transporter)/delivery-map');
    expect(call.params.target).toBe('dropoff');
  });

  it('starts auto navigation from the main action button', async () => {
    await renderAcceptedTrip();

    fireEvent.press(screen.getByText('Start pickup navigation'));

    await waitFor(() => expect(mockedRouterPush).toHaveBeenCalledTimes(1));
    const call = mockedRouterPush.mock.calls[0][0];
    expect(call.pathname).toBe('/(transporter)/delivery-map');
    expect(call.params.target).toBe('auto');
  });

  it('shows where the product currently is on the accepted card', async () => {
    await renderAcceptedTrip();

    expect(screen.getByText('Product: Waiting at pickup')).toBeTruthy();
    expect(
      screen.getByText('The package is still at the merchant. Head to the pickup point.'),
    ).toBeTruthy();
  });

  it('never opens an external Google Maps URL', async () => {
    await renderAcceptedTrip();

    fireEvent.press(screen.getByText('Navigate to pickup'));
    await waitFor(() => expect(mockedRouterPush).toHaveBeenCalled());

    mockedRouterPush.mock.calls.forEach(([call]) => {
      expect(call.pathname).toBe('/(transporter)/delivery-map');
    });
  });
});
