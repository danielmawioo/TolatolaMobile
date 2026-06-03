import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { apiPost } from '@/src/services/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { TanzaniaAddressForm } from '@/src/components/checkout/TanzaniaAddressForm';
import { type AddressData, INITIAL_ADDRESS } from '@/src/constants/checkout';

export default function CreateShopScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Structured location state
  const [address, setAddress] = useState<AddressData>({ ...INITIAL_ADDRESS });
  const [fullAddress, setFullAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const handleAddressChange = (newAddress: AddressData) => {
    setAddress(newAddress);
  };

  const handleAddressComplete = (computedAddress: string, coords?: { lat: number; lng: number }) => {
    setFullAddress(computedAddress);
    if (coords) {
      setLatitude(coords.lat);
      setLongitude(coords.lng);
    }
  };

  const isLocationReady = !!(latitude && longitude && address.region && address.district);

  const handleCreate = async () => {
    if (!name) {
      Alert.alert('Error', 'Please enter a shop name.');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await apiPost('/shops', {
        name,
        description,
        address: fullAddress || `${address.street}, ${address.ward}, ${address.district}, ${address.region}`.replace(/(^, |, $)/g, ''),
        region: address.region,
        district: address.district,
        ward: address.ward,
        village: address.village,
        street: address.street,
        latitude,
        longitude,
      }, session?.access_token);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Shop created successfully! You can now start adding products.', [
        { text: 'OK', onPress: () => router.replace('/(vendor)/dashboard') }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create shop');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome name="chevron-left" size={20} color={Theme.text} />
        </Pressable>
        <Text style={styles.title}>Create Shop</Text>
      </View>

      <Text style={styles.subtitle}>Fill in your shop details to get started on TOLA.</Text>

      <View style={styles.form}>
        {/* Basic Info */}
        <Text style={styles.sectionLabel}>Basic Information</Text>

        <Text style={styles.label}>Shop Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Mama Mary's Provisions"
          placeholderTextColor={Theme.textMuted}
        />

        <Text style={styles.label}>Shop Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Tell customers what you sell..."
          placeholderTextColor={Theme.textMuted}
          multiline
          numberOfLines={4}
        />

        {/* Coordinate Status */}
        {isLocationReady ? (
          <View style={styles.coordSyncBox}>
            <FontAwesome name="check-circle" size={16} color="#16a34a" />
            <View style={{ flex: 1 }}>
              <Text style={styles.coordSyncTitle}>Coordinates Synced</Text>
              <Text style={styles.coordSyncAddress} numberOfLines={2}>
                {fullAddress || `${address.street}, ${address.ward}, ${address.district}, ${address.region}`}
              </Text>
              <View style={styles.coordRow}>
                <Text style={styles.coordText}>LAT: {latitude?.toFixed(6)}</Text>
                <Text style={styles.coordText}>LNG: {longitude?.toFixed(6)}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.coordWarningBox}>
            <FontAwesome name="exclamation-circle" size={16} color="#d97706" />
            <View style={{ flex: 1 }}>
              <Text style={styles.coordWarningTitle}>Location Needed</Text>
              <Text style={styles.coordWarningText}>
                Search or enter your shop location below. This is important for delivery fee calculations.
              </Text>
            </View>
          </View>
        )}

        {/* Location Form */}
        <Text style={styles.sectionLabel}>Shop Location</Text>

        <TanzaniaAddressForm
          value={address}
          onChange={handleAddressChange}
          onAddressComplete={handleAddressComplete}
        />

        <Pressable
          style={[styles.submitBtn, loading && { opacity: 0.7 }]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Shop</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 16 },
  backBtn: { padding: 4 },
  title: { fontSize: 24, fontWeight: '700', color: Theme.text },
  subtitle: { fontSize: 15, color: Theme.textSecondary, marginBottom: 24 },
  form: { gap: 16 },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: Theme.text, marginTop: 8, marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '600', color: Theme.textSecondary, marginBottom: 4 },
  input: { backgroundColor: Theme.backgroundSecondary, borderRadius: 12, padding: 14, fontSize: 16, color: Theme.text, borderWidth: 1, borderColor: Theme.inputBorder },
  textArea: { height: 100, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: Theme.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Coordinate Sync Box
  coordSyncBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14,
    backgroundColor: '#f0fdf4', borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0',
  },
  coordSyncTitle: { fontSize: 11, fontWeight: '800', color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5 },
  coordSyncAddress: { fontSize: 13, fontWeight: '600', color: '#15803d', marginTop: 2 },
  coordRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  coordText: { fontSize: 10, fontWeight: '800', color: '#16a34a', textTransform: 'uppercase' },

  // Coordinate Warning Box
  coordWarningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14,
    backgroundColor: '#fffbeb', borderRadius: 12, borderWidth: 1, borderColor: '#fde68a',
  },
  coordWarningTitle: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  coordWarningText: { fontSize: 12, color: '#b45309', lineHeight: 18, marginTop: 2 },
});
