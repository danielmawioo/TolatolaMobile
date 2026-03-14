import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost } from '@/src/services/api';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';

const TRACKING_CODE_KEY = '@tolatola/tracking_code';
const TRACKING_PHONE_KEY = '@tolatola/tracking_phone';
const CODE_LENGTH = 6;

export default function TrackVerifyScreen() {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    (async () => {
      const code = await AsyncStorage.getItem(TRACKING_CODE_KEY);
      const phone = await AsyncStorage.getItem(TRACKING_PHONE_KEY);
      setTrackingCode(code);
      setPhoneNumber(phone);
    })();
  }, []);

  const handleChange = (value: string, index: number) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const fullCode = code.join('');
  const handleVerify = async () => {
    if (fullCode.length !== CODE_LENGTH || !trackingCode || !phoneNumber) return;
    setError(null);
    setLoading(true);
    try {
      const data = await apiPost<{ token: string }>('/tracking/verify-otp', {
        tracking_code: trackingCode,
        phone_number: phoneNumber,
        otp: fullCode,
      });
      router.replace({ pathname: '/(guest)/track/status', params: { token: data.token } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: gap.md,
        },
      ]}
    >
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>Enter verification code</Text>
      <Text style={styles.subtitle}>
        We sent a code to {phoneNumber ? `+255 ${phoneNumber.slice(-3)} XXX XXX` : 'your phone'}
      </Text>

      <View style={styles.codeRow}>
        {code.map((d, i) => (
          <TextInput
            key={i}
            ref={(r) => { inputRefs.current[i] = r; }}
            style={styles.codeInput}
            value={d}
            onChangeText={(v) => handleChange(v, i)}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
          />
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, (loading || fullCode.length !== CODE_LENGTH) && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading || fullCode.length !== CODE_LENGTH}
      >
        <Text style={styles.buttonText}>{loading ? 'Verifying…' : 'Verify'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  back: { marginBottom: 24 },
  backText: { fontSize: 16, color: Theme.link },
  title: { fontSize: 24, fontWeight: '700', color: Theme.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: Theme.textSecondary, marginBottom: 24 },
  codeRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  codeInput: {
    width: 48,
    height: 52,
    borderWidth: 2,
    borderColor: Theme.inputBorder,
    borderRadius: Theme.radiusMd,
    fontSize: 20,
    textAlign: 'center',
    color: Theme.text,
  },
  error: { color: Theme.error, marginBottom: 12 },
  button: {
    backgroundColor: Theme.primary,
    paddingVertical: 16,
    borderRadius: Theme.radiusMd,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
