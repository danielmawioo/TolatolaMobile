import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useGoogleAuth } from '@/src/hooks/useGoogleAuth';
import { apiGet } from '@/src/services/api';
import { logger } from '@/src/lib/logger';
import { captureException } from '@/src/lib/errorTracking';

export type SignupUserType = 'customer' | 'vendor' | 'transporter';

/** Response shape from GET /agents/referral-info?code=... */
export interface ReferralInfo {
  agent_name?: string;
  [key: string]: unknown;
}

export const VENDOR_TYPES = ['Producer', 'Manufacturer', 'Supplier', 'Wholesaler', 'Retail trader'];

interface UseSignupFormParams {
  /** Initial role selected from the ?role= deep-link param, defaulting to 'customer'. */
  initialRole: SignupUserType;
  /** Referral code prefilled from the ?ref= deep-link param, if present. */
  initialReferralCode?: string;
}

/**
 * Owns all signup form state (fields, referral code lookup, validation) and the
 * signup/Google sign-in submission flows for app/(auth)/signup.tsx. Mirrors the
 * shape of useCheckoutSubmit/useCreateProductSubmit: the screen just wires this
 * hook's state/handlers to JSX.
 */
export function useSignupForm({ initialRole, initialReferralCode }: UseSignupFormParams) {
  const { signup, isLoading } = useAuth();
  const { signInWithGoogle, loading: googleLoading, error: googleError } = useGoogleAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+255');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<SignupUserType>(initialRole);
  const [vendorType, setVendorType] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referrerName, setReferrerName] = useState<string | null>(null);

  // Referral code manual entry state
  const [referralCode, setReferralCodeValue] = useState(initialReferralCode || '');
  const [showReferralField, setShowReferralField] = useState(!!initialReferralCode);
  const [referralValidating, setReferralValidating] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);

  const validateReferralCode = async (code: string) => {
    if (!code.trim()) {
      setReferrerName(null);
      setReferralError(null);
      return;
    }
    setReferralValidating(true);
    setReferralError(null);
    try {
      const res = await apiGet<ReferralInfo>(`/agents/referral-info?code=${code.trim()}`);
      if (res?.agent_name) {
        setReferrerName(res.agent_name);
        setReferralError(null);
      } else {
        setReferrerName(null);
        setReferralError('Msimbo wa rufaa si sahihi. Tafadhali angalia tena.');
      }
    } catch (err) {
      logger.warn('[SIGNUP] Failed to validate referral code:', err);
      captureException(err, { context: 'useSignupForm.validateReferralCode', code });
      setReferrerName(null);
    } finally {
      setReferralValidating(false);
    }
  };

  useEffect(() => {
    if (initialReferralCode) {
      validateReferralCode(initialReferralCode);
    }
    // Only re-run if the deep-link referral code itself changes.
  }, [initialReferralCode]);

  /** Handles typing in the manual referral code field: uppercases and clears stale validation state. */
  const handleReferralCodeChange = (text: string) => {
    setReferralCodeValue(text.toUpperCase());
    if (referrerName) setReferrerName(null);
    if (referralError) setReferralError(null);
  };

  const handleSignup = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields');
      return;
    }
    const cleanedPhone = phone.replace(/^0+/, '').replace(/\D/g, '');
    if (!cleanedPhone || cleanedPhone.length < 7) {
      setError('Please enter a valid phone number (at least 7 digits)');
      return;
    }
    if (!acceptedTerms) {
      setError('Please agree to the Terms and Privacy Policy');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      await signup({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: countryCode + cleanedPhone,
        userType,
        vendorType: userType === 'vendor' ? vendorType : undefined,
        referralCode: referralCode.trim() || initialReferralCode || undefined,
      });
      router.replace('/(auth)/sign-up-success');
    } catch (e) {
      logger.error('[SIGNUP] Signup failed:', e);
      captureException(e, { context: 'useSignupForm.handleSignup' });
      setError(e instanceof Error ? e.message : 'Sign up failed');
    }
  };

  const handleGoogleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    try {
      const user = await signInWithGoogle({
        userType,
        vendorType: userType === 'vendor' ? vendorType : undefined,
        referralCode: referralCode.trim() || initialReferralCode || undefined,
      });
      if (user) {
        // Since they signed up/logged in via Google, redirect to role-specific dashboard
        const { getRoleRedirectPath } = await import('@/src/lib/roleRedirect');
        router.replace(getRoleRedirectPath(user.user_type) as any);
      }
    } catch (e) {
      logger.error('[SIGNUP] Google sign-in failed:', e);
      captureException(e, { context: 'useSignupForm.handleGoogleSignIn' });
      setError(e instanceof Error ? e.message : 'Google sign-in failed');
    }
  };

  const isAnyLoading = isLoading || googleLoading;

  return {
    // Fields
    fullName, setFullName,
    phone, setPhone,
    countryCode, setCountryCode,
    email, setEmail,
    password, setPassword,
    userType, setUserType,
    vendorType, setVendorType,
    acceptedTerms, setAcceptedTerms,

    // Errors
    error, googleError,

    // Referral code
    referrerName,
    referralCode,
    onReferralCodeChange: handleReferralCodeChange,
    showReferralField, setShowReferralField,
    referralValidating,
    referralError,
    validateReferralCode,
    hasDeepLinkReferral: !!initialReferralCode,

    // Submission
    handleSignup,
    handleGoogleSignIn,
    isLoading,
    googleLoading,
    isAnyLoading,
  };
}
