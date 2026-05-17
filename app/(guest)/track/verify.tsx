import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { apiPost } from '@/src/services/api';
import { Theme } from '@/constants/Theme';

const CODE_LENGTH = 6;
const MAX_ATTEMPTS = 5;

export default function TrackVerifyScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tracking_code: string; contact: string }>();
  
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleChange = (value: string, index: number) => {
    // If user pastes a full code, handle it
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, CODE_LENGTH).split('');
      const next = [...code];
      pasted.forEach((char, i) => {
        if (index + i < CODE_LENGTH) next[index + i] = char;
      });
      setCode(next);
      const nextFocus = Math.min(index + pasted.length, CODE_LENGTH - 1);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '');
    const next = [...code];
    next[index] = digit;
    setCode(next);
    
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fullCode = code.join('');

  const handleVerify = async () => {
    if (!params.tracking_code || !params.contact) {
      setError('Missing tracking session. Please request a new OTP.');
      return;
    }
    if (fullCode.length !== CODE_LENGTH) {
      setError('Please enter the 6-digit code.');
      return;
    }
    if (attempts >= MAX_ATTEMPTS) {
      setError(`Maximum attempts (${MAX_ATTEMPTS}) reached. Please request a new OTP from the track page.`);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await apiPost<{ success: boolean; token?: string; error?: string }>('/tracking/verify-otp', {
        tracking_code: params.tracking_code,
        contact: params.contact,
        otp: fullCode,
      });

      if (data.success && data.token) {
        router.replace({ pathname: '/(guest)/track/status', params: { token: data.token } });
      } else {
        const errMsg = data.error || 'Invalid or expired code.';
        setError(errMsg);
        setAttempts(a => a + 1);
      }
    } catch (err: any) {
      const msg = err?.message || 'Verification failed. Please try again.';
      setError(msg);
      setAttempts(a => a + 1);
    } finally {
      setLoading(false);
    }
  };

  if (!params.tracking_code || !params.contact) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Theme.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={16} color={Theme.textMuted} />
          <Text style={styles.backText}>Back to track order</Text>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconBox}>
              <FontAwesome name="shield" size={28} color={Theme.primary} />
            </View>
            <Text style={styles.title}>Enter verification code</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to the contact details you entered. It expires in 5 minutes.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.codeRow}>
              {code.map((d, i) => (
                <TextInput
                  key={i}
                  ref={(r) => { inputRefs.current[i] = r; }}
                  style={[styles.codeInput, d && styles.codeInputFilled]}
                  value={d}
                  onChangeText={(v) => handleChange(v, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={CODE_LENGTH}
                  selectTextOnFocus
                />
              ))}
            </View>

            {attempts > 0 && attempts < MAX_ATTEMPTS && (
              <Text style={styles.attemptsText}>
                Attempts: {attempts} / {MAX_ATTEMPTS}
              </Text>
            )}

            {error && (
              <View style={styles.alert}>
                <FontAwesome name="exclamation-circle" size={16} color={Theme.error} />
                <Text style={styles.alertText}>{error}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                (loading || fullCode.length !== CODE_LENGTH || attempts >= MAX_ATTEMPTS) && styles.buttonDisabled,
                pressed && { opacity: 0.8 },
              ]}
              onPress={handleVerify}
              disabled={loading || fullCode.length !== CODE_LENGTH || attempts >= MAX_ATTEMPTS}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify & view status</Text>
              )}
            </Pressable>
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>Didn't receive the code?</Text>
              <Pressable onPress={() => router.replace('/(guest)/track')}>
                <Text style={styles.footerLink}>Request again</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Theme.backgroundSecondary,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 14,
    color: Theme.textMuted,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Theme.shadowLg,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Theme.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Theme.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  codeInput: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    borderColor: Theme.inputBorder,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: Theme.text,
    backgroundColor: Theme.inputBg,
  },
  codeInputFilled: {
    borderColor: Theme.primary,
    backgroundColor: Theme.primary + '05',
  },
  attemptsText: {
    textAlign: 'center',
    fontSize: 13,
    color: Theme.textMuted,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.error + '10',
    padding: 12,
    borderRadius: 12,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: Theme.error,
    fontWeight: '500',
  },
  button: {
    backgroundColor: Theme.primary,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: Theme.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.primary,
  },
});
