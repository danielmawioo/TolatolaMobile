import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BusinessRolesSection } from '@/src/components/profile/BusinessRolesSection';
import { useAuth } from '@/src/contexts/AuthContext';

jest.mock('@/src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
}));

const mockedUseAuth = useAuth as jest.Mock;

describe('BusinessRolesSection', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('offers to become a seller/transporter when neither role has been applied for', () => {
    mockedUseAuth.mockReturnValue({ session: { user: {} }, switchRole: jest.fn() });
    render(<BusinessRolesSection />);

    expect(screen.getByText('Become a Seller')).toBeTruthy();
    expect(screen.getByText('Become a Transporter')).toBeTruthy();
  });

  it('shows the rejection reason and a Reapply action for a rejected vendor application', () => {
    mockedUseAuth.mockReturnValue({
      session: { user: { vendor: { kyc_status: 'rejected', kyc_notes: 'Missing documents' } } },
      switchRole: jest.fn(),
    });
    render(<BusinessRolesSection />);

    expect(screen.getByText('Missing documents')).toBeTruthy();
    expect(screen.getByText('Reapply')).toBeTruthy();
  });

  it('switches into the vendor dashboard when an approved seller taps the action button', async () => {
    const switchRole = jest.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({
      session: { user: { vendor: { kyc_status: 'approved' } } },
      switchRole,
    });
    render(<BusinessRolesSection />);

    await act(async () => {
      fireEvent.press(screen.getByText('Switch to Seller Dashboard'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(switchRole).toHaveBeenCalledWith('vendor');
    expect(router.push).toHaveBeenCalledWith('/(vendor)/dashboard');
  });
});
