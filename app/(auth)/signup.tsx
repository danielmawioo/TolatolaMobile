import React from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import { GradientButton } from '@/components/GradientButton';
import { BackToHomeButton } from '@/components/BackToHomeButton';
import { ScreenSafeLayout } from '@/components/ScreenSafeLayout';
import { Theme } from '@/constants/Theme';
import { scaleByWidth, gap } from '@/constants/layout';
import { CountryCodePicker } from '@/components/CountryCodePicker';
import { useSignupForm, VENDOR_TYPES, type SignupUserType } from '@/src/hooks/useSignupForm';
import { ReferralCodeField } from '@/components/auth/ReferralCodeField';

export default function SignupScreen() {
  const params = useLocalSearchParams<{ role?: string; ref?: string }>();
  const initialRole: SignupUserType = (params.role === 'vendor' || params.role === 'transporter') ? params.role : 'customer';

  const {
    fullName, setFullName,
    phone, setPhone,
    countryCode, setCountryCode,
    email, setEmail,
    password, setPassword,
    userType, setUserType,
    vendorType, setVendorType,
    acceptedTerms, setAcceptedTerms,
    error, googleError,
    referrerName,
    referralCode,
    onReferralCodeChange,
    showReferralField, setShowReferralField,
    referralValidating,
    referralError,
    validateReferralCode,
    hasDeepLinkReferral,
    handleSignup,
    handleGoogleSignIn,
    isLoading,
    googleLoading,
    isAnyLoading,
  } = useSignupForm({ initialRole, initialReferralCode: params.ref });

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
          {referrerName ? (
            <View style={styles.referralBanner}>
              <Ionicons name="gift" size={16} color="#16a34a" style={{ marginRight: 6 }} />
              <Text style={styles.referralBannerText}>
                Referred by TOLA agent <Text style={{ fontWeight: '800' }}>{referrerName}</Text>
              </Text>
            </View>
          ) : null}
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
            editable={!isAnyLoading}
          />
        </View>

        <View style={styles.inputWrap}>
          <FontAwesome name="phone" size={20} color={Theme.textSecondary} style={styles.inputIcon} />
          <CountryCodePicker
            value={countryCode}
            onChange={setCountryCode}
            disabled={isAnyLoading}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor={Theme.textMuted}
            value={phone}
            onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
            keyboardType="phone-pad"
            editable={!isAnyLoading}
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
            secureTextEntry
            editable={!isAnyLoading}
          />
        </View>

        <ReferralCodeField
          referralCode={referralCode}
          onReferralCodeChange={onReferralCodeChange}
          showReferralField={showReferralField}
          setShowReferralField={setShowReferralField}
          referralValidating={referralValidating}
          referralError={referralError}
          referrerName={referrerName}
          validateReferralCode={validateReferralCode}
          hasDeepLinkReferral={hasDeepLinkReferral}
          isAnyLoading={isAnyLoading}
        />

        <Text style={styles.sectionLabel}>I want to:</Text>
        <View style={styles.roleRow}>
          {(['customer', 'vendor', 'transporter'] as const).map((type) => (
            <Pressable
              key={type}
              style={[styles.roleBtn, userType === type && styles.roleBtnActive]}
              onPress={() => setUserType(type)}
              disabled={isAnyLoading}
            >
              <Text style={[styles.roleLabel, userType === type && styles.roleLabelActive]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {userType === 'vendor' && (
          <View>
            <Text style={styles.sectionLabel}>Vendor Category:</Text>
            <View style={styles.vendorTypeRow}>
              {VENDOR_TYPES.map((type) => (
                <Pressable
                  key={type}
                  style={[styles.vendorTypeBtn, vendorType === type && styles.vendorTypeBtnActive]}
                  onPress={() => setVendorType(type)}
                  disabled={isAnyLoading}
                >
                  <Text style={[styles.vendorTypeLabel, vendorType === type && styles.vendorTypeLabelActive]}>
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Pressable
          style={styles.termsRow}
          onPress={() => setAcceptedTerms((v) => !v)}
          disabled={isAnyLoading}
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

        {error || googleError ? <Text style={styles.error}>{error || googleError}</Text> : null}

        <GradientButton
          title={googleLoading ? 'Signing up with Google...' : 'Create account'}
          onPress={handleSignup}
          loading={isAnyLoading}
          style={styles.button}
        />

        <View style={styles.dividerWrap}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or sign up with</Text>
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
    paddingHorizontal: gap.md,
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
    borderRadius: Theme.radiusMd,
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
  sectionLabel: { fontSize: 16, fontWeight: '600', color: Theme.text, marginTop: 8, marginBottom: 12 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    alignItems: 'center',
    backgroundColor: Theme.inputBg,
  },
  roleBtnActive: { backgroundColor: Theme.primary, borderColor: Theme.primary },
  roleLabel: { fontSize: 14, color: Theme.textSecondary },
  roleLabelActive: { color: '#fff', fontWeight: '600' },
  vendorTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  vendorTypeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    backgroundColor: Theme.inputBg,
  },
  vendorTypeBtnActive: { backgroundColor: Theme.primary, borderColor: Theme.primary },
  vendorTypeLabel: { fontSize: 12, color: Theme.textSecondary },
  vendorTypeLabelActive: { color: '#fff', fontWeight: '600' },
  logoWrap: { alignItems: 'center', marginBottom: 20 },
  logo: { width: scaleByWidth(80), height: scaleByWidth(80), borderRadius: 16 },
  referralBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
    alignSelf: 'center',
  },
  referralBannerText: {
    fontSize: 13,
    color: '#15803d',
    fontWeight: '500',
  },
});
