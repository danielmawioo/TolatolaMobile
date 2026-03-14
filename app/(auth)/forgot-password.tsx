import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { apiPost } from '@/src/services/api';
import { BackToHomeButton } from '@/components/BackToHomeButton';
import { ScreenSafeLayout } from '@/components/ScreenSafeLayout';
import { Theme } from '@/constants/Theme';
import { scaleByWidth, gap } from '@/constants/layout';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Enter your email');
      return;
    }
    setLoading(true);
    try {
      await apiPost('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <ScreenSafeLayout>
        <View style={styles.container}>
          <BackToHomeButton />
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.message}>We sent a reset link to {email}.</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.buttonText}>Back to Log in</Text>
        </Pressable>
        </View>
      </ScreenSafeLayout>
    );
  }

  return (
    <ScreenSafeLayout>
      <View style={styles.container}>
        <BackToHomeButton />
      <Text style={styles.title}>Forgot password</Text>
      <Text style={styles.subtitle}>Enter your email to receive a reset link.</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={Theme.textMuted}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Sending…' : 'Send reset link'}</Text>
      </Pressable>
      </View>
    </ScreenSafeLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: scaleByWidth(24), paddingHorizontal: gap.md, backgroundColor: Theme.background },
  title: { fontSize: scaleByWidth(24), fontWeight: '700', color: Theme.text, marginBottom: scaleByWidth(8) },
  subtitle: { fontSize: scaleByWidth(15), color: Theme.textSecondary, marginBottom: scaleByWidth(24) },
  input: { borderWidth: 1, borderColor: Theme.inputBorder, borderRadius: Theme.radiusMd, padding: scaleByWidth(14), fontSize: scaleByWidth(16), marginBottom: scaleByWidth(16), backgroundColor: Theme.inputBg, color: Theme.text },
  error: { color: Theme.error, marginBottom: scaleByWidth(12) },
  button: { backgroundColor: Theme.primary, paddingVertical: scaleByWidth(16), borderRadius: Theme.radiusMd, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: scaleByWidth(16), fontWeight: '600' },
  message: { fontSize: scaleByWidth(15), color: Theme.textSecondary, textAlign: 'center', marginBottom: scaleByWidth(32) },
});
