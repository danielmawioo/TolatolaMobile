import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { apiPost } from '@/src/services/api';
import { BackToHomeButton } from '@/components/BackToHomeButton';
import { ScreenSafeLayout } from '@/components/ScreenSafeLayout';
import { Theme } from '@/constants/Theme';
import { scaleByWidth } from '@/constants/layout';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await apiPost('/auth/reset-password', { token: params.token, password });
      router.replace('/(auth)/login');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenSafeLayout>
      <View style={styles.container}>
        <BackToHomeButton />
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.subtitle}>Enter your new password.</Text>
      <TextInput
        style={styles.input}
        placeholder="New password"
        placeholderTextColor={Theme.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Saving…' : 'Reset password'}</Text>
      </Pressable>
      </View>
    </ScreenSafeLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: scaleByWidth(24), backgroundColor: Theme.background },
  title: { fontSize: scaleByWidth(24), fontWeight: '700', color: Theme.text, marginBottom: scaleByWidth(8) },
  subtitle: { fontSize: scaleByWidth(15), color: Theme.textSecondary, marginBottom: scaleByWidth(24) },
  input: { borderWidth: 1, borderColor: Theme.inputBorder, borderRadius: scaleByWidth(12), padding: scaleByWidth(14), fontSize: scaleByWidth(16), marginBottom: scaleByWidth(16), backgroundColor: Theme.inputBg, color: Theme.text },
  error: { color: Theme.error, marginBottom: scaleByWidth(12) },
  button: { backgroundColor: Theme.primary, paddingVertical: scaleByWidth(16), borderRadius: scaleByWidth(12), alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: scaleByWidth(16), fontWeight: '600' },
});
