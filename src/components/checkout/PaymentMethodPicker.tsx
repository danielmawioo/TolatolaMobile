import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';
import {
  MOBILE_MONEY_PROVIDERS,
  CARD_PROVIDERS,
  BANK_PROVIDERS,
} from '@/src/constants/checkout';

interface Props {
  paymentMethod: string;
  setPaymentMethod: (m: string) => void;
  phoneNumber: string;
  setPhoneNumber: (p: string) => void;
  cardDetails: { number: string; expiry: string; cvv: string };
  setCardDetails: (c: { number: string; expiry: string; cvv: string }) => void;
}

export function PaymentMethodPicker({
  paymentMethod, setPaymentMethod,
  phoneNumber, setPhoneNumber,
  cardDetails, setCardDetails,
}: Props) {
  const [expandedSection, setExpandedSection] = React.useState<'mobile' | 'card' | 'bank' | null>('mobile');

  const isMobileMoney = MOBILE_MONEY_PROVIDERS.some(p => p.id === paymentMethod);
  const isCard = CARD_PROVIDERS.some(p => p.id === paymentMethod);
  const isBank = BANK_PROVIDERS.some(p => p.id === paymentMethod);

  const renderSection = (
    key: 'mobile' | 'card' | 'bank',
    icon: string,
    title: string,
    isActive: boolean,
  ) => (
    <Pressable
      style={[styles.sectionHeader, expandedSection === key && styles.sectionHeaderActive]}
      onPress={() => setExpandedSection(expandedSection === key ? null : key)}
    >
      <View style={styles.sectionHeaderLeft}>
        <FontAwesome name={icon as any} size={18} color={expandedSection === key ? '#fff' : Theme.text} />
        <Text style={[styles.sectionHeaderText, expandedSection === key && styles.sectionHeaderTextActive]}>
          {title}
        </Text>
      </View>
      {isActive && (
        <View style={styles.activeDot}>
          <FontAwesome name="check" size={8} color="#fff" />
        </View>
      )}
      <FontAwesome
        name={expandedSection === key ? 'chevron-up' : 'chevron-down'}
        size={12}
        color={expandedSection === key ? '#fff' : Theme.textMuted}
      />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Mobile Money */}
      {renderSection('mobile', 'mobile-phone', 'TOLA Pay (Mobile Money)', isMobileMoney)}
      {expandedSection === 'mobile' && (
        <View style={styles.sectionContent}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="e.g. 2557..."
              placeholderTextColor={Theme.textMuted}
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.providerGrid}>
            {MOBILE_MONEY_PROVIDERS.map((p) => (
              <Pressable
                key={p.id}
                style={[
                  styles.providerCard,
                  paymentMethod === p.id && styles.providerCardActive,
                  p.maintenance && styles.providerCardDisabled,
                ]}
                onPress={() => !p.maintenance && setPaymentMethod(p.id)}
                disabled={!!p.maintenance}
              >
                <View style={[styles.providerIcon, paymentMethod === p.id && styles.providerIconActive]}>
                  <FontAwesome name="mobile-phone" size={16} color={paymentMethod === p.id ? '#fff' : Theme.textMuted} />
                </View>
                <View style={styles.providerInfo}>
                  <View style={styles.providerNameRow}>
                    <Text style={styles.providerName}>{p.name}</Text>
                    {p.maintenance && <Text style={styles.maintenanceBadge}>Down</Text>}
                  </View>
                  <Text style={styles.providerSub}>{p.provider}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Card */}
      {renderSection('card', 'credit-card', 'Card Payment', isCard)}
      {expandedSection === 'card' && (
        <View style={styles.sectionContent}>
          <View style={styles.cardTypeRow}>
            {CARD_PROVIDERS.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.cardTypeBtn, paymentMethod === c.id && styles.cardTypeBtnActive]}
                onPress={() => setPaymentMethod(c.id)}
              >
                <FontAwesome name="credit-card" size={16} color={paymentMethod === c.id ? '#fff' : Theme.textMuted} />
                <Text style={[styles.cardTypeText, paymentMethod === c.id && styles.cardTypeTextActive]}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Card Number</Text>
            <TextInput
              style={styles.input} value={cardDetails.number}
              onChangeText={(t) => setCardDetails({ ...cardDetails, number: t })}
              placeholder="0000 0000 0000 0000" placeholderTextColor={Theme.textMuted}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Expiry</Text>
              <TextInput
                style={styles.input} value={cardDetails.expiry}
                onChangeText={(t) => setCardDetails({ ...cardDetails, expiry: t })}
                placeholder="MM/YY" placeholderTextColor={Theme.textMuted}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>CVV</Text>
              <TextInput
                style={styles.input} value={cardDetails.cvv}
                onChangeText={(t) => setCardDetails({ ...cardDetails, cvv: t })}
                placeholder="123" placeholderTextColor={Theme.textMuted}
                keyboardType="number-pad" secureTextEntry
              />
            </View>
          </View>
        </View>
      )}

      {/* Bank */}
      {renderSection('bank', 'university', 'Bank Transfer', isBank)}
      {expandedSection === 'bank' && (
        <View style={styles.sectionContent}>
          {BANK_PROVIDERS.map((b) => (
            <Pressable
              key={b.id}
              style={[styles.bankOption, paymentMethod === b.id && styles.bankOptionActive]}
              onPress={() => setPaymentMethod(b.id)}
            >
              <View style={[styles.bankIcon, paymentMethod === b.id && styles.bankIconActive]}>
                <FontAwesome name="university" size={14} color={paymentMethod === b.id ? '#fff' : Theme.textMuted} />
              </View>
              <Text style={[styles.bankText, paymentMethod === b.id && styles.bankTextActive]}>
                {b.name}
              </Text>
              {paymentMethod === b.id && <FontAwesome name="check-circle" size={16} color={Theme.primary} />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: Theme.backgroundSecondary, borderRadius: Theme.radiusMd,
  },
  sectionHeaderActive: { backgroundColor: Theme.primary },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionHeaderText: { fontSize: 15, fontWeight: '700', color: Theme.text },
  sectionHeaderTextActive: { color: '#fff' },
  activeDot: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: Theme.success,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionContent: { padding: 16, gap: 16 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', color: Theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    height: 48, backgroundColor: Theme.inputBg, borderRadius: Theme.radiusMd,
    borderWidth: 1, borderColor: Theme.inputBorder, paddingHorizontal: 14,
    fontSize: 15, color: Theme.text, fontWeight: '500',
  },
  row: { flexDirection: 'row', gap: gap.sm },
  halfField: { flex: 1, gap: 6 },
  providerGrid: { gap: 8 },
  providerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    borderRadius: Theme.radiusMd, borderWidth: 2, borderColor: Theme.inputBorder,
    backgroundColor: '#fff',
  },
  providerCardActive: { borderColor: Theme.primary, backgroundColor: Theme.primary + '08' },
  providerCardDisabled: { opacity: 0.5 },
  providerIcon: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: Theme.backgroundSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  providerIconActive: { backgroundColor: Theme.primary },
  providerInfo: { flex: 1 },
  providerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  providerName: { fontSize: 14, fontWeight: '700', color: Theme.text },
  providerSub: { fontSize: 10, fontWeight: '600', color: Theme.textMuted, textTransform: 'uppercase' },
  maintenanceBadge: {
    fontSize: 8, fontWeight: '800', color: '#b45309', backgroundColor: '#fef3c7',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, textTransform: 'uppercase',
  },
  cardTypeRow: { flexDirection: 'row', gap: 8 },
  cardTypeBtn: {
    flex: 1, alignItems: 'center', gap: 6, padding: 14,
    borderRadius: Theme.radiusMd, borderWidth: 2, borderColor: Theme.inputBorder,
  },
  cardTypeBtnActive: { borderColor: Theme.primary, backgroundColor: Theme.primary },
  cardTypeText: { fontSize: 10, fontWeight: '700', color: Theme.text, textTransform: 'uppercase' },
  cardTypeTextActive: { color: '#fff' },
  bankOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16,
    borderRadius: Theme.radiusMd, borderWidth: 2, borderColor: Theme.inputBorder,
    marginBottom: 8,
  },
  bankOptionActive: { borderColor: Theme.primary, backgroundColor: Theme.primary + '08' },
  bankIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Theme.backgroundSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  bankIconActive: { backgroundColor: Theme.primary },
  bankText: { flex: 1, fontSize: 14, fontWeight: '700', color: Theme.text },
  bankTextActive: { color: Theme.primary },
});
