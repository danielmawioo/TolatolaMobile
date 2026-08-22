import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AgentWalletTab } from '@/src/components/agent/AgentWalletTab';

jest.mock('@/src/services/api');

describe('AgentWalletTab', () => {
  const walletStats = {
    lifetimeEarnings: 1000,
    pendingBalance: 100,
    withdrawableBalance: 900,
    paidBalance: 0,
    commissions: [],
    withdrawals: [],
  };

  it('renders balances and opens the withdrawal modal', () => {
    render(
      <AgentWalletTab
        walletStats={walletStats}
        accessToken="token-123"
        agentPhone="0754000000"
        onWithdrawSuccess={jest.fn()}
      />
    );

    expect(screen.getByText('TZS 900')).toBeTruthy();

    fireEvent.press(screen.getByText('Kutoa Salio'));

    expect(screen.getByText('Namba ya Kupokea Fedha')).toBeTruthy();
  });
});
