import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { apiGet, apiPut } from '@/src/services/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { TextInput } from 'react-native';
import { TanzaniaAddressForm } from '@/src/components/checkout/TanzaniaAddressForm';
import { type AddressData, INITIAL_ADDRESS } from '@/src/constants/checkout';

export default function EditShopScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Structured location state
  const [address, setAddress] = useState<AddressData>({ ...INITIAL_ADDRESS });
  const [fullAddress, setFullAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    (async () => {
      try {
        const shopRes = await apiGet<any>('/vendor/shop', session.access_token);
        const shop = shopRes?.shops?.[0] || shopRes?.data?.[0] || shopRes || {};
        setShopId(shop.id || null);
        setName(shop.name || '');
        setDescription(shop.description || '');
        setFullAddress(shop.address || '');
        setLatitude(shop.latitude || null);
        setLongitude(shop.longitude || null);
        setAddress({
          country: 'Tanzania',
          region: shop.region || '',
          district: shop.district || '',
          ward: shop.ward || '',
          village: shop.village || '',
          street: shop.street || '',
        });
      } catch (error: any) {
        Alert.alert('Error', 'Failed to fetch shop details');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.access_token]);

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

  const handleUpdate = async () => {
    if (!name) {
      Alert.alert('Error', 'Please enter a shop name.');
      return;
    }
    if (!shopId) {
      Alert.alert('Error', 'Shop ID not found. Please try again.');
      return;
    }
    if (!address.region || !address.district) {
      Alert.alert('Missing Location', 'Please provide at least Region and District for your shop location.');
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await apiPut(`/shops/${shopId}`, {
        name,
        description,
        address: fullAddress || `${address.street}, ${address.ward}, ${address.district}, ${address.region}`,
        region: address.region,
        district: address.district,
        ward: address.ward,
        village: address.village,
        street: address.street,
        latitude,
        longitude,
        updated_at: new Date().toISOString(),
      }, session?.access_token);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Shop details updated successfully', [
        { text: 'OK', onPress: () => router.replace('/(vendor)/dashboard') }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update shop');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Theme.primary} size="large" />
      </View>
    );
  }

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
        <Text style={styles.title}>Edit Shop Info</Text>
      </View>

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
              <Text style={styles.coordWarningTitle}>Location Incomplete</Text>
              <Text style={styles.coordWarningText}>
                Search for your shop location below. This is critical for delivery logistics.
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
          style={[styles.submitBtn, saving && { opacity: 0.7 }]}
          onPress={handleUpdate}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save Changes</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.background },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 16 },
  backBtn: { padding: 4 },
  title: { fontSize: 24, fontWeight: '700', color: Theme.text },
  form: { gap: 16 },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: Theme.text, marginTop: 8, marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '600', color: Theme.textSecondary, marginBottom: 4 },
  input: { backgroundColor: Theme.backgroundSecondary, borderRadius: 12, padding: 14, fontSize: 16, color: Theme.text, borderWidth: 1, borderColor: Theme.inputBorder },
  textArea: { height: 100, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: Theme.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.background },

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
