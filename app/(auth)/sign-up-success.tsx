import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { BackToHomeButton } from '@/components/BackToHomeButton';
import { ScreenSafeLayout } from '@/components/ScreenSafeLayout';
import { Theme } from '@/constants/Theme';
import { scaleByWidth } from '@/constants/layout';

export default function SignUpSuccessScreen() {
  return (
    <ScreenSafeLayout>
      <View style={styles.container}>
        <BackToHomeButton />
      <Text style={styles.title}>Account created</Text>
      <Text style={styles.message}>You can now log in with your email and password.</Text>
      <Pressable style={styles.button} onPress={() => router.replace('/(auth)/login')}>
        <Text style={styles.buttonText}>Log in</Text>
      </Pressable>
    </View>
    </ScreenSafeLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingTop: 24, backgroundColor: Theme.background },
  title: { fontSize: scaleByWidth(24), fontWeight: '700', color: Theme.text, textAlign: 'center', marginBottom: scaleByWidth(12) },
  message: { fontSize: scaleByWidth(16), color: Theme.textSecondary, textAlign: 'center', marginBottom: scaleByWidth(32) },
  button: { backgroundColor: Theme.primary, paddingVertical: scaleByWidth(16), borderRadius: scaleByWidth(12), alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: scaleByWidth(16), fontWeight: '600' },
});
