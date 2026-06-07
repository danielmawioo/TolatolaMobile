import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { apiPost } from '@/src/services/api';
import { BackToHomeButton } from '@/components/BackToHomeButton';
import { ScreenSafeLayout } from '@/components/ScreenSafeLayout';
import { Theme } from '@/constants/Theme';
import { scaleByWidth, gap } from '@/constants/layout';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      <View style={styles.inputWrap}>
        <FontAwesome name="lock" size={20} color={Theme.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="New password"
          placeholderTextColor={Theme.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          editable={!loading}
        />
        <Pressable
          style={styles.eyeBtn}
          onPress={() => setShowPassword((v) => !v)}
          disabled={loading}
        >
          <FontAwesome
            name={showPassword ? 'eye-slash' : 'eye'}
            size={20}
            color={Theme.textSecondary}
          />
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Saving…' : 'Reset password'}</Text>
      </Pressable>
      </View>
    </ScreenSafeLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: scaleByWidth(24), paddingHorizontal: gap.md, backgroundColor: Theme.background },
  title: { fontSize: scaleByWidth(24), fontWeight: '700', color: Theme.text, marginBottom: scaleByWidth(8) },
  subtitle: { fontSize: scaleByWidth(15), color: Theme.textSecondary, marginBottom: scaleByWidth(24) },
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
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Theme.text,
  },
  eyeBtn: { padding: 8 },
  error: { color: Theme.error, marginBottom: scaleByWidth(12) },
  button: { backgroundColor: Theme.primary, paddingVertical: scaleByWidth(16), borderRadius: Theme.radiusMd, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: scaleByWidth(16), fontWeight: '600' },
});
