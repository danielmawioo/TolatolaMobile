import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';
import { TANZANIA_REGIONS, type AddressData } from '@/src/constants/checkout';
import { apiGet } from '@/src/services/api';

interface Props {
  value: AddressData;
  onChange: (address: AddressData) => void;
  onAddressComplete?: (fullAddress: string, coords?: { lat: number, lng: number }) => void;
}

export function TanzaniaAddressForm({ value, onChange, onAddressComplete }: Props) {
  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleField = (field: keyof AddressData, val: string) => {
    onChange({ ...value, [field]: val });
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await apiGet<any>(`/maps/autocomplete?input=${encodeURIComponent(text)}`);
      if (res && res.predictions) {
        setSuggestions(res.predictions);
      }
    } catch (error) {
      console.error('Autocomplete error', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSuggestion = async (placeId: string, description: string) => {
    setSearchQuery(description);
    setSuggestions([]);
    
    try {
      const res = await apiGet<any>(`/maps/place?placeId=${placeId}`);
      if (res && res.result) {
        const place = res.result;
        
        let region = '', district = '', ward = '', village = '', street = '';
        const streetParts: string[] = [];

        for (const component of place.address_components || []) {
          const types = component.types;
          if (types.includes("administrative_area_level_1")) {
            const regionName = component.long_name.replace(" Region", "");
            region = TANZANIA_REGIONS.find((r) => r.toLowerCase() === regionName.toLowerCase()) || regionName;
          } else if (types.includes("administrative_area_level_2")) {
            district = component.long_name.replace(" District", "");
          } else if (types.includes("administrative_area_level_3") || types.includes("sublocality_level_1")) {
            ward = component.long_name;
          } else if (types.includes("sublocality_level_2") || types.includes("neighborhood")) {
            village = component.long_name;
          } else if (types.includes("route")) {
            streetParts.push(component.long_name);
          } else if (types.includes("street_number")) {
            streetParts.unshift(component.short_name);
          }
        }

        street = streetParts.join(" ") || place.formatted_address?.split(",")[0] || "";
        
        onChange({
          country: 'Tanzania',
          region,
          district,
          ward,
          village,
          street
        });

        if (onAddressComplete && place.geometry?.location) {
          onAddressComplete(place.formatted_address, {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          });
        }
      }
    } catch (error) {
      console.error('Place details error', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <FontAwesome name="search" size={16} color={Theme.primary} />
        <Text style={styles.sectionTitle}>Address Search</Text>
      </View>
      <View style={{ zIndex: 10 }}>
        <TextInput
          style={styles.input}
          placeholder="Type to search location..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor={Theme.textMuted}
        />
        {suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map((item) => (
              <Pressable
                key={item.place_id}
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(item.place_id, item.description)}
              >
                <FontAwesome name="map-marker" size={14} color={Theme.textMuted} style={{ marginRight: 8 }} />
                <Text style={styles.suggestionText} numberOfLines={1}>{item.description}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.sectionHeader}>
        <FontAwesome name="map-marker" size={16} color={Theme.textMuted} />
        <Text style={styles.sectionTitle}>Manual Entry</Text>
      </View>

      {/* Region Picker */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Region *</Text>
        <Pressable
          style={styles.pickerBtn}
          onPress={() => setShowRegionPicker(!showRegionPicker)}
        >
          <Text style={value.region ? styles.pickerText : styles.pickerPlaceholder}>
            {value.region || 'Select Region'}
          </Text>
          <FontAwesome name="chevron-down" size={12} color={Theme.textMuted} />
        </Pressable>
        {showRegionPicker && (
          <ScrollView style={styles.dropdown} nestedScrollEnabled>
            {TANZANIA_REGIONS.map((region) => (
              <Pressable
                key={region}
                style={[styles.dropdownItem, value.region === region && styles.dropdownItemActive]}
                onPress={() => { handleField('region', region); setShowRegionPicker(false); }}
              >
                <Text style={[styles.dropdownText, value.region === region && styles.dropdownTextActive]}>
                  {region}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.label}>District *</Text>
          <TextInput
            style={styles.input}
            value={value.district}
            onChangeText={(t) => handleField('district', t)}
            placeholder="e.g., Kinondoni"
            placeholderTextColor={Theme.textMuted}
          />
        </View>
        <View style={styles.halfField}>
          <Text style={styles.label}>Ward *</Text>
          <TextInput
            style={styles.input}
            value={value.ward}
            onChangeText={(t) => handleField('ward', t)}
            placeholder="e.g., Masaki"
            placeholderTextColor={Theme.textMuted}
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Street / Building *</Text>
        <TextInput
          style={styles.input}
          value={value.street}
          onChangeText={(t) => handleField('street', t)}
          placeholder="e.g., Samora Ave"
          placeholderTextColor={Theme.textMuted}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Village / Mtaa / Notes</Text>
        <TextInput
          style={styles.input}
          value={value.village}
          onChangeText={(t) => handleField('village', t)}
          placeholder="Additional delivery instructions"
          placeholderTextColor={Theme.textMuted}
        />
      </View>

      <View style={styles.infoBox}>
        <FontAwesome name="info-circle" size={14} color={Theme.primary} />
        <Text style={styles.infoText}>
          Please ensure your address details are accurate for smooth delivery.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Theme.text },
  fieldGroup: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', color: Theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    height: 48, backgroundColor: Theme.inputBg, borderRadius: Theme.radiusMd,
    borderWidth: 1, borderColor: Theme.inputBorder, paddingHorizontal: 14,
    fontSize: 15, color: Theme.text, fontWeight: '500',
  },
  row: { flexDirection: 'row', gap: gap.sm },
  halfField: { flex: 1, gap: 6 },
  pickerBtn: {
    height: 48, backgroundColor: Theme.inputBg, borderRadius: Theme.radiusMd,
    borderWidth: 1, borderColor: Theme.inputBorder, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pickerText: { fontSize: 15, color: Theme.text, fontWeight: '500' },
  pickerPlaceholder: { fontSize: 15, color: Theme.textMuted },
  dropdown: {
    maxHeight: 200, backgroundColor: '#fff', borderRadius: Theme.radiusMd,
    borderWidth: 1, borderColor: Theme.inputBorder, ...Theme.shadowMd,
  },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 0.5, borderBottomColor: Theme.inputBorder },
  dropdownItemActive: { backgroundColor: Theme.primary + '10' },
  dropdownText: { fontSize: 14, color: Theme.text },
  dropdownTextActive: { color: Theme.primary, fontWeight: '700' },
  infoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12,
    backgroundColor: Theme.primary + '08', borderRadius: Theme.radiusMd,
    borderWidth: 1, borderColor: Theme.primary + '15',
  },
  infoText: { flex: 1, fontSize: 12, color: Theme.textSecondary, lineHeight: 18 },
  divider: { height: 1, backgroundColor: Theme.inputBorder, marginVertical: 4 },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderRadius: Theme.radiusMd,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    marginTop: 4,
    ...Theme.shadowMd,
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    maxHeight: 200,
    zIndex: 999,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBorder,
  },
  suggestionText: {
    fontSize: 14,
    color: Theme.text,
    flex: 1,
  },
});
