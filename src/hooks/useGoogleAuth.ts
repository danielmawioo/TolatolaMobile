import { useState, useEffect, useCallback } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useAuth, type User, type Session } from '@/src/contexts/AuthContext';
import { apiPost } from '@/src/services/api';
import { GOOGLE_WEB_CLIENT_ID } from '@/src/config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_CREATED_KEY = '@tolatola/session_created_at';

export function useGoogleAuth() {
  const { setSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (GOOGLE_WEB_CLIENT_ID) {
      console.log('[GOOGLE_AUTH] Configuring GoogleSignin with webClientId:', GOOGLE_WEB_CLIENT_ID);
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: false,
      });
    } else {
      console.warn('[GOOGLE_AUTH] GOOGLE_WEB_CLIENT_ID is not configured in env variables!');
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<User | null> => {
    setLoading(true);
    setError(null);

    try {
      if (!GOOGLE_WEB_CLIENT_ID) {
        throw new Error('Google Sign-In is not configured (missing Web Client ID)');
      }

      // Check play services availability (Android only, no-op on iOS)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Trigger standard Google Sign-In sheet
      const result = await GoogleSignin.signIn();
      
      // In newer library versions, the output format is: { data: { idToken, ... } }
      // In older library versions, the output format is: { idToken, ... }
      const idToken = (result as any).data?.idToken || (result as any).idToken;

      if (!idToken) {
        throw new Error('Failed to retrieve ID Token from Google Sign-In response');
      }

      console.log('[GOOGLE_AUTH] Google Sign-In success. Communicating with backend...');

      // Call our backend endpoint POST /auth/google
      const response = await apiPost<{ user: User; session: Session }>('/auth/google', {
        id_token: idToken,
      });

      if (!response.session || !response.session.access_token) {
        throw new Error('Backend failed to return a valid session');
      }

      console.log('[GOOGLE_AUTH] Backend login verified. Saving session...');

      // Store the login timestamp for 30-day max session tracking
      await AsyncStorage.setItem(SESSION_CREATED_KEY, Date.now().toString());

      // Update globally shared session in AuthContext
      await setSession(response.session);

      return response.user;
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('[GOOGLE_AUTH] User cancelled Google Sign-In flow');
      } else if (err.code === statusCodes.IN_PROGRESS) {
        console.warn('[GOOGLE_AUTH] Google Sign-In already in progress');
        setError('Sign-in is already in progress');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.error('[GOOGLE_AUTH] Play services not available');
        setError('Google Play Services not available on this device');
      } else {
        const errMsg = err instanceof Error ? err.message : 'Google authentication failed';
        console.error('[GOOGLE_AUTH] Error signing in with Google:', err);
        setError(errMsg);
        throw err;
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [setSession]);

  return { signInWithGoogle, loading, error };
}
