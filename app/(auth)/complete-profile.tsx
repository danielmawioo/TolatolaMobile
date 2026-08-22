import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/src/contexts/AuthContext';
import { apiPatch } from '@/src/services/api';
import { resolvePostLoginDestination } from '@/src/lib/roleRedirect';
import { AuthScreenChrome } from '@/components/AuthScreenChrome';
import { ScreenSafeLayout } from '@/components/ScreenSafeLayout';
import { Theme } from '@/constants/Theme';
import { scaleByWidth } from '@/constants/layout';

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return typeof v === 'string' ? v : v[0];
}

type Choice = 'customer' | 'vendor' | 'transporter';

const CHOICES: { id: Choice; label: string; hint: string }[] = [
  { id: 'customer', label: 'Shopper', hint: 'Browse and buy on the marketplace' },
  { id: 'vendor', label: 'Vendor', hint: 'Sell products from your shop' },
  { id: 'transporter', label: 'Transporter', hint: 'Deliver orders and manage logistics' },
];

export default function CompleteProfileScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ next?: string | string[] }>();
  const next = firstParam(params.next);
  const { session, setSession, isLoading: authLoading } = useAuth();
  const [choice, setChoice] = useState<Choice>('customer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = session?.access_token;
  const userId = session?.user?.id;

  const onContinue = useCallback(async () => {
    if (!token || !userId) {
      setError('You need to be signed in to continue.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    setBusy(true);
    try {
      await apiPatch(`/users/${userId}`, { user_type: choice }, token);
      const mergedUser = { ...session!.user, user_type: choice };
      await setSession({
        ...session!,
        user: mergedUser,
      });
      const path = resolvePostLoginDestination({
        user: mergedUser as Record<string, unknown>,
        next,
      });
      router.replace(path as Parameters<typeof router.replace>[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile');
    } finally {
      setBusy(false);
    }
  }, [token, userId, choice, session, setSession, next]);

  if (authLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Theme.primary} />
      </View>
    );
  }

  if (!session || !token) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, paddingHorizontal: 24 }]}>
        <Text style={styles.title}>Sign in required</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.primaryBtnText}>Go to sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScreenSafeLayout style={styles.safe}>
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <AuthScreenChrome
          headline="Complete your profile"
          subtitle="Choose how you will use TOLA. You can contact support if you need a different account type."
        >
          {CHOICES.map((c) => {
            const selected = choice === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setChoice(c.id)}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                  {selected ? <View style={styles.radioInner} /> : null}
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionLabel}>{c.label}</Text>
                  <Text style={styles.optionHint}>{c.hint}</Text>
                </View>
              </Pressable>
            );
          })}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]}
            onPress={onContinue}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Continue</Text>
            )}
          </Pressable>
        </AuthScreenChrome>
      </View>
    </ScreenSafeLayout>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  container: { flex: 1, paddingHorizontal: scaleByWidth(20) },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.backgroundSecondary },
  title: { fontSize: 18, fontWeight: '700', color: Theme.text, marginBottom: 16, textAlign: 'center' },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    marginBottom: 10,
    backgroundColor: Theme.background,
  },
  optionSelected: { borderColor: Theme.primary, backgroundColor: Theme.inputBg },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Theme.inputBorder,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: Theme.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: Theme.primary },
  optionTextWrap: { flex: 1 },
  optionLabel: { fontSize: 16, fontWeight: '700', color: Theme.text },
  optionHint: { fontSize: 13, color: Theme.textSecondary, marginTop: 4, lineHeight: 18 },
  error: { color: Theme.error, fontSize: 14, marginBottom: 12, textAlign: 'center' },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: Theme.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
