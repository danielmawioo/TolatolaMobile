import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import type { TransportMethod } from '@/src/constants/checkout';

interface Props {
  transportMethods: TransportMethod[];
  selectedTransportId: string;
  selectedMethodName: string;
  showPicker: boolean;
  onTogglePicker: () => void;
  onSelect: (transportId: string) => void;
}

export function TransportMethodPicker({
  transportMethods, selectedTransportId, selectedMethodName, showPicker, onTogglePicker, onSelect,
}: Props) {
  return (
    <>
      <Pressable style={styles.transportSelector} onPress={onTogglePicker}>
        <View style={styles.transportLeft}>
          <View style={styles.transportIcon}>
            <FontAwesome name="truck" size={20} color={Theme.primary} />
          </View>
          <View>
            <Text style={styles.transportLabel}>Delivery Method</Text>
            <Text style={styles.transportValue}>{selectedMethodName}</Text>
          </View>
        </View>
        <FontAwesome name="chevron-down" size={14} color={Theme.textMuted} />
      </Pressable>
      {showPicker && (
        <View style={styles.transportDropdown}>
          {transportMethods.map((method) => (
            <Pressable
              key={method.id}
              style={[styles.transportOption, selectedTransportId === method.id && styles.transportOptionActive]}
              onPress={() => onSelect(method.id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.transportOptionName}>{method.name}</Text>
                {method.description ? (
                  <Text style={styles.transportOptionDesc} numberOfLines={2}>{method.description}</Text>
                ) : null}
              </View>
              <View style={styles.transportRate}>
                <Text style={styles.transportRateText}>
                  {method.rate_per_km
                    ? `TSh ${method.rate_per_km.toLocaleString()}/KM`
                    : method.rate_per_kg
                    ? `TSh ${method.rate_per_kg.toLocaleString()}/KG`
                    : ''}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  transportSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Theme.background, borderRadius: 24,
    padding: 20, borderWidth: 1.5, borderColor: Theme.inputBorder, ...Theme.shadowLg,
  },
  transportLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  transportIcon: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: Theme.primary + '10',
    alignItems: 'center', justifyContent: 'center',
  },
  transportLabel: { fontSize: 10, fontWeight: '700', color: Theme.textMuted, textTransform: 'uppercase' },
  transportValue: { fontSize: 16, fontWeight: '800', color: Theme.text },
  transportDropdown: {
    backgroundColor: Theme.background, borderRadius: Theme.radiusMd,
    marginTop: 8, ...Theme.shadowMd, overflow: 'hidden',
  },
  transportOption: {
    padding: 16, borderBottomWidth: 1, borderBottomColor: Theme.inputBorder,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  transportOptionActive: { backgroundColor: Theme.primary + '08' },
  transportOptionName: { fontSize: 15, fontWeight: '700', color: Theme.text },
  transportOptionDesc: { fontSize: 12, color: Theme.textMuted, marginTop: 2 },
  transportRate: {
    backgroundColor: Theme.primary + '10', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
  },
  transportRateText: { fontSize: 10, fontWeight: '800', color: Theme.primary, textTransform: 'uppercase' },
});
