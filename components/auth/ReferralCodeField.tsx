import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/Theme';

export interface ReferralCodeFieldProps {
  referralCode: string;
  onReferralCodeChange: (text: string) => void;
  showReferralField: boolean;
  setShowReferralField: (show: boolean) => void;
  referralValidating: boolean;
  referralError: string | null;
  referrerName: string | null;
  validateReferralCode: (code: string) => void | Promise<void>;
  hasDeepLinkReferral: boolean;
  isAnyLoading: boolean;
}

/** Optional referral-code entry block used by the signup screen. */
export function ReferralCodeField({
  referralCode,
  onReferralCodeChange,
  showReferralField,
  setShowReferralField,
  referralValidating,
  referralError,
  referrerName,
  validateReferralCode,
  hasDeepLinkReferral,
  isAnyLoading,
}: ReferralCodeFieldProps) {
  if (!showReferralField && !hasDeepLinkReferral) {
    return (
      <Pressable
        style={styles.referralToggleBtn}
        onPress={() => setShowReferralField(true)}
      >
        <Ionicons name="gift" size={14} color="#059669" style={{ marginRight: 6 }} />
        <Text style={styles.referralToggleText}>Una msimbo wa rufaa? (Have a referral code?)</Text>
      </Pressable>
    );
  }

  if (!showReferralField) return null;

  return (
    <View style={styles.referralFieldWrap}>
      <Text style={styles.referralFieldLabel}>
        Msimbo wa Rufaa (Referral Code)
        <Text style={{ fontWeight: '400', color: Theme.textMuted }}> — si lazima</Text>
      </Text>
      <View
        style={[
          styles.inputWrap,
          referrerName
            ? { borderColor: '#10b981', borderWidth: 1.5 }
            : referralError
              ? { borderColor: '#ef4444', borderWidth: 1.5 }
              : {},
          { marginBottom: 0 },
        ]}
      >
        <Ionicons
          name="gift"
          size={20}
          color={referrerName ? '#10b981' : Theme.textSecondary}
          style={styles.inputIcon}
        />
        <TextInput
          style={[styles.input, { letterSpacing: 2, textTransform: 'uppercase' }]}
          placeholder="Mfano: TOLA-AG-XXXX"
          placeholderTextColor={Theme.textMuted}
          value={referralCode}
          onChangeText={onReferralCodeChange}
          onBlur={() => validateReferralCode(referralCode)}
          autoCapitalize="characters"
          editable={!hasDeepLinkReferral && !isAnyLoading}
        />
        {referralValidating && (
          <View style={{ marginLeft: 8 }}>
            <Text style={{ fontSize: 10, color: Theme.textMuted }}>...</Text>
          </View>
        )}
        {!referralValidating && referrerName && (
          <Ionicons name="checkmark-circle" size={20} color="#10b981" style={{ marginLeft: 8 }} />
        )}
        {!referralValidating && referralError && (
          <Ionicons name="close-circle" size={20} color="#ef4444" style={{ marginLeft: 8 }} />
        )}
      </View>
      {referrerName ? (
        <Text style={styles.referralSuccessText}>Umependekezwa na wakala: {referrerName}</Text>
      ) : null}
      {referralError ? <Text style={styles.referralErrorText}>{referralError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  referralToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  referralToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  referralFieldWrap: {
    marginBottom: 16,
    gap: 6,
  },
  referralFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.text,
    marginBottom: 4,
  },
  referralSuccessText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
  },
  referralErrorText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '500',
    marginTop: 4,
  },
});
