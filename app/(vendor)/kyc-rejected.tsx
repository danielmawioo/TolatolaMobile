import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';

export default function VendorKycRejectedScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.iconWrap}>
        <FontAwesome name="times-circle" size={40} color={Theme.error} />
      </Text>
      <Text style={styles.title}>Verification needs attention</Text>
      <Text style={styles.body}>
        Your vendor verification was not approved. Please contact support or resubmit your documents from the web vendor portal if available.
      </Text>
      <Pressable style={styles.secondary} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.secondaryText}>Go to shop</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary, paddingHorizontal: 24 },
  iconWrap: { alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: Theme.text, marginBottom: 12, textAlign: 'center' },
  body: { fontSize: 15, color: Theme.textSecondary, lineHeight: 22, marginBottom: 28, textAlign: 'center' },
  secondary: {
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Theme.background,
  },
  secondaryText: { color: Theme.text, fontSize: 16, fontWeight: '600' },
});
