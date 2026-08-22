import React from 'react';
import { View, Text, ActivityIndicator, Modal, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';

interface Props {
  visible: boolean;
}

export function PaymentProcessingOverlay({ visible }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlayBg}>
        <View style={styles.overlayCard}>
          <View style={styles.overlayHeader}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.overlayTitle}>Processing Payment</Text>
          </View>
          <View style={styles.overlayBody}>
            <Text style={styles.overlayText}>
              Please wait while we process your payment...
            </Text>
            <View style={styles.overlaySecure}>
              <FontAwesome name="shield" size={14} color={Theme.success} />
              <Text style={styles.overlaySecureText}>Encrypted secure transaction</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  overlayCard: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', width: '100%', maxWidth: 360 },
  overlayHeader: {
    backgroundColor: Theme.primary, padding: 32, alignItems: 'center', gap: 16,
  },
  overlayTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  overlayBody: { padding: 24, gap: 16, alignItems: 'center' },
  overlayText: { fontSize: 14, color: Theme.textSecondary, textAlign: 'center', lineHeight: 22 },
  overlaySecure: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Theme.backgroundSecondary, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: Theme.radiusMd,
  },
  overlaySecureText: { fontSize: 11, fontWeight: '700', color: Theme.textSecondary, textTransform: 'uppercase' },
});
