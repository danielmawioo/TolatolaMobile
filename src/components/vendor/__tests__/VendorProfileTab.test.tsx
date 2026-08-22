import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { VendorProfileTab } from '@/src/components/vendor/VendorProfileTab';
import { apiPut } from '@/src/services/api';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/src/services/api');

const mockedApiPut = apiPut as jest.Mock;

describe('VendorProfileTab', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows read-only vendor info and a "Pending" KYC badge by default', () => {
    render(
      <VendorProfileTab
        vendor={{ id: 'v1', business_name: 'Asha Traders', kyc_status: 'submitted' }}
        accessToken="tok"
        userEmail="asha@example.com"
        onVendorUpdated={jest.fn()}
      />
    );
    expect(screen.getByText('Asha Traders')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
  });

  it('shows "Approved" when kyc_status is approved', () => {
    render(
      <VendorProfileTab vendor={{ id: 'v1', kyc_status: 'approved' }} accessToken="tok" userEmail={null} onVendorUpdated={jest.fn()} />
    );
    expect(screen.getByText('Approved')).toBeTruthy();
  });

  it('enters edit mode, saves, and calls onVendorUpdated on success', async () => {
    mockedApiPut.mockResolvedValueOnce({});
    const onVendorUpdated = jest.fn();
    render(
      <VendorProfileTab
        vendor={{ id: 'v1', business_name: 'Asha Traders' }}
        accessToken="tok"
        userEmail="asha@example.com"
        onVendorUpdated={onVendorUpdated}
      />
    );

    fireEvent.press(screen.getByText('Edit'));
    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => expect(onVendorUpdated).toHaveBeenCalledWith({
      business_name: 'Asha Traders',
      phone: '',
      description: '',
    }));
    expect(mockedApiPut).toHaveBeenCalledWith('/vendors/v1', expect.any(Object), 'tok');
  });
});
