import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { VendorKycGate } from '@/src/components/vendor/VendorKycGate';

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('VendorKycGate', () => {
  it('renders the registration prompt for status "missing"', () => {
    render(<VendorKycGate status="missing" vendor={{ id: 'v1' }} refreshing={false} onRefresh={jest.fn()} onLogout={jest.fn()} />);
    expect(screen.getByText('Vendor KYC Required')).toBeTruthy();
    expect(screen.getByText('Register as Vendor')).toBeTruthy();
  });

  it('renders the under-review message with the business name for status "pending"', () => {
    render(
      <VendorKycGate
        status="pending"
        vendor={{ id: 'v1', business_name: 'Asha Traders' }}
        refreshing={false}
        onRefresh={jest.fn()}
        onLogout={jest.fn()}
      />
    );
    expect(screen.getByText('KYC Under Review')).toBeTruthy();
    expect(screen.getByText(/Asha Traders/)).toBeTruthy();
  });

  it('renders the rejection reason for status "rejected"', () => {
    render(
      <VendorKycGate
        status="rejected"
        vendor={{ id: 'v1', business_name: 'Asha Traders', kyc_notes: 'ID photo unreadable' }}
        refreshing={false}
        onRefresh={jest.fn()}
        onLogout={jest.fn()}
      />
    );
    expect(screen.getByText('Application Rejected')).toBeTruthy();
    expect(screen.getByText('ID photo unreadable')).toBeTruthy();
  });

  it('calls onLogout when the logout button is pressed', () => {
    const onLogout = jest.fn();
    render(<VendorKycGate status="missing" vendor={{ id: 'v1' }} refreshing={false} onRefresh={jest.fn()} onLogout={onLogout} />);
    fireEvent.press(screen.getByText('Logout'));
    expect(onLogout).toHaveBeenCalled();
  });
});
