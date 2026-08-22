import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';

import { Theme } from '@/constants/Theme';
import { gap, scaleByWidth } from '@/constants/layout';
import { ScreenSafeLayout } from '@/components/ScreenSafeLayout';
import { BackToHomeButton } from '@/components/BackToHomeButton';
import { useAuth, hydrateProfileIntoSession, type Session } from '@/src/contexts/AuthContext';
import { apiPost } from '@/src/services/api';
import { AUTH_OTP_REQUEST_PATH, AUTH_OTP_VERIFY_PATH } from '@/src/config/env';
import { parseAuthEnvelope } from '@/src/lib/signupResponse';
import { resolvePostLoginDestination } from '@/src/lib/roleRedirect';

type Params = {
  phone?: string | string[];
  redirect?: string | string[];
  next?: string | string[];
  returnUrl?: string | string[];
  postVerify?: string | string[];
};

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return typeof v === 'string' ? v : v[0];
}

export default function OtpScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<Params>();
  const initialPhone = firstParam(params.phone) ?? '';
  const redirect = firstParam(params.redirect) ?? '/(tabs)';
  const nextAfterAuth = firstParam(params.next);
  const returnUrlAfterAuth = firstParam(params.returnUrl);
  const postVerify = firstParam(params.postVerify);
  const { session, setSession } = useAuth();

  const [phone, setPhone] = useState(initialPhone.replace(/^\+?255/, ''));
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const fullPhone = useMemo(() => {
    const trimmed = phone.replace(/\D/g, '');
    if (!trimmed) return '';
    return trimmed.startsWith('255') ? `+${trimmed}` : `+255${trimmed}`;
  }, [phone]);

  const canSend = useMemo(() => fullPhone.length >= 10, [fullPhone]);
  const canVerify = useMemo(() => canSend && code.trim().length >= 4, [canSend, code]);

  const handleSendOtp = useCallback(async () => {
    if (!canSend) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    setSending(true);
    try {
      await apiPost(
        AUTH_OTP_REQUEST_PATH,
        { phone: fullPhone },
        session?.access_token ?? null
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'We could not send the code. Please try again.'
      );
    } finally {
      setSending(false);
    }
  }, [canSend, fullPhone, session?.access_token]);

  const handleVerify = useCallback(async () => {
    if (!canVerify) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    setVerifying(true);
    try {
      const raw = await apiPost<unknown>(
        AUTH_OTP_VERIFY_PATH,
        { phone: fullPhone, code: code.trim() },
        session?.access_token ?? null
      );
      const bundle = parseAuthEnvelope(raw);
      if (bundle) {
        const base: Session = {
          access_token: bundle.session.access_token,
          refresh_token: bundle.session.refresh_token,
          expires_at: bundle.session.expires_at,
          user: bundle.user,
        };
        const hydrated = await hydrateProfileIntoSession(base);
        await setSession(hydrated);
        const dest =
          postVerify === '1'
            ? resolvePostLoginDestination({
                user: hydrated.user as Record<string, unknown>,
                redirect: firstParam(params.redirect),
                next: nextAfterAuth,
                returnUrl: returnUrlAfterAuth,
              })
            : redirect;
        router.replace(dest as Parameters<typeof router.replace>[0]);
        return;
      }
      router.replace(redirect as Parameters<typeof router.replace>[0]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'The code was not accepted. Check and try again.'
      );
    } finally {
      setVerifying(false);
    }
  }, [
    canVerify,
    fullPhone,
    code,
    redirect,
    session?.access_token,
    setSession,
    postVerify,
    params.redirect,
    nextAfterAuth,
    returnUrlAfterAuth,
  ]);

  return (
    <ScreenSafeLayout style={styles.safeWrapper}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + scaleByWidth(8), paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BackToHomeButton />
          <Text style={styles.title}>Verify your phone</Text>
          <Text style={styles.subtitle}>
            For extra security, TOLA occasionally asks you to confirm your phone number with a
            one-time code sent by SMS.
          </Text>

          <View style={styles.inputWrap}>
            <FontAwesome
              name="phone"
              size={20}
              color={Theme.textSecondary}
              style={styles.inputIcon}
            />
            <Text style={styles.prefix}>+255</Text>
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor={Theme.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <Pressable
            style={[styles.actionBtn, !canSend && styles.actionBtnDisabled]}
            disabled={!canSend || sending}
            onPress={handleSendOtp}
          >
            <Text style={styles.actionBtnText}>
              {sending ? 'Sending code…' : 'Send code'}
            </Text>
          </Pressable>

          <View style={styles.codeBlock}>
            <Text style={styles.codeLabel}>Enter code</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="6-digit code"
              placeholderTextColor={Theme.textMuted}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.verifyBtn, !canVerify && styles.verifyBtnDisabled]}
            disabled={!canVerify || verifying}
            onPress={handleVerify}
          >
            <Text style={styles.verifyBtnText}>
              {verifying ? 'Verifying…' : 'Verify & continue'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenSafeLayout>
  );
}

const styles = StyleSheet.create({
  safeWrapper: { width: '100%' },
  container: { flex: 1, width: '100%', backgroundColor: Theme.background },
  scrollView: { flex: 1, width: '100%' },
  scrollContent: {
    paddingHorizontal: gap.md,
    width: '100%',
    flexGrow: 1,
  },
  title: {
    fontSize: scaleByWidth(26),
    fontWeight: '700',
    color: Theme.text,
    textAlign: 'left',
    marginTop: scaleByWidth(16),
    marginBottom: scaleByWidth(8),
  },
  subtitle: {
    fontSize: scaleByWidth(14),
    color: Theme.textSecondary,
    textAlign: 'left',
    marginBottom: scaleByWidth(24),
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.inputBg,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    borderRadius: Theme.radiusMd,
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  prefix: { fontSize: 16, color: Theme.textSecondary, marginRight: 4 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Theme.text,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Theme.radiusMd,
    backgroundColor: Theme.primary,
    marginBottom: 20,
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  codeBlock: { marginBottom: 16 },
  codeLabel: { fontSize: 14, fontWeight: '600', color: Theme.text, marginBottom: 6 },
  codeInput: {
    backgroundColor: Theme.inputBg,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    borderRadius: Theme.radiusMd,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 18,
    letterSpacing: 4,
    color: Theme.text,
  },
  error: { color: Theme.error, marginTop: 10, fontSize: 14 },
  verifyBtn: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Theme.radiusMd,
    backgroundColor: Theme.primary,
  },
  verifyBtnDisabled: { opacity: 0.5 },
  verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

