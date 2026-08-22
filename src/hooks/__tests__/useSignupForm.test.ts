import { renderHook, act, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useSignupForm } from '@/src/hooks/useSignupForm';
import { useAuth } from '@/src/contexts/AuthContext';
import { useGoogleAuth } from '@/src/hooks/useGoogleAuth';
import { apiGet } from '@/src/services/api';

jest.mock('@/src/services/api');

jest.mock('@/src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/src/hooks/useGoogleAuth', () => ({
  useGoogleAuth: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn() },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedUseGoogleAuth = useGoogleAuth as jest.Mock;
const mockedApiGet = apiGet as jest.Mock;

function setupAuthMocks(overrides: { signup?: jest.Mock; signInWithGoogle?: jest.Mock } = {}) {
  const signup = overrides.signup ?? jest.fn().mockResolvedValue(undefined);
  const signInWithGoogle = overrides.signInWithGoogle ?? jest.fn().mockResolvedValue(null);

  mockedUseAuth.mockReturnValue({ signup, isLoading: false });
  mockedUseGoogleAuth.mockReturnValue({ signInWithGoogle, loading: false, error: null });

  return { signup, signInWithGoogle };
}

function fillValidForm(result: { current: ReturnType<typeof useSignupForm> }) {
  act(() => {
    result.current.setFullName('Jane Doe');
    result.current.setEmail('jane@example.com');
    result.current.setPassword('password123');
    result.current.setPhone('712345678');
  });
}

describe('useSignupForm', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('submits a valid form and navigates to the success screen', async () => {
    const { signup } = setupAuthMocks();
    const { result } = renderHook(() => useSignupForm({ initialRole: 'customer' }));

    fillValidForm(result);

    await act(async () => {
      await result.current.handleSignup();
    });

    expect(signup).toHaveBeenCalledWith({
      email: 'jane@example.com',
      password: 'password123',
      fullName: 'Jane Doe',
      phone: '+255712345678',
      userType: 'customer',
      vendorType: undefined,
      referralCode: undefined,
    });
    expect(router.replace).toHaveBeenCalledWith('/(auth)/sign-up-success');
    expect(result.current.error).toBeNull();
  });

  it('rejects an invalid phone number without calling signup', async () => {
    const { signup } = setupAuthMocks();
    const { result } = renderHook(() => useSignupForm({ initialRole: 'customer' }));

    act(() => {
      result.current.setFullName('Jane Doe');
      result.current.setEmail('jane@example.com');
      result.current.setPassword('password123');
      result.current.setPhone('123'); // fewer than 7 digits
    });

    await act(async () => {
      await result.current.handleSignup();
    });

    expect(signup).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Please enter a valid phone number (at least 7 digits)');
  });

  it('rejects a password shorter than 6 characters without calling signup', async () => {
    const { signup } = setupAuthMocks();
    const { result } = renderHook(() => useSignupForm({ initialRole: 'customer' }));

    act(() => {
      result.current.setFullName('Jane Doe');
      result.current.setEmail('jane@example.com');
      result.current.setPassword('123');
      result.current.setPhone('712345678');
    });

    await act(async () => {
      await result.current.handleSignup();
    });

    expect(signup).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Password must be at least 6 characters');
  });

  it('rejects submission when required fields are missing', async () => {
    const { signup } = setupAuthMocks();
    const { result } = renderHook(() => useSignupForm({ initialRole: 'customer' }));

    await act(async () => {
      await result.current.handleSignup();
    });

    expect(signup).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Please fill in all required fields');
  });

  it('sets an error and does not navigate when the signup API call fails', async () => {
    const { signup } = setupAuthMocks({ signup: jest.fn().mockRejectedValue(new Error('Email already registered')) });
    const { result } = renderHook(() => useSignupForm({ initialRole: 'customer' }));

    fillValidForm(result);

    await act(async () => {
      await result.current.handleSignup();
    });

    expect(signup).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Email already registered');
  });

  it('looks up a referral code and reports the referring agent on success', async () => {
    setupAuthMocks();
    mockedApiGet.mockResolvedValueOnce({ agent_name: 'Agent Smith' });
    const { result } = renderHook(() => useSignupForm({ initialRole: 'customer' }));

    await act(async () => {
      await result.current.validateReferralCode('TOLA-AG-1234');
    });

    expect(mockedApiGet).toHaveBeenCalledWith('/agents/referral-info?code=TOLA-AG-1234');
    expect(result.current.referrerName).toBe('Agent Smith');
    expect(result.current.referralError).toBeNull();
    expect(result.current.referralValidating).toBe(false);
  });

  it('surfaces a referral error when the code is not found', async () => {
    setupAuthMocks();
    mockedApiGet.mockResolvedValueOnce({});
    const { result } = renderHook(() => useSignupForm({ initialRole: 'customer' }));

    await act(async () => {
      await result.current.validateReferralCode('BAD-CODE');
    });

    expect(result.current.referrerName).toBeNull();
    expect(result.current.referralError).toBe('Msimbo wa rufaa si sahihi. Tafadhali angalia tena.');
  });

  it('validates a referral code supplied via the deep-link ref param on mount', async () => {
    setupAuthMocks();
    mockedApiGet.mockResolvedValueOnce({ agent_name: 'Deep Link Agent' });

    const { result } = renderHook(() =>
      useSignupForm({ initialRole: 'vendor', initialReferralCode: 'TOLA-DL-0001' })
    );

    await waitFor(() => expect(result.current.referrerName).toBe('Deep Link Agent'));
    expect(mockedApiGet).toHaveBeenCalledWith('/agents/referral-info?code=TOLA-DL-0001');
    expect(result.current.hasDeepLinkReferral).toBe(true);
  });

  it('clears the referrer on a network/API failure while validating a referral code', async () => {
    setupAuthMocks();
    mockedApiGet.mockRejectedValueOnce(new Error('Network down'));
    const { result } = renderHook(() => useSignupForm({ initialRole: 'customer' }));

    await act(async () => {
      await result.current.validateReferralCode('TOLA-AG-1234');
    });

    expect(result.current.referrerName).toBeNull();
    expect(result.current.referralValidating).toBe(false);
  });
});
