import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { VendorWalletTab } from '@/src/components/vendor/VendorWalletTab';
import { apiGet, apiPost } from '@/src/services/api';

jest.mock('@/src/services/api');

const mockedApiGet = apiGet as jest.Mock;
const mockedApiPost = apiPost as jest.Mock;

describe('VendorWalletTab', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows balances and an empty payout history', async () => {
    mockedApiGet.mockResolvedValueOnce({ balance: 50000, pendingBalance: 10000, payouts: [] });
    render(<VendorWalletTab vendorId="v1" accessToken="tok" />);

    await waitFor(() => expect(screen.getByText('TSh 50,000')).toBeTruthy());
    expect(screen.getByText('TSh 10,000')).toBeTruthy();
    expect(screen.getByText('No payouts yet')).toBeTruthy();
  });

  it('shows a fee breakdown as the amount is typed', async () => {
    mockedApiGet.mockResolvedValueOnce({ balance: 50000, pendingBalance: 0, payouts: [] });
    render(<VendorWalletTab vendorId="v1" accessToken="tok" />);
    await waitFor(() => screen.getByPlaceholderText('Enter amount'));

    fireEvent.changeText(screen.getByPlaceholderText('Enter amount'), '10000');
    expect(screen.getByText('- TSh 500')).toBeTruthy(); // 5% fee
    expect(screen.getByText('TSh 9,500')).toBeTruthy(); // net
  });

  it('validates the amount before submitting a payout', async () => {
    mockedApiGet.mockResolvedValueOnce({ balance: 5000, pendingBalance: 0, payouts: [] });
    render(<VendorWalletTab vendorId="v1" accessToken="tok" />);
    await waitFor(() => screen.getByPlaceholderText('Enter amount'));

    fireEvent.changeText(screen.getByPlaceholderText('Enter amount'), '99999');
    fireEvent.changeText(screen.getByPlaceholderText('e.g., +255 XXX XXX XXX'), '0754000000');
    fireEvent.press(screen.getAllByText('Request Payout')[1]);

    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it('submits a valid payout request', async () => {
    mockedApiGet.mockResolvedValueOnce({ balance: 50000, pendingBalance: 0, payouts: [] });
    mockedApiPost.mockResolvedValueOnce({ success: true });
    mockedApiGet.mockResolvedValueOnce({ balance: 40000, pendingBalance: 0, payouts: [{ id: 'p1', amount: 10000, status: 'pending', payment_method: 'airtel-money', created_at: new Date().toISOString() }] });

    render(<VendorWalletTab vendorId="v1" accessToken="tok" />);
    await waitFor(() => screen.getByPlaceholderText('Enter amount'));

    fireEvent.changeText(screen.getByPlaceholderText('Enter amount'), '10000');
    fireEvent.changeText(screen.getByPlaceholderText('e.g., +255 XXX XXX XXX'), '0754000000');
    fireEvent.press(screen.getAllByText('Request Payout')[1]);

    await waitFor(() =>
      expect(mockedApiPost).toHaveBeenCalledWith(
        '/vendors/v1/payouts',
        { amount: 10000, paymentMethod: 'airtel-money', paymentDetails: '0754000000' },
        'tok'
      )
    );
  });
});
