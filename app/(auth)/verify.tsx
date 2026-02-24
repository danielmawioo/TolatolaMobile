import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { GradientButton } from '@/components/GradientButton';
import { BackToHomeButton } from '@/components/BackToHomeButton';
import { ScreenSafeLayout } from '@/components/ScreenSafeLayout';
import { Theme } from '@/constants/Theme';
import { scaleByWidth } from '@/constants/layout';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 24;

export default function VerifyScreen() {
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [resendCountdown, setResendCountdown] = useState(RESEND_SECONDS);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const t = setInterval(() => {
      setResendCountdown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const maskedPhone = '+255 7XX XXX XXX';

  const handleChange = (value: string, index: number) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, CODE_LENGTH).split('');
      const next = [...code];
      digits.forEach((d, i) => {
        if (index + i < CODE_LENGTH) next[index + i] = d;
      });
      setCode(next);
      const nextFocus = Math.min(index + digits.length, CODE_LENGTH - 1);
      inputRefs.current[nextFocus]?.focus();
      return;
    }
    const next = [...code];
    next[index] = value.replace(/\D/g, '').slice(-1);
    setCode(next);
    if (value && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fullCode = code.join('');
  const canVerify = fullCode.length === CODE_LENGTH;

  const handleVerify = () => {
    if (!canVerify) return;
    // TODO: call API to verify OTP, then router.replace('/(tabs)');
    router.replace('/(tabs)');
  };

  const handleResend = () => {
    if (resendCountdown > 0) return;
    setResendCountdown(RESEND_SECONDS);
    setCode(Array(CODE_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
  };

  return (
    <ScreenSafeLayout>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackToHomeButton />
      <Text style={styles.title}>Enter verification code</Text>
      <Text style={styles.subtitle}>We sent a code to {maskedPhone}</Text>

      <View style={styles.codeRow}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(r) => { inputRefs.current[index] = r; }}
            style={styles.codeInput}
            value={digit}
            onChangeText={(v) => handleChange(v, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            selectTextOnFocus
          />
        ))}
      </View>

      <Pressable
        onPress={handleResend}
        disabled={resendCountdown > 0}
        style={styles.resendWrap}
      >
        <Text style={[styles.resendText, resendCountdown > 0 && styles.resendDisabled]}>
          Resend code {resendCountdown > 0 ? `in 00:${String(resendCountdown).padStart(2, '0')}` : ''}
        </Text>
      </Pressable>

      <GradientButton
        title="Verify"
        onPress={handleVerify}
        disabled={!canVerify}
        style={styles.button}
      />
      </ScrollView>
    </ScreenSafeLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: scaleByWidth(24),
    paddingBottom: scaleByWidth(40),
    backgroundColor: Theme.background,
  },
  title: {
    fontSize: scaleByWidth(28),
    fontWeight: '700',
    color: Theme.text,
    textAlign: 'center',
    marginBottom: scaleByWidth(12),
  },
  subtitle: {
    fontSize: scaleByWidth(15),
    color: Theme.textSecondary,
    textAlign: 'center',
    marginBottom: scaleByWidth(32),
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scaleByWidth(10),
    marginBottom: scaleByWidth(24),
  },
  codeInput: {
    width: scaleByWidth(48),
    height: scaleByWidth(52),
    borderWidth: 2,
    borderColor: Theme.inputBorder,
    borderRadius: scaleByWidth(10),
    fontSize: scaleByWidth(22),
    fontWeight: '600',
    textAlign: 'center',
    color: Theme.text,
  },
  resendWrap: { alignItems: 'center', marginBottom: scaleByWidth(28) },
  resendText: { fontSize: scaleByWidth(15), color: Theme.link },
  resendDisabled: { color: Theme.textMuted },
  button: {},
});
