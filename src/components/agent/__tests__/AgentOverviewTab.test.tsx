import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AgentOverviewTab } from '@/src/components/agent/AgentOverviewTab';

describe('AgentOverviewTab', () => {
  it('renders KPI stats and referral link without crashing', () => {
    render(
      <AgentOverviewTab
        agentProfile={{ agent_code: 'AG-42', users: { full_name: 'Asha' } }}
        dashboardStats={null}
        registrations={[{ id: '1', full_name: 'Vendor One', status: 'active', registration_type: 'vendor', created_at: '2024-01-01' }]}
        commissions={[{ id: '1', amount: 200, status: 'paid' }]}
        referralLink="https://tolatola.co/ref/AG-42"
        onSeeAllRegistrations={jest.fn()}
      />
    );

    expect(screen.getByText('Karibu, Asha')).toBeTruthy();
    expect(screen.getByText('https://tolatola.co/ref/AG-42')).toBeTruthy();
    expect(screen.getByText('Vendor One')).toBeTruthy();
  });
});
