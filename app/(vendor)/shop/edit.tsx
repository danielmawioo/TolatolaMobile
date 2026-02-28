import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { apiGet, apiPatch } from '@/src/services/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';

export default function EditShopScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
  });

  useEffect(() => {
    if (!session?.access_token) return;
    (async () => {
      try {
        const shop = await apiGet<any>('/vendor/shop', session.access_token);
        setFormData({
          name: shop.name || '',
          description: shop.description || '',
          address: shop.address || '',
          phone: shop.phone || '',
        });
      } catch (error: any) {
        Alert.alert('Error', 'Failed to fetch shop details');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.access_token]);

  const handleUpdate = async () => {
    if (!formData.name) {
      Alert.alert('Error', 'Please enter a shop name.');
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await apiPatch('/vendor/shop', formData, session?.access_token);
      
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
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome name="chevron-left" size={20} color={Theme.text} />
        </Pressable>
        <Text style={styles.title}>Edit Shop Info</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Shop Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(t) => setFormData(f => ({ ...f, name: t }))}
          placeholder="e.g. Mama Mary's Provisions"
        />

        <Text style={styles.label}>Shop Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={(t) => setFormData(f => ({ ...f, description: t }))}
          placeholder="Tell customers what you sell..."
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Physical Address</Text>
        <TextInput
          style={styles.input}
          value={formData.address}
          onChangeText={(t) => setFormData(f => ({ ...f, address: t }))}
          placeholder="e.g. Kariakoo Market, Plot 45"
        />

        <Text style={styles.label}>Shop Phone Number</Text>
        <TextInput
          style={styles.input}
          value={formData.phone}
          onChangeText={(t) => setFormData(f => ({ ...f, phone: t }))}
          placeholder="e.g. +255 700 000 000"
          keyboardType="phone-pad"
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
  label: { fontSize: 14, fontWeight: '600', color: Theme.textSecondary, marginBottom: 4 },
  input: { backgroundColor: Theme.backgroundSecondary, borderRadius: 12, padding: 14, fontSize: 16, color: Theme.text, borderWidth: 1, borderColor: Theme.inputBorder },
  textArea: { height: 100, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: Theme.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.background },
});
