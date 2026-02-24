import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiPost } from '@/src/services/api';
import { Theme } from '@/constants/Theme';

const TRACKING_CODE_KEY = '@tolatola/tracking_code';
const TRACKING_PHONE_KEY = '@tolatola/tracking_phone';

/**
 * Track order – enter code & phone. POST tracking/request-otp.
 * On success → Track verify.
 */
export default function TrackEnterScreen() {
  const insets = useSafeAreaInsets();
  const [trackingCode, setTrackingCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOtp = async () => {
    setError(null);
    if (!trackingCode.trim() || !phoneNumber.trim()) {
      setError('Enter tracking code and phone number');
      return;
    }
    setLoading(true);
    try {
      await apiPost('/tracking/request-otp', {
        tracking_code: trackingCode.trim(),
        phone_number: phoneNumber.trim(),
      });
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(TRACKING_CODE_KEY, trackingCode.trim());
      await AsyncStorage.setItem(TRACKING_PHONE_KEY, phoneNumber.trim());
      router.push('/(guest)/track/verify');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
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
        },
      ]}
    >
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>Track order</Text>
      <Text style={styles.subtitle}>Enter your tracking code and phone number</Text>

      <TextInput
        style={styles.input}
        placeholder="Tracking code"
        placeholderTextColor={Theme.textMuted}
        value={trackingCode}
        onChangeText={setTrackingCode}
        autoCapitalize="characters"
      />
      <TextInput
        style={styles.input}
        placeholder="Phone number (e.g. 0712345678)"
        placeholderTextColor={Theme.textMuted}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRequestOtp}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Sending…' : 'Request code'}</Text>
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
  input: {
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: Theme.inputBg,
    color: Theme.text,
  },
  error: { color: Theme.error, marginBottom: 12 },
  button: {
    backgroundColor: Theme.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
