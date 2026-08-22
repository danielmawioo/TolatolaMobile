import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';

interface ShopFilterPanelProps {
  locationQuery: string;
  onLocationChange: (value: string) => void;
  minPriceQuery: string;
  onMinPriceChange: (value: string) => void;
  maxPriceQuery: string;
  onMaxPriceChange: (value: string) => void;
  activeFilterCount: number;
  onApply: () => void;
  onReset: () => void;
}

/**
 * Expandable location + min/max price filter drawer shown under the shop
 * screen's header search bar.
 */
export function ShopFilterPanel({
  locationQuery,
  onLocationChange,
  minPriceQuery,
  onMinPriceChange,
  maxPriceQuery,
  onMaxPriceChange,
  activeFilterCount,
  onApply,
  onReset,
}: ShopFilterPanelProps) {
  return (
    <View style={styles.filtersPanel}>
      <View style={styles.filterRow}>
        <FontAwesome name="map-marker" size={14} color={Theme.primary} style={{ width: 18 }} />
        <TextInput
          style={styles.filterInput}
          placeholder="Filter by location (e.g. Dar es Salaam, Pwani...)"
          placeholderTextColor={Theme.textMuted}
          value={locationQuery}
          onChangeText={onLocationChange}
          returnKeyType="done"
        />
        {locationQuery.trim() !== '' && (
          <Pressable onPress={() => onLocationChange('')} style={{ padding: 4 }}>
            <FontAwesome name="times-circle" size={14} color={Theme.textMuted} />
          </Pressable>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={[styles.filterRow, { flex: 1 }]}>
          <FontAwesome name="money" size={13} color="#10B981" style={{ width: 18 }} />
          <TextInput
            style={styles.filterInput}
            placeholder="Min Price (TZS)"
            placeholderTextColor={Theme.textMuted}
            keyboardType="numeric"
            value={minPriceQuery}
            onChangeText={onMinPriceChange}
            returnKeyType="done"
          />
        </View>
        <View style={[styles.filterRow, { flex: 1 }]}>
          <FontAwesome name="money" size={13} color="#10B981" style={{ width: 18 }} />
          <TextInput
            style={styles.filterInput}
            placeholder="Max Price (TZS)"
            placeholderTextColor={Theme.textMuted}
            keyboardType="numeric"
            value={maxPriceQuery}
            onChangeText={onMaxPriceChange}
            returnKeyType="done"
          />
        </View>
      </View>
      <View style={styles.filterActions}>
        <Pressable style={[styles.filterBtn, { backgroundColor: Theme.primary }]} onPress={onApply}>
          <FontAwesome name="search" size={12} color="#fff" />
          <Text style={styles.filterBtnText}>Apply Filters</Text>
        </Pressable>
        {activeFilterCount > 0 && (
          <Pressable style={[styles.filterBtn, { backgroundColor: Theme.backgroundTertiary }]} onPress={onReset}>
            <Text style={[styles.filterBtnText, { color: Theme.textMuted }]}>Reset</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filtersPanel: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
  },
  filterInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Theme.textPrimary,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});
