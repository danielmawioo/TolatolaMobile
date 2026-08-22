import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TransporterKycGate } from '@/src/components/transporter/TransporterKycGate';

describe('TransporterKycGate', () => {
  it('renders the registration prompt for status "missing"', () => {
    render(
      <TransporterKycGate status="missing" transporter={null} topInset={0} refreshing={false} onRefresh={jest.fn()} onLogout={jest.fn()} />
    );
    expect(screen.getByText('Transporter KYC Required')).toBeTruthy();
    expect(screen.getByText('Register as Transporter')).toBeTruthy();
  });

  it('renders the under-review message with the business name for status "pending"', () => {
    render(
      <TransporterKycGate
        status="pending"
        transporter={{ id: 't1', business_name: 'Fast Wheels' }}
        topInset={0}
        refreshing={false}
        onRefresh={jest.fn()}
        onLogout={jest.fn()}
      />
    );
    expect(screen.getByText('KYC Under Review')).toBeTruthy();
    expect(screen.getByText(/Fast Wheels/)).toBeTruthy();
  });

  it('renders the rejection reason for status "rejected"', () => {
    render(
      <TransporterKycGate
        status="rejected"
        transporter={{ id: 't1', kyc_notes: 'License expired' }}
        topInset={0}
        refreshing={false}
        onRefresh={jest.fn()}
        onLogout={jest.fn()}
      />
    );
    expect(screen.getByText('Application Rejected')).toBeTruthy();
    expect(screen.getByText('License expired')).toBeTruthy();
  });

  it('calls onLogout when the logout button is pressed', () => {
    const onLogout = jest.fn();
    render(
      <TransporterKycGate status="missing" transporter={null} topInset={0} refreshing={false} onRefresh={jest.fn()} onLogout={onLogout} />
    );
    fireEvent.press(screen.getByText('Logout'));
    expect(onLogout).toHaveBeenCalled();
  });
});
