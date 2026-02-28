import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { apiPost } from '@/src/services/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';

export default function CreateProductScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    location: '',
    moq: '1',
    delivery_available: true,
  });

  const handleCreate = async () => {
    if (!formData.name || !formData.price) {
      Alert.alert('Error', 'Please fill in at least the name and price.');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await apiPost('/products', {
        ...formData,
        price: parseFloat(formData.price),
        moq: parseInt(formData.moq),
      }, session?.access_token);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Product created successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome name="chevron-left" size={20} color={Theme.text} />
        </Pressable>
        <Text style={styles.title}>Add Product</Text>
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
          style={[styles.submitBtn, loading && { opacity: 0.7 }]} 
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Product</Text>}
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
});
