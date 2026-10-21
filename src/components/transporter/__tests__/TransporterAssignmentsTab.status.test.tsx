import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { TransporterAssignmentsTab } from '@/src/components/transporter/TransporterAssignmentsTab';
import { apiGet, apiPatch, apiPost } from '@/src/services/api';

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
const mockedApiPost = apiPost as jest.Mock;
const mockedApiPatch = apiPatch as jest.Mock;

const availableJob = {
  id: 'a1',
  status: 'assigned',
  is_available_order: true,
  order_id: 'order-1',
  delivery_fee: 5000,
  distance_km: 4,
  orders: { order_number: '1001' },
  shops: { name: 'Kariakoo', district: 'Ilala', region: 'Dar es Salaam' },
};

const inTransitJob = {
  id: 'a2',
  status: 'in_transit',
  is_available_order: false,
  accepted_at: '2026-01-01T00:00:00.000Z',
  order_id: 'order-2',
  delivery_fee: 7000,
  distance_km: 8,
  orders: {
    order_number: '2002',
    shipping_address: { district: 'Kinondoni', region: 'Dar es Salaam' },
  },
};

describe('TransporterAssignmentsTab status actions', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockedApiPost.mockResolvedValue({});
    mockedApiPatch.mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  it('accepts an available job through apiPost', async () => {
    mockedApiGet.mockResolvedValue([availableJob]);
    render(<TransporterAssignmentsTab transporterId="t1" accessToken="tok" />);

    expect(await screen.findByText('Order #1001')).toBeTruthy();
    fireEvent.press(screen.getByText('Accept Cargo'));

    await waitFor(() =>
      expect(mockedApiPost).toHaveBeenCalledWith('/assignments/accept/order-1', {}, 'tok')
    );
    expect(mockedApiGet).toHaveBeenCalledWith('/transporter/jobs', 'tok', expect.anything());
  });

  it('verifies a delivery PIN through apiPost', async () => {
    mockedApiGet.mockResolvedValue([inTransitJob]);
    render(<TransporterAssignmentsTab transporterId="t1" accessToken="tok" />);

    expect(await screen.findByText('In Transit')).toBeTruthy();
    fireEvent.press(screen.getByText('In Transit'));
    fireEvent.press(await screen.findByText('Complete Delivery'));
    fireEvent.changeText(screen.getByPlaceholderText('1234'), '1234');
    fireEvent.press(screen.getByText('Verify & Complete'));

    await waitFor(() =>
      expect(mockedApiPost).toHaveBeenCalledWith('/assignments/a2/verify-pin', { pin: '1234' }, 'tok')
    );
  });

  it('patches status when marking a trip picked up', async () => {
    mockedApiGet.mockResolvedValue([
      {
        ...availableJob,
        id: 'a3',
        status: 'accepted',
        is_available_order: false,
        accepted_at: '2026-01-02T00:00:00.000Z',
        orders: { order_number: '3003' },
      },
    ]);
    render(<TransporterAssignmentsTab transporterId="t1" accessToken="tok" />);

    fireEvent.press(await screen.findByText('Accepted'));
    fireEvent.press(await screen.findByText('Mark as Picked Up'));

    await waitFor(() =>
      expect(mockedApiPatch).toHaveBeenCalledWith(
        '/assignments/a3',
        expect.objectContaining({ status: 'picked_up' }),
        'tok',
      )
    );
  });
});
