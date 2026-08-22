import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';

interface Props {
  visible: boolean;
  error: string | null;
  onClose: () => void;
}

export function isAmountRangeError(error: string | null): boolean {
  if (!error) return false;
  const lower = error.toLowerCase();
  return lower.includes('amount must be between') || (lower.includes('500') && lower.includes('3000000'));
}

export function CheckoutErrorModal({ visible, error, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.errModalBg} onPress={onClose}>
        <Pressable style={styles.errModalCard}>
          {/* Red header strip */}
          <View style={styles.errModalHeader}>
            <View style={styles.errModalIconCircle}>
              <FontAwesome name="exclamation-triangle" size={28} color="#fff" />
            </View>
            <Text style={styles.errModalTitle}>Checkout Error</Text>
            <Text style={styles.errModalSubtitle}>We couldn't complete your request</Text>
          </View>

          {/* Body */}
          <View style={styles.errModalBody}>
            <Text style={styles.errModalMessage}>{error}</Text>

            {/* Show helpful tip for ClickPesa amount range errors */}
            {isAmountRangeError(error) && (
              <View style={styles.errModalTipCard}>
                <View style={styles.errModalTipHeader}>
                  <FontAwesome name="info-circle" size={16} color={Theme.primary} />
                  <Text style={styles.errModalTipTitle}>Payment Tip</Text>
                </View>
                <Text style={styles.errModalTipText}>
                  Our payment provider accepts amounts between{' '}
                  <Text style={styles.errModalTipBold}>TSh 500</Text> and{' '}
                  <Text style={styles.errModalTipBold}>TSh 3,000,000</Text>.{' '}
                  Try adjusting item quantities or splitting into multiple orders.
                </Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.errModalBtn,
                pressed && styles.errModalBtnPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
            >
              <Text style={styles.errModalBtnText}>Got It</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  errModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errModalCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 380,
    ...Theme.shadowLg,
  },
  errModalHeader: {
    backgroundColor: Theme.error,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
  },
  errModalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  errModalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  errModalBody: {
    padding: 24,
    gap: 20,
  },
  errModalMessage: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.text,
    lineHeight: 23,
    textAlign: 'center',
  },
  errModalTipCard: {
    backgroundColor: Theme.primary + '08',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Theme.primary + '18',
  },
  errModalTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errModalTipTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errModalTipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Theme.textSecondary,
    lineHeight: 20,
  },
  errModalTipBold: {
    fontWeight: '800',
    color: Theme.text,
  },
  errModalBtn: {
    backgroundColor: Theme.error,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    ...Theme.shadowMd,
  },
  errModalBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  errModalBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
});
