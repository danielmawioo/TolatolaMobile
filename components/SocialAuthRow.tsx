import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as Google from 'expo-auth-session/providers/google';
import type { AuthSessionResult } from 'expo-auth-session';
import { useAuth, type User } from '@/src/contexts/AuthContext';
import {
  FACEBOOK_APP_ID,
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
  isFacebookLoginConfigured,
  isGoogleLoginConfigured,
} from '@/src/config/env';
import { Theme } from '@/constants/Theme';
import { scaleByWidth } from '@/constants/layout';
import { FacebookLogoMark } from '@/components/brand/FacebookLogoMark';
import { GoogleLogoMark } from '@/components/brand/GoogleLogoMark';

/** Facebook “f” button blue — Meta brand (commonly used for Continue with Facebook). */
const FACEBOOK_BLUE = '#1877F2';
/** Google neutral border / outline (Sign in with Google guidelines). */
const GOOGLE_OUTLINE = '#747775';
/** Google label text on light button. */
const GOOGLE_LABEL = '#1f1f1f';

type Props = {
  disabled?: boolean;
  onAuthenticated: (user: User) => void;
  onError: (message: string) => void;
};

function extractGoogleIdToken(result: AuthSessionResult): string | null {
  if (result.type !== 'success') return null;
  const fromParams = result.params.id_token;
  const fromAuth = (result.authentication as { idToken?: string } | null)?.idToken;
  const token = fromParams || fromAuth;
  return typeof token === 'string' && token.length > 0 ? token : null;
}

function GoogleAuthButton({
  disabled,
  onAuthenticated,
  onError,
  configured,
}: Props & { configured: boolean }) {
  const { loginWithGoogleIdToken } = useAuth();
  const handledUrlRef = useRef<string | null>(null);
  const processingRef = useRef(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
  });

  const runLogin = useCallback(
    async (idToken: string) => {
      const user = await loginWithGoogleIdToken(idToken);
      onAuthenticated(user);
    },
    [loginWithGoogleIdToken, onAuthenticated]
  );

  useEffect(() => {
    if (!response || response.type === 'opened' || response.type === 'locked') return;
    if (response.type === 'cancel' || response.type === 'dismiss') return;
    if (response.type === 'error') {
      const msg =
        typeof response.error === 'object' && response.error && 'message' in response.error
          ? String((response.error as { message?: string }).message)
          : 'Google sign-in failed';
      onError(msg);
      return;
    }
    if (response.type !== 'success') return;
    if (response.url && response.url === handledUrlRef.current) return;
    if (response.url) handledUrlRef.current = response.url;
    if (processingRef.current) return;

    const idToken = extractGoogleIdToken(response);
    if (!idToken) {
      onError('Could not read Google ID token. Try again.');
      return;
    }
    processingRef.current = true;
    runLogin(idToken)
      .catch((e) => onError(e instanceof Error ? e.message : 'Login failed'))
      .finally(() => {
        processingRef.current = false;
      });
  }, [response, onError, runLogin]);

  const onPressGoogle = () => {
    if (!configured) {
      onError('Google sign-in is not configured yet. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and rebuild.');
      return;
    }
    handledUrlRef.current = null;
    processingRef.current = false;
    promptAsync();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.googleBtn,
        pressed && styles.googleBtnPressed,
        (disabled || !request || !configured) && styles.btnDisabled,
      ]}
      disabled={disabled || !request || !configured}
      onPress={onPressGoogle}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
    >
      {!request ? (
        <ActivityIndicator size="small" color="#4285F4" />
      ) : (
        <>
          <GoogleLogoMark size={20} />
          <Text style={styles.googleLabel}>Google</Text>
        </>
      )}
    </Pressable>
  );
}

function FacebookAuthButton({
  disabled,
  onAuthenticated,
  onError,
  configured,
}: Props & { configured: boolean }) {
  const { loginWithFacebookAccessToken } = useAuth();

  const [request, , promptAsync] = Facebook.useAuthRequest({
    clientId: FACEBOOK_APP_ID,
  });

  const onPress = async () => {
    try {
      if (!configured) {
        onError('Facebook sign-in is not configured yet. Set EXPO_PUBLIC_FACEBOOK_APP_ID and rebuild.');
        return;
      }
      const res = await promptAsync();
      if (res.type === 'cancel' || res.type === 'dismiss') return;
      if (res.type === 'error') {
        onError('Facebook sign-in failed');
        return;
      }
      if (res.type !== 'success') return;
      const accessToken =
        res.params.access_token ||
        (res.authentication as { accessToken?: string } | null)?.accessToken;
      if (!accessToken) {
        onError('Could not read Facebook access token. Try again.');
        return;
      }
      const user = await loginWithFacebookAccessToken(accessToken);
      onAuthenticated(user);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.facebookBtn,
        pressed && styles.facebookBtnPressed,
        (disabled || !request || !configured) && styles.btnDisabled,
      ]}
      disabled={disabled || !request || !configured}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Continue with Facebook"
    >
      {!request ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <>
          <FacebookLogoMark size={22} />
          <Text style={styles.facebookLabel}>Facebook</Text>
        </>
      )}
    </Pressable>
  );
}

/**
 * Google / Facebook OAuth buttons with official brand styles.
 * Always renders both options so users can see available providers; when a provider
 * is not configured we keep the button disabled and return a clear setup message.
 */
export function SocialAuthRow(props: Props) {
  const googleConfigured = isGoogleLoginConfigured();
  const facebookConfigured = isFacebookLoginConfigured();

  return (
    <View style={styles.socialRow}>
      <GoogleAuthButton {...props} configured={googleConfigured} />
      <FacebookAuthButton {...props} configured={facebookConfigured} />
    </View>
  );
}

const styles = StyleSheet.create({
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 12,
    marginBottom: 28,
  },
  googleBtn: {
    flex: 1,
    minHeight: 48,
    maxHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GOOGLE_OUTLINE,
    ...Theme.shadowSm,
  },
  googleBtnPressed: { opacity: 0.92 },
  googleLabel: {
    fontSize: scaleByWidth(14),
    fontWeight: '600',
    color: GOOGLE_LABEL,
    letterSpacing: 0.15,
  },
  facebookBtn: {
    flex: 1,
    minHeight: 48,
    maxHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: FACEBOOK_BLUE,
    borderRadius: 8,
    ...Theme.shadowSm,
  },
  facebookBtnPressed: { opacity: 0.9 },
  facebookLabel: {
    fontSize: scaleByWidth(14),
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.15,
  },
  btnDisabled: { opacity: 0.55 },
});
