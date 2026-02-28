import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { apiGet, apiPatch } from '@/src/services/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    location: '',
    moq: '1',
    delivery_available: true,
  });

  useEffect(() => {
    if (!id || !session?.access_token) return;
    (async () => {
      try {
        const product = await apiGet<any>(`/products/${id}`, session.access_token);
        setFormData({
          name: product.name || '',
          price: product.price?.toString() || '',
          description: product.description || '',
          location: product.location || '',
          moq: product.moq?.toString() || '1',
          delivery_available: product.delivery_available ?? true,
        });
      } catch (error: any) {
        Alert.alert('Error', 'Failed to fetch product details');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id, session?.access_token]);

  const handleUpdate = async () => {
    if (!formData.name || !formData.price) {
      Alert.alert('Error', 'Please fill in at least the name and price.');
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await apiPatch(`/products/${id}`, {
        ...formData,
        price: parseFloat(formData.price),
        moq: parseInt(formData.moq),
      }, session?.access_token);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Product updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update product');
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
        <Text style={styles.title}>Edit Product</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Product Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(t) => setFormData(f => ({ ...f, name: t }))}
          placeholder="e.g. Premium Basmati Rice"
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Price (TSh) *</Text>
            <TextInput
              style={styles.input}
              value={formData.price}
              onChangeText={(t) => setFormData(f => ({ ...f, price: t }))}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>MOQ</Text>
            <TextInput
              style={styles.input}
              value={formData.moq}
              onChangeText={(t) => setFormData(f => ({ ...f, moq: t }))}
              placeholder="1"
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          value={formData.location}
          onChangeText={(t) => setFormData(f => ({ ...f, location: t }))}
          placeholder="e.g. Dar es Salaam"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={(t) => setFormData(f => ({ ...f, description: t }))}
          placeholder="Tell customers more about your product..."
          multiline
          numberOfLines={4}
        />

        <Pressable 
          style={styles.deliveryToggle} 
          onPress={() => setFormData(f => ({ ...f, delivery_available: !f.delivery_available }))}
        >
          <FontAwesome 
            name={formData.delivery_available ? "check-square" : "square-o"} 
            size={24} 
            color={formData.delivery_available ? Theme.primary : Theme.textMuted} 
          />
          <Text style={styles.deliveryText}>Delivery Available</Text>
        </Pressable>

        <Pressable 
          style={[styles.submitBtn, saving && { opacity: 0.7 }]} 
          onPress={handleUpdate}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Update Product</Text>}
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
  textArea: { height: 120, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  deliveryToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  deliveryText: { fontSize: 16, color: Theme.text },
  submitBtn: { backgroundColor: Theme.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.background },
});
