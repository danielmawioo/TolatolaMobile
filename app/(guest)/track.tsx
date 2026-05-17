import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { apiPost } from '@/src/services/api';
import { Theme } from '@/constants/Theme';

export default function TrackOrderScreen() {
  const insets = useSafeAreaInsets();
  const [trackingCode, setTrackingCode] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    setError(null);
    const code = trackingCode.trim().toUpperCase();
    const contactNorm = contact.trim();
    if (!code || !contactNorm) {
      setError('Please enter both tracking code and contact details.');
      return;
    }

    setLoading(true);
    try {
      await apiPost<{ success: boolean; message?: string }>('/tracking/request-otp', {
        tracking_code: code,
        contact: contactNorm,
      });
      router.push({
        pathname: '/(guest)/track/verify',
        params: { tracking_code: code, contact: contactNorm },
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP. Please check your tracking code and contact details.');
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconBox}>
              <FontAwesome name="search" size={28} color={Theme.primary} />
            </View>
            <Text style={styles.title}>Track your order</Text>
            <Text style={styles.subtitle}>
              Enter your tracking code and the phone number or email used for the order. We'll send a one-time code to verify.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tracking code or Order number</Text>
              <TextInput
                style={[styles.input, styles.monoInput]}
                placeholder="e.g. TDX-12345-6789"
                placeholderTextColor={Theme.textMuted}
                value={trackingCode}
                onChangeText={setTrackingCode}
                autoCapitalize="characters"
                maxLength={20}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone number or Email</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. +255 712 345 678 or name@email.com"
                placeholderTextColor={Theme.textMuted}
                value={contact}
                onChangeText={setContact}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {error && (
              <View style={styles.alert}>
                <FontAwesome name="exclamation-circle" size={16} color={Theme.error} />
                <Text style={styles.alertText}>{error}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                (loading || !trackingCode.trim() || !contact.trim()) && styles.buttonDisabled,
                pressed && { opacity: 0.8 },
              ]}
              onPress={handleSendOtp}
              disabled={loading || !trackingCode.trim() || !contact.trim()}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Send OTP</Text>
                  <FontAwesome name="arrow-right" size={16} color="#fff" />
                </>
              )}
            </Pressable>
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
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.text,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Theme.text,
  },
  monoInput: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textTransform: 'uppercase',
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
    gap: 8,
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
});
