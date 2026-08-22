import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';

import { Theme } from '@/constants/Theme';
import { gap, scaleByWidth } from '@/constants/layout';
import { ScreenSafeLayout } from '@/components/ScreenSafeLayout';
import { BackToHomeButton } from '@/components/BackToHomeButton';
import { useAuth, hydrateProfileIntoSession, type Session } from '@/src/contexts/AuthContext';
import { resendEmailVerification, submitEmailVerificationCode } from '@/src/api/authVerification';
import { resolvePostLoginDestination } from '@/src/lib/roleRedirect';
import { useLanguage } from '@/src/contexts/LanguageContext';

type Params = {
  email?: string | string[];
  redirect?: string | string[];
  next?: string | string[];
  returnUrl?: string | string[];
  postVerify?: string | string[];
};

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return typeof v === 'string' ? v : v[0];
}

function maskEmail(email: string): string {
  const t = email.trim();
  const at = t.indexOf('@');
  if (at <= 1) return t;
  const local = t.slice(0, at);
  const domain = t.slice(at);
  const show = local.slice(0, Math.min(2, local.length));
  return `${show}•••${domain}`;
}

const RESEND_SECONDS = 60;

export default function VerifyEmailScreen() {
  const insets = useSafeAreaInsets();
  const { pick } = useLanguage();
  const params = useLocalSearchParams<Params>();
  const emailParam = (firstParam(params.email) ?? '').trim().toLowerCase();
  const redirect = firstParam(params.redirect) ?? '/(tabs)';
  const nextAfterAuth = firstParam(params.next);
  const returnUrlAfterAuth = firstParam(params.returnUrl);
  const postVerify = firstParam(params.postVerify);

  const { session, setSession } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const token = session?.access_token ?? null;

  const canVerify = useMemo(() => emailParam.length > 3 && code.trim().length >= 4, [emailParam, code]);
  const canResend = useMemo(() => emailParam.length > 3 && resendIn === 0 && !resendBusy, [emailParam, resendIn, resendBusy]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const handleResend = useCallback(async () => {
    if (!canResend) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    setResendBusy(true);
    try {
      await resendEmailVerification(emailParam, token);
      setResendIn(RESEND_SECONDS);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : pick('Could not resend email. Try again later.', 'Haikuweza kutuma barua pepe tena.')
      );
    } finally {
      setResendBusy(false);
    }
  }, [canResend, emailParam, token, pick]);

  const handleVerify = useCallback(async () => {
    if (!canVerify) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    setVerifying(true);
    try {
      const bundle = await submitEmailVerificationCode(emailParam, code.trim(), token);
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

      const dest =
        postVerify === '1' && session?.user
          ? resolvePostLoginDestination({
              user: session.user as Record<string, unknown>,
              redirect: firstParam(params.redirect),
              next: nextAfterAuth,
              returnUrl: returnUrlAfterAuth,
            })
          : '/(auth)/login';
      router.replace(dest as Parameters<typeof router.replace>[0]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : pick('Invalid or expired code. Try again.', 'Nambari si sahihi au imekwisha muda.')
      );
    } finally {
      setVerifying(false);
    }
  }, [
    canVerify,
    code,
    emailParam,
    token,
    postVerify,
    params.redirect,
    nextAfterAuth,
    returnUrlAfterAuth,
    redirect,
    session?.user,
    setSession,
    pick,
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
          <Text style={styles.title}>
            {pick('Verify your email', 'Thibitisha barua pepe yako')}
          </Text>
          <Text style={styles.subtitle}>
            {pick(
              `Enter the code we sent to ${emailParam ? maskEmail(emailParam) : 'your email'}. Check spam if you do not see it.`,
              `Weka nambari tuliyotuma kwa ${emailParam ? maskEmail(emailParam) : 'barua pepe yako'}. Angalia spam ikiwa haionekani.`
            )}
          </Text>

          <View style={styles.inputWrap}>
            <FontAwesome name="envelope" size={20} color={Theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={emailParam}
              editable={false}
              placeholderTextColor={Theme.textMuted}
            />
          </View>

          <View style={styles.codeBlock}>
            <Text style={styles.codeLabel}>{pick('Verification code', 'Nambari ya uthibitisho')}</Text>
            <TextInput
              style={styles.codeInput}
              placeholder={pick('6-digit code', 'Nambari ya tarakimu 6')}
              placeholderTextColor={Theme.textMuted}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 8))}
              keyboardType="number-pad"
              maxLength={8}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.verifyBtn, !canVerify && styles.verifyBtnDisabled]}
            disabled={!canVerify || verifying}
            onPress={handleVerify}
          >
            <Text style={styles.verifyBtnText}>
              {verifying ? pick('Verifying…', 'Inathibitisha…') : pick('Verify & continue', 'Thibitisha na uendelee')}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.resendBtn, !canResend && styles.resendDisabled]}
            disabled={!canResend}
            onPress={handleResend}
          >
            <Text style={styles.resendText}>
              {resendBusy
                ? pick('Sending…', 'Inatuma…')
                : resendIn > 0
                  ? pick(`Resend in ${resendIn}s`, `Tuma tena baada ya ${resendIn}s`)
                  : pick('Resend code', 'Tuma nambari tena')}
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
  scrollContent: { paddingHorizontal: gap.md, width: '100%', flexGrow: 1 },
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
    lineHeight: scaleByWidth(20),
    marginBottom: scaleByWidth(20),
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: scaleByWidth(16),
    backgroundColor: Theme.backgroundSecondary,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: Theme.textMuted },
  codeBlock: { marginBottom: scaleByWidth(12) },
  codeLabel: { fontSize: 14, fontWeight: '600', color: Theme.text, marginBottom: 8 },
  codeInput: {
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    letterSpacing: 4,
    color: Theme.text,
  },
  error: { color: Theme.error, marginBottom: 12, fontSize: 14 },
  verifyBtn: {
    backgroundColor: Theme.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  verifyBtnDisabled: { opacity: 0.5 },
  verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendBtn: { marginTop: 20, alignItems: 'center', padding: 8 },
  resendDisabled: { opacity: 0.45 },
  resendText: { fontSize: 15, color: Theme.link, fontWeight: '600' },
});
