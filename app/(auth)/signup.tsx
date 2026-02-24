import React, { useState } from 'react';
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
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';
import { GradientButton } from '@/components/GradientButton';
import { BackToHomeButton } from '@/components/BackToHomeButton';
import { ScreenSafeLayout } from '@/components/ScreenSafeLayout';
import { Theme } from '@/constants/Theme';
import { scaleByWidth } from '@/constants/layout';

export default function SignupScreen() {
  const { signup, isLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    setError(null);
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields');
      return;
    }
    if (!acceptedTerms) {
      setError('Please agree to the Terms and Privacy Policy');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      await signup({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        userType: 'customer',
      });
      router.replace('/(auth)/sign-up-success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign up failed');
    }
  };

  return (
    <ScreenSafeLayout style={styles.safeWrapper}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BackToHomeButton />
        <Text style={styles.title}>Sign up</Text>

        <View style={styles.inputWrap}>
          <FontAwesome name="user" size={20} color={Theme.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={Theme.textMuted}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            editable={!isLoading}
          />
        </View>

        <View style={styles.inputWrap}>
          <FontAwesome name="phone" size={20} color={Theme.textSecondary} style={styles.inputIcon} />
          <Text style={styles.prefix}>+255</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor={Theme.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!isLoading}
          />
        </View>

        <View style={styles.inputWrap}>
          <FontAwesome name="envelope" size={20} color={Theme.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Theme.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isLoading}
          />
        </View>

        <View style={styles.inputWrap}>
          <FontAwesome name="lock" size={20} color={Theme.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Theme.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />
        </View>

        <Pressable
          style={styles.termsRow}
          onPress={() => setAcceptedTerms((v) => !v)}
          disabled={isLoading}
        >
          <FontAwesome
            name={acceptedTerms ? 'check-square-o' : 'square-o'}
            size={22}
            color={Theme.primary}
            style={styles.checkbox}
          />
          <Text style={styles.termsText}>
            I agree to the{' '}
            <Text style={styles.termsLink}>Terms and Conditions</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <GradientButton
          title="Create account"
          onPress={handleSignup}
          loading={isLoading}
          style={styles.button}
        />

        <View style={styles.dividerWrap}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or sign up with</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialRow}>
          <Pressable style={styles.socialBtn} onPress={() => { /* TODO: Google sign-in */ }}>
            <Ionicons name="logo-google" size={28} color="#4285F4" />
            <Text style={styles.socialLabel}>Google</Text>
          </Pressable>
          <Pressable style={styles.socialBtn} onPress={() => { /* TODO: Facebook sign-in */ }}>
            <Ionicons name="logo-facebook" size={28} color="#1877F2" />
            <Text style={styles.socialLabel}>Facebook</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.loginWrap}
          onPress={() => router.back()}
          disabled={isLoading}
        >
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginLink}>Log in</Text>
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
    paddingTop: scaleByWidth(24),
    paddingBottom: scaleByWidth(40),
    width: '100%',
    flexGrow: 1,
  },
  title: {
    fontSize: scaleByWidth(28),
    fontWeight: '700',
    color: Theme.text,
    textAlign: 'center',
    marginBottom: 28,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.inputBg,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 12 },
  prefix: { fontSize: 16, color: Theme.textSecondary, marginRight: 4 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Theme.text,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 20,
  },
  checkbox: { marginRight: 10, marginTop: 2 },
  termsText: { flex: 1, fontSize: 14, color: Theme.textSecondary, lineHeight: 20 },
  termsLink: { color: Theme.link },
  error: { color: Theme.error, marginBottom: 12, fontSize: 14 },
  button: { marginBottom: 16 },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Theme.inputBorder },
  dividerText: { marginHorizontal: 12, fontSize: 14, color: Theme.textSecondary },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 24,
  },
  socialBtn: { alignItems: 'center', gap: 8 },
  socialLabel: { fontSize: 12, color: Theme.textSecondary },
  loginWrap: { alignItems: 'center' },
  loginText: { fontSize: 15, color: Theme.textSecondary },
  loginLink: { color: Theme.link, fontWeight: '600' },
});
