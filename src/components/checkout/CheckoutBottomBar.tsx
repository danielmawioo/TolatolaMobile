import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';

interface Props {
  total: number;
  itemCount: number;
  isLoading: boolean;
  disabled: boolean;
  submitLabel: string;
  paddingBottom: number;
  onSubmit: () => void;
}

export function CheckoutBottomBar({ total, itemCount, isLoading, disabled, submitLabel, paddingBottom, onSubmit }: Props) {
  return (
    <View style={[styles.bottomBar, { paddingBottom }]}>
      <View style={styles.bottomInfo}>
        <Text style={styles.bottomTotal}>TSh {total.toLocaleString()}</Text>
        <Text style={styles.bottomItems}>{itemCount} item(s)</Text>
      </View>
      <Pressable
        style={[styles.submitBtn, disabled && styles.submitBtnDisabled]}
        onPress={onSubmit}
        disabled={disabled}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.submitBtnText}>{submitLabel}</Text>
            <FontAwesome name="arrow-right" size={16} color="#fff" />
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Theme.background, paddingHorizontal: gap.md, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: Theme.inputBorder,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    ...Theme.shadowLg,
  },
  bottomInfo: { flex: 1 },
  bottomTotal: { fontSize: 18, fontWeight: '800', color: Theme.text },
  bottomItems: { fontSize: 11, color: Theme.textMuted, fontWeight: '600' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Theme.primary, paddingHorizontal: 28, paddingVertical: 18,
    borderRadius: 14, ...Theme.shadowLg,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
