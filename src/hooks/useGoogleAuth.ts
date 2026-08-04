import { useState, useEffect, useCallback } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuth, type User, type Session } from '@/src/contexts/AuthContext';
import { apiPost } from '@/src/services/api';
import { GOOGLE_WEB_CLIENT_ID, SUPABASE_URL } from '@/src/config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

const SESSION_CREATED_KEY = '@tolatola/session_created_at';

export interface GoogleAuthOptions {
  userType?: string;
  vendorType?: string;
  referralCode?: string;
}

export function useGoogleAuth() {
  const { setSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (GOOGLE_WEB_CLIENT_ID) {
      try {
        console.log('[GOOGLE_AUTH] Configuring GoogleSignin with webClientId:', GOOGLE_WEB_CLIENT_ID);
        GoogleSignin.configure({
          webClientId: GOOGLE_WEB_CLIENT_ID,
          offlineAccess: false,
        });
      } catch (err) {
        console.warn('[GOOGLE_AUTH] Error configuring GoogleSignin native module:', err);
      }
    }
  }, []);

  const signInWithBrowserFallback = async (options?: GoogleAuthOptions): Promise<User | null> => {
    console.log('[GOOGLE_AUTH] Attempting WebBrowser OAuth fallback...');
    if (!SUPABASE_URL) {
      throw new Error('Supabase URL is not configured for WebBrowser authentication');
    }

    const redirectUrl = Linking.createURL('/auth/callback');
    const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;

    const authResult = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

    if (authResult.type === 'success' && authResult.url) {
      const parsedUrl = new URL(authResult.url.replace('#', '?'));
      const accessToken = parsedUrl.searchParams.get('access_token');
      const refreshToken = parsedUrl.searchParams.get('refresh_token');
      const idToken = parsedUrl.searchParams.get('id_token');

      if (idToken) {
        const response = await apiPost<{ user: User; session: Session }>('/auth/google', {
          id_token: idToken,
          ...options,
        });

        if (response.session && response.session.access_token) {
          await AsyncStorage.setItem(SESSION_CREATED_KEY, Date.now().toString());
          await setSession(response.session);
          return response.user;
        }
      } else if (accessToken) {
        const session: Session = {
          access_token: accessToken,
          refresh_token: refreshToken || undefined,
          user: { id: '', email: '' },
        };
        await AsyncStorage.setItem(SESSION_CREATED_KEY, Date.now().toString());
        await setSession(session);
        return session.user;
      }
    } else if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
      console.log('[GOOGLE_AUTH] User closed browser auth session');
      return null;
    }

    throw new Error('Browser authentication did not return a valid session token');
  };

  const signInWithGoogle = useCallback(async (options?: GoogleAuthOptions): Promise<User | null> => {
    setLoading(true);
    setError(null);

    try {
      // If Web Client ID is set, try Native Google Sign-In first
      if (GOOGLE_WEB_CLIENT_ID) {
        try {
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          const result = await GoogleSignin.signIn();

          // Handle v11+ response structure where cancelled is returned as result.type
          if ((result as any).type === 'cancelled') {
            console.log('[GOOGLE_AUTH] User cancelled Google Sign-In flow');
            return null;
          }

          const idToken = (result as any).data?.idToken || (result as any).idToken;

          if (idToken) {
            console.log('[GOOGLE_AUTH] Google Sign-In success via native module. Communicating with backend...');
            const response = await apiPost<{ user: User; session: Session }>('/auth/google', {
              id_token: idToken,
              userType: options?.userType,
              vendorType: options?.vendorType,
              referralCode: options?.referralCode,
            });

            if (!response.session || !response.session.access_token) {
              throw new Error('Backend failed to return a valid session');
            }

            console.log('[GOOGLE_AUTH] Backend login verified. Saving session...');
            await AsyncStorage.setItem(SESSION_CREATED_KEY, Date.now().toString());
            await setSession(response.session);
            return response.user;
          }
        } catch (nativeErr: any) {
          if (nativeErr.code === statusCodes.SIGN_IN_CANCELLED) {
            console.log('[GOOGLE_AUTH] User cancelled Google Sign-In flow');
            return null;
          } else if (nativeErr.code === statusCodes.IN_PROGRESS) {
            console.warn('[GOOGLE_AUTH] Google Sign-In already in progress');
            setError('Sign-in is already in progress');
            return null;
          }
          console.warn('[GOOGLE_AUTH] Native Google Sign-In unavailable or failed. Trying WebBrowser fallback...', nativeErr?.message);
        }
      }

      // Fallback: Try WebBrowser OAuth if native is unavailable or failed
      return await signInWithBrowserFallback(options);
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : 'Google authentication failed';
      console.error('[GOOGLE_AUTH] Error signing in with Google:', err);
      setError(errMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setSession]);

  return { signInWithGoogle, loading, error };
}
