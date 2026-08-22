import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { TransporterAssignmentsTab } from '@/src/components/transporter/TransporterAssignmentsTab';
import { apiGet, apiPost, apiPatch } from '@/src/services/api';

jest.mock('@/src/services/api');

const mockedApiGet = apiGet as jest.Mock;
const mockedApiPost = apiPost as jest.Mock;
const mockedApiPatch = apiPatch as jest.Mock;

const availableTrip = {
  id: 'a1',
  order_id: 'o1',
  is_available_order: true,
  status: 'assigned',
  delivery_fee: 5000,
  shops: { name: 'Asha Shop' },
  orders: { order_number: 'ORD-1' },
};

const inTransitTrip = {
  id: 'a2',
  order_id: 'o2',
  status: 'in_transit',
  accepted_at: new Date().toISOString(),
  delivery_fee: 3000,
  shops: { name: 'Fast Shop' },
  orders: { order_number: 'ORD-2' },
};

describe('TransporterAssignmentsTab', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows an empty state with no trips', async () => {
    mockedApiGet.mockResolvedValueOnce({ assignments: [] });
    render(<TransporterAssignmentsTab transporterId="t1" accessToken="tok" />);
    await waitFor(() => expect(screen.getByText('No trips in this tab')).toBeTruthy());
  });

  it('renders an available trip and accepts it', async () => {
    mockedApiGet.mockResolvedValueOnce({ assignments: [availableTrip] });
    mockedApiPost.mockResolvedValueOnce({ success: true });
    mockedApiGet.mockResolvedValueOnce({ assignments: [{ ...availableTrip, status: 'accepted', is_available_order: false, accepted_at: new Date().toISOString() }] });

    render(<TransporterAssignmentsTab transporterId="t1" accessToken="tok" />);
    await waitFor(() => screen.getByText('Accept Cargo'));

    fireEvent.press(screen.getByText('Accept Cargo'));

    await waitFor(() => expect(mockedApiPost).toHaveBeenCalledWith('/assignments/accept/o1', {}, 'tok'));
  });

  it('switches to the In Transit tab and opens the PIN modal to complete delivery', async () => {
    mockedApiGet.mockResolvedValueOnce({ assignments: [inTransitTrip] });
    render(<TransporterAssignmentsTab transporterId="t1" accessToken="tok" />);

    await waitFor(() => screen.getByText('In Transit'));
    fireEvent.press(screen.getByText('In Transit'));

    fireEvent.press(screen.getByText('Complete Delivery'));
    expect(screen.getByText('Verify Delivery 📦')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('1234'), '1234');
    mockedApiPost.mockResolvedValueOnce({ success: true });
    mockedApiGet.mockResolvedValueOnce({ assignments: [] });
    fireEvent.press(screen.getByText('Verify & Complete'));

    await waitFor(() =>
      expect(mockedApiPost).toHaveBeenCalledWith('/assignments/a2/verify-pin', { pin: '1234' }, 'tok')
    );
  });

  it('marks a picked-up trip as in transit', async () => {
    const pickedUp = { ...inTransitTrip, id: 'a3', status: 'picked_up' };
    mockedApiGet.mockResolvedValueOnce({ assignments: [pickedUp] });
    mockedApiPatch.mockResolvedValueOnce({ success: true });
    mockedApiGet.mockResolvedValueOnce({ assignments: [{ ...pickedUp, status: 'in_transit' }] });

    render(<TransporterAssignmentsTab transporterId="t1" accessToken="tok" />);
    await waitFor(() => screen.getByText('In Transit'));
    fireEvent.press(screen.getByText('In Transit'));

    fireEvent.press(screen.getByText('Start Delivery'));

    await waitFor(() =>
      expect(mockedApiPatch).toHaveBeenCalledWith('/assignments/a3', expect.objectContaining({ status: 'in_transit' }), 'tok')
    );
  });
});
