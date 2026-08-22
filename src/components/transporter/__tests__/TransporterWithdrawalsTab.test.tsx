import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { TransporterWithdrawalsTab } from '@/src/components/transporter/TransporterWithdrawalsTab';
import { apiGet, apiPost } from '@/src/services/api';

jest.mock('@/src/services/api');

const mockedApiGet = apiGet as jest.Mock;
const mockedApiPost = apiPost as jest.Mock;

describe('TransporterWithdrawalsTab', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows the balance from finance-summary and an empty history', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/transporters/withdrawals') return Promise.resolve({ withdrawals: [] });
      if (path === '/transporter/finance-summary') return Promise.resolve({ withdrawable_balance: 25000 });
      return Promise.resolve(null);
    });

    render(<TransporterWithdrawalsTab transporterId="t1" accessToken="tok" availableBalance={0} />);

    await waitFor(() => expect(screen.getByText('TSh 25,000')).toBeTruthy());
    expect(screen.getByText('No withdrawal requests yet')).toBeTruthy();
  });

  it('shows a service-fee breakdown once an amount is entered', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/transporters/withdrawals') return Promise.resolve({ withdrawals: [] });
      if (path === '/transporter/finance-summary') return Promise.resolve({ withdrawable_balance: 100000 });
      return Promise.resolve(null);
    });

    render(<TransporterWithdrawalsTab transporterId="t1" accessToken="tok" availableBalance={0} />);
    await waitFor(() => screen.getByPlaceholderText('Enter amount'));

    fireEvent.changeText(screen.getByPlaceholderText('Enter amount'), '10000');
    expect(screen.getByText('- TSh 1,000')).toBeTruthy(); // 10% fee
    expect(screen.getByText('TSh 9,000')).toBeTruthy(); // net
  });

  it('requires a payment method and phone before submitting', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/transporters/withdrawals') return Promise.resolve({ withdrawals: [] });
      if (path === '/transporter/finance-summary') return Promise.resolve({ withdrawable_balance: 100000 });
      return Promise.resolve(null);
    });

    render(<TransporterWithdrawalsTab transporterId="t1" accessToken="tok" availableBalance={0} />);
    await waitFor(() => screen.getByPlaceholderText('Enter amount'));

    fireEvent.changeText(screen.getByPlaceholderText('Enter amount'), '5000');
    fireEvent.press(screen.getAllByText('Request Withdrawal')[1]);

    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it('submits a valid withdrawal request', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/transporters/withdrawals') return Promise.resolve({ withdrawals: [] });
      if (path === '/transporter/finance-summary') return Promise.resolve({ withdrawable_balance: 100000 });
      return Promise.resolve(null);
    });
    mockedApiPost.mockResolvedValueOnce({ success: true });

    render(<TransporterWithdrawalsTab transporterId="t1" accessToken="tok" availableBalance={0} />);
    await waitFor(() => screen.getByPlaceholderText('Enter amount'));

    fireEvent.changeText(screen.getByPlaceholderText('Enter amount'), '10000');
    fireEvent.press(screen.getByText('Select method'));
    fireEvent.press(screen.getByText('Airtel Money'));
    fireEvent.changeText(screen.getByPlaceholderText('+255 XXX XXX XXX'), '0754000000');
    fireEvent.press(screen.getAllByText('Request Withdrawal')[1]);

    await waitFor(() =>
      expect(mockedApiPost).toHaveBeenCalledWith(
        '/transporters/withdrawals',
        { amount: 10000, payment_method: 'airtel-money', payment_details: { phone_number: '0754000000' } },
        'tok'
      )
    );
  });
});
