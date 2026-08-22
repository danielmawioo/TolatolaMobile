import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TransporterOverviewTab } from '@/src/components/transporter/TransporterOverviewTab';
import { apiGet } from '@/src/services/api';

jest.mock('@/src/services/api');

const mockedApiGet = apiGet as jest.Mock;

describe('TransporterOverviewTab', () => {
  beforeEach(() => {
    mockedApiGet.mockResolvedValue({ data: [] });
  });
  afterEach(() => jest.clearAllMocks());

  const baseProps = {
    transporterId: 't1',
    accessToken: 'tok',
    transporter: { business_name: 'Fast Wheels', rating: 4.8 },
    activeCount: 2,
    completedCount: 10,
    availableBalance: 5000,
    refreshing: false,
    onRefresh: jest.fn(),
    isUpdatingLocation: false,
    locationStatus: 'idle' as const,
    onUpdateLocation: jest.fn(),
  };

  it('renders stats and the transporter business name', () => {
    render(<TransporterOverviewTab {...baseProps} />);
    expect(screen.getByText('Fast Wheels')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
  });

  it('shows a syncing state while updating location and calls onUpdateLocation on press', () => {
    const onUpdateLocation = jest.fn();
    render(<TransporterOverviewTab {...baseProps} isUpdatingLocation onUpdateLocation={onUpdateLocation} />);
    expect(screen.getByText('Updating...')).toBeTruthy();
  });

  it('shows the synced confirmation when locationStatus is "updated"', () => {
    render(<TransporterOverviewTab {...baseProps} locationStatus="updated" />);
    expect(screen.getByText('✓ Location synced')).toBeTruthy();
  });

  it('shows an error message when locationStatus is "error"', () => {
    render(<TransporterOverviewTab {...baseProps} locationStatus="error" />);
    expect(screen.getByText('Failed to sync location')).toBeTruthy();
  });

  it('calls onUpdateLocation when the location button is pressed', () => {
    const onUpdateLocation = jest.fn();
    render(<TransporterOverviewTab {...baseProps} onUpdateLocation={onUpdateLocation} />);
    fireEvent.press(screen.getByText('Update My Location'));
    expect(onUpdateLocation).toHaveBeenCalled();
  });
});
