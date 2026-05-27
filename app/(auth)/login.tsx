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
  Image,
} from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/src/contexts/AuthContext';
import { useGoogleAuth } from '@/src/hooks/useGoogleAuth';
import { GradientButton } from '@/components/GradientButton';
import { BackToHomeButton } from '@/components/BackToHomeButton';
import { ScreenSafeLayout } from '@/components/ScreenSafeLayout';
import { Theme } from '@/constants/Theme';
import { getRoleRedirectPath } from '@/src/lib/roleRedirect';
import { scaleByWidth, gap } from '@/constants/layout';

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const { signInWithGoogle, loading: googleLoading, error: googleError } = useGoogleAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter email and password');
      return;
    }
    try {
      const user = await login(email.trim(), password);
      router.replace(getRoleRedirectPath(user?.user_type) as any);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  const handleGoogleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        router.replace(getRoleRedirectPath(user.user_type) as any);
      }
    } catch (e: any) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed');
    }
  };

  const isAnyLoading = isLoading || googleLoading;

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
          <View style={styles.logoWrap}>
            <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
          </View>
        <Text style={styles.title}>Login</Text>

        <View style={styles.inputWrap}>
          <FontAwesome name="envelope" size={20} color={Theme.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email or Phone"
            placeholderTextColor={Theme.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isAnyLoading}
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
            secureTextEntry={!showPassword}
            editable={!isAnyLoading}
          />
          <Pressable
            style={styles.eyeBtn}
            onPress={() => setShowPassword((v) => !v)}
            disabled={isAnyLoading}
          >
            <FontAwesome
              name={showPassword ? 'eye-slash' : 'eye'}
              size={20}
              color={Theme.textSecondary}
            />
          </Pressable>
        </View>

        {error || googleError ? <Text style={styles.error}>{error || googleError}</Text> : null}

        <GradientButton
          title={googleLoading ? 'Signing in with Google...' : 'Log in'}
          onPress={handleLogin}
          loading={isAnyLoading}
          style={styles.button}
        />

        <Pressable style={styles.forgotWrap} onPress={() => router.push('/(auth)/forgot-password')} disabled={isAnyLoading}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Pressable>

        <View style={styles.dividerWrap}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialRow}>
          <Pressable 
            style={[styles.socialBtn, isAnyLoading && { opacity: 0.5 }]} 
            onPress={handleGoogleSignIn}
            disabled={isAnyLoading}
          >
            <Ionicons name="logo-google" size={28} color="#4285F4" />
            <Text style={styles.socialLabel}>Google</Text>
          </Pressable>
          <Pressable 
            style={[styles.socialBtn, isAnyLoading && { opacity: 0.5 }]} 
            onPress={() => { /* TODO: Facebook sign-in */ }}
            disabled={isAnyLoading}
          >
            <Ionicons name="logo-facebook" size={28} color="#1877F2" />
            <Text style={styles.socialLabel}>Facebook</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.signupWrap}
          onPress={() => router.push('/(auth)/signup')}
          disabled={isLoading}
        >
          <Text style={styles.signupText}>
            Don't have an account? <Text style={styles.signupLink}>Sign up</Text>
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
    paddingHorizontal: gap.md,
    width: '100%',
    flexGrow: 1,
  },
  title: {
    fontSize: scaleByWidth(28),
    fontWeight: '700',
    color: Theme.text,
    textAlign: 'center',
    marginBottom: scaleByWidth(28),
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
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Theme.text,
  },
  eyeBtn: { padding: 8 },
  error: { color: Theme.error, marginBottom: 12, fontSize: 14 },
  button: { marginTop: 8, marginBottom: 16 },
  forgotWrap: { alignItems: 'center', marginBottom: 24 },
  forgotText: { fontSize: 15, color: Theme.link },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Theme.inputBorder },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    color: Theme.textSecondary,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 28,
  },
  socialBtn: { alignItems: 'center', gap: 8 },
  socialLabel: { fontSize: 12, color: Theme.textSecondary },
  signupWrap: { alignItems: 'center' },
  signupText: { fontSize: 15, color: Theme.textSecondary },
  signupLink: { color: Theme.link, fontWeight: '600' },
  logoWrap: { alignItems: 'center', marginBottom: 20 },
  logo: { width: scaleByWidth(80), height: scaleByWidth(80), borderRadius: 16 },
});
