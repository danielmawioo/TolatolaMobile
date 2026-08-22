import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import SignupScreen from '@/app/(auth)/signup';
import { useAuth } from '@/src/contexts/AuthContext';
import { useGoogleAuth } from '@/src/hooks/useGoogleAuth';

jest.mock('@/src/services/api');

jest.mock('@/src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/src/hooks/useGoogleAuth', () => ({
  useGoogleAuth: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedUseGoogleAuth = useGoogleAuth as jest.Mock;

describe('SignupScreen', () => {
  let signup: jest.Mock;

  beforeEach(() => {
    signup = jest.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({ signup, isLoading: false });
    mockedUseGoogleAuth.mockReturnValue({ signInWithGoogle: jest.fn(), loading: false, error: null });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form and submits filled-in fields', async () => {
    render(<SignupScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Full Name'), 'Jane Doe');
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'jane@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.changeText(screen.getByPlaceholderText('Phone Number'), '712345678');

    fireEvent.press(screen.getByText('Create account'));

    await waitFor(() => expect(signup).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jane@example.com', fullName: 'Jane Doe' })
    ));
    expect(router.replace).toHaveBeenCalledWith('/(auth)/sign-up-success');
  });

  it('shows a validation error instead of submitting when the phone number is too short', async () => {
    render(<SignupScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Full Name'), 'Jane Doe');
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'jane@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.changeText(screen.getByPlaceholderText('Phone Number'), '123');

    fireEvent.press(screen.getByText('Create account'));

    await waitFor(() =>
      expect(screen.getByText('Please enter a valid phone number (at least 7 digits)')).toBeTruthy()
    );
    expect(signup).not.toHaveBeenCalled();
  });
});
