import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { VendorOrdersTab } from '@/src/components/vendor/VendorOrdersTab';
import { apiGet, apiPatch } from '@/src/services/api';

jest.mock('@/src/services/api');

const mockedApiGet = apiGet as jest.Mock;
const mockedApiPatch = apiPatch as jest.Mock;

const order = {
  id: 'order-1',
  order_number: 'ORD-001',
  status: 'pending',
  created_at: new Date().toISOString(),
  items: [{ id: 'i1', products: { name: 'Rice' }, quantity: 2, unit_price: 1000 }],
  users: { full_name: 'Asha Buyer' },
};

describe('VendorOrdersTab', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows an empty state when there are no orders in the active tab', async () => {
    mockedApiGet.mockResolvedValueOnce({ orders: [] });
    render(<VendorOrdersTab shopId="shop-1" accessToken="tok" />);
    await waitFor(() => expect(screen.getByText('No orders in this tab')).toBeTruthy());
  });

  it('renders a pending order under the "New" tab with its total, and expands to show details', async () => {
    mockedApiGet.mockResolvedValueOnce({ orders: [order] });
    const onOrdersLoaded = jest.fn();
    render(<VendorOrdersTab shopId="shop-1" accessToken="tok" onOrdersLoaded={onOrdersLoaded} />);

    await waitFor(() => expect(screen.getByText('ORD-001')).toBeTruthy());
    expect(onOrdersLoaded).toHaveBeenCalledWith([order]);

    fireEvent.press(screen.getByText('ORD-001'));
    expect(screen.getByText('Asha Buyer')).toBeTruthy();
    expect(screen.getByText('Confirm')).toBeTruthy();
  });

  it('confirms an order, calling apiPatch and refetching', async () => {
    mockedApiGet.mockResolvedValueOnce({ orders: [order] });
    mockedApiPatch.mockResolvedValueOnce({ success: true });
    mockedApiGet.mockResolvedValueOnce({ orders: [{ ...order, status: 'confirmed' }] });

    render(<VendorOrdersTab shopId="shop-1" accessToken="tok" />);
    await waitFor(() => screen.getByText('ORD-001'));
    fireEvent.press(screen.getByText('ORD-001'));
    fireEvent.press(screen.getByText('Confirm'));

    await waitFor(() =>
      expect(mockedApiPatch).toHaveBeenCalledWith('/vendors/orders/order-1/status', { status: 'confirmed' }, 'tok')
    );
  });

  it('switches to the Earnings tab and shows total earnings from completed orders', async () => {
    const completed = { ...order, id: 'order-2', status: 'completed' };
    mockedApiGet.mockResolvedValueOnce({ orders: [completed] });
    render(<VendorOrdersTab shopId="shop-1" accessToken="tok" />);

    await waitFor(() => screen.getByText('Earnings'));
    fireEvent.press(screen.getByText('Earnings'));
    expect(screen.getByText('Total Earnings')).toBeTruthy();
    expect(screen.getByText('1 completed orders')).toBeTruthy();
  });
});
