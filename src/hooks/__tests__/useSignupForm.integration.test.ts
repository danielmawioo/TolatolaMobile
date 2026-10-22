import { renderHook, act, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useSignupForm } from '@/src/hooks/useSignupForm';
import { useAuth } from '@/src/contexts/AuthContext';
import { useGoogleAuth } from '@/src/hooks/useGoogleAuth';
import { apiGet } from '@/src/services/api';
import { SignupInputSchema } from '@/src/schemas/auth';
import { ReferralInfoSchema } from '@/src/schemas/referral';

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

describe('useSignupForm integration (mocked api)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('runs referral lookup → Zod field validation → signup → success navigation end to end', async () => {
    const signup = jest.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({ signup, isLoading: false });
    mockedUseGoogleAuth.mockReturnValue({
      signInWithGoogle: jest.fn(),
      loading: false,
      error: null,
    });
    mockedApiGet.mockResolvedValueOnce({ agent_name: 'Agent Asha' });

    const { result } = renderHook(() => useSignupForm({ initialRole: 'customer' }));

    act(() => {
      result.current.setShowReferralField(true);
      result.current.onReferralCodeChange('tola-ag-9999');
    });
    expect(result.current.referralCode).toBe('TOLA-AG-9999');

    await act(async () => {
      await result.current.validateReferralCode(result.current.referralCode);
    });

    expect(mockedApiGet).toHaveBeenCalledWith(
      '/agents/referral-info?code=TOLA-AG-9999',
      undefined,
      ReferralInfoSchema,
    );
    expect(result.current.referrerName).toBe('Agent Asha');

    act(() => {
      result.current.setFullName('Jane Doe');
      result.current.setEmail('jane@example.com');
      result.current.setPassword('password123');
      result.current.setPhone('0712345678');
      result.current.setUserType('vendor');
      result.current.setVendorType('Retail trader');
    });

    const parsed = SignupInputSchema.safeParse({
      email: result.current.email.trim(),
      password: result.current.password,
      fullName: result.current.fullName.trim(),
    });
    expect(parsed.success).toBe(true);

    await act(async () => {
      await result.current.handleSignup();
    });

    expect(signup).toHaveBeenCalledWith({
      email: 'jane@example.com',
      password: 'password123',
      fullName: 'Jane Doe',
      phone: '+255712345678',
      userType: 'vendor',
      vendorType: 'Retail trader',
      referralCode: 'TOLA-AG-9999',
    });
    expect(router.replace).toHaveBeenCalledWith('/(auth)/sign-up-success');
    expect(result.current.error).toBeNull();
  });

  it('blocks signup when Zod rejects a short password and never calls the auth API', async () => {
    const signup = jest.fn();
    mockedUseAuth.mockReturnValue({ signup, isLoading: false });
    mockedUseGoogleAuth.mockReturnValue({
      signInWithGoogle: jest.fn(),
      loading: false,
      error: null,
    });

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
    expect(router.replace).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Password must be at least 6 characters');
  });

  it('prefills and validates a deep-link referral before the user submits', async () => {
    const signup = jest.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({ signup, isLoading: false });
    mockedUseGoogleAuth.mockReturnValue({
      signInWithGoogle: jest.fn(),
      loading: false,
      error: null,
    });
    mockedApiGet.mockResolvedValueOnce({ agent_name: 'Deep Link Agent' });

    const { result } = renderHook(() =>
      useSignupForm({ initialRole: 'customer', initialReferralCode: 'TOLA-DL-0001' })
    );

    await waitFor(() => expect(result.current.referrerName).toBe('Deep Link Agent'));
    expect(result.current.hasDeepLinkReferral).toBe(true);
    expect(result.current.showReferralField).toBe(true);

    act(() => {
      result.current.setFullName('Guest User');
      result.current.setEmail('guest@example.com');
      result.current.setPassword('password123');
      result.current.setPhone('712345678');
    });

    await act(async () => {
      await result.current.handleSignup();
    });

    expect(signup).toHaveBeenCalledWith(
      expect.objectContaining({ referralCode: 'TOLA-DL-0001' })
    );
  });
});
