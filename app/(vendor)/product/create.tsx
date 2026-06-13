import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, ActivityIndicator, Image, Modal } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { apiPost, apiGet } from '@/src/services/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { pickImageSafe, requestImagePermissions } from '@/src/lib/imagePicker';

export default function CreateProductScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);
  
  // Image states
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Picker Modal states
  const [activeModal, setActiveModal] = useState<'category' | 'grade' | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    location: '',
    moq: '1',
    stock_quantity: '',
    category_id: '',
    quality_grade: '',
    delivery_available: true,
  });

  useEffect(() => {
    if (!session?.access_token) return;

    // Load categories
    apiGet<any>('/categories')
      .then(res => {
        const cats = res?.data || res?.categories || [];
        setCategories(cats);
      })
      .catch(err => console.error('Failed to load categories', err));

    // Load shop to resolve shop_id
    apiGet<any>('/vendor/shop', session.access_token)
      .then(res => {
        const actualShop = res?.shops?.[0] || res?.data?.[0] || null;
        if (actualShop) {
          setShopId(actualShop.id);
        }
      })
      .catch(err => console.error('Failed to load shop', err));
  }, [session?.access_token]);

  const handleImagePicker = () => {
    Alert.alert('Add Product Image', 'Choose how to upload your product image', [
      { text: 'Take Photo', onPress: () => pickImage(true) },
      { text: 'Choose from Gallery', onPress: () => pickImage(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickImage = async (useCamera: boolean) => {
    const hasPerms = await requestImagePermissions();
    if (!hasPerms) return;

    setUploadingImage(true);
    try {
      const picked = await pickImageSafe(useCamera);
      if (!picked) { setUploadingImage(false); return; }

      const ext = picked.fileName.split('.').pop() || 'jpg';
      const filename = `product_${Date.now()}.${ext}`;

      const uploadRes = await apiPost<any>('/uploads/products', {
        filename, data: picked.base64, contentType: picked.mimeType,
      }, session?.access_token);

      if (uploadRes?.url) {
        setImages(prev => [...prev, uploadRes.url]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      Alert.alert('Upload Error', e.message || 'Failed to upload product image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.price || !formData.stock_quantity) {
      Alert.alert('Error', 'Please fill in Name, Price, and Stock Quantity.');
      return;
    }

    if (!shopId) {
      Alert.alert('Error', 'Vendor shop details could not be resolved. Please try again.');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await apiPost('/products', {
        ...formData,
        shop_id: shopId,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity),
        moq: parseInt(formData.moq) || 1,
        images: images,
        category_id: formData.category_id || null,
        quality_grade: formData.quality_grade || null,
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

  const selectedCategoryName = categories.find(c => c.id === formData.category_id)?.name;
  const selectedGradeLabel = formData.quality_grade === 'A' ? 'Grade A (Premium)' :
                             formData.quality_grade === 'B' ? 'Grade B (Standard)' :
                             formData.quality_grade === 'C' ? 'Grade C (Basic)' : '';

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome name="chevron-left" size={20} color={Theme.text} />
          </Pressable>
          <Text style={styles.title}>Add Product</Text>
        </View>

        <View style={styles.form}>
          {/* Images Section */}
          <Text style={styles.label}>Product Images</Text>
          <View style={styles.imagesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScroll}>
              {images.map((url, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: url }} style={styles.imagePreview} />
                  <Pressable style={styles.removeImageBtn} onPress={() => handleRemoveImage(index)}>
                    <FontAwesome name="times" size={12} color="#fff" />
                  </Pressable>
                </View>
              ))}
              
              {uploadingImage ? (
                <View style={[styles.imageWrapper, { justifyContent: 'center', alignItems: 'center' }]}>
                  <ActivityIndicator color={Theme.primary} />
                </View>
              ) : (
                <Pressable style={styles.uploadCard} onPress={handleImagePicker}>
                  <FontAwesome name="camera" size={20} color={Theme.textMuted} />
                  <Text style={styles.uploadCardText}>Upload</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>

          <Text style={styles.label}>Product Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(t) => setFormData(f => ({ ...f, name: t }))}
            placeholder="e.g. Premium Basmati Rice"
            placeholderTextColor={Theme.textMuted}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Price (TZS) *</Text>
              <TextInput
                style={styles.input}
                value={formData.price}
                onChangeText={(t) => setFormData(f => ({ ...f, price: t }))}
                placeholder="e.g. 10000"
                placeholderTextColor={Theme.textMuted}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Stock Quantity *</Text>
              <TextInput
                style={styles.input}
                value={formData.stock_quantity}
                onChangeText={(t) => setFormData(f => ({ ...f, stock_quantity: t }))}
                placeholder="e.g. 100"
                placeholderTextColor={Theme.textMuted}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Category</Text>
              <Pressable style={styles.pickerButton} onPress={() => setActiveModal('category')}>
                <Text 
                  style={selectedCategoryName ? styles.pickerButtonText : styles.pickerButtonPlaceholder}
                  numberOfLines={1}
                >
                  {selectedCategoryName || 'Select Category'}
                </Text>
                <FontAwesome name="chevron-down" size={12} color={Theme.textMuted} />
              </Pressable>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Quality Grade</Text>
              <Pressable style={styles.pickerButton} onPress={() => setActiveModal('grade')}>
                <Text 
                  style={selectedGradeLabel ? styles.pickerButtonText : styles.pickerButtonPlaceholder}
                  numberOfLines={1}
                >
                  {selectedGradeLabel || 'Select Grade'}
                </Text>
                <FontAwesome name="chevron-down" size={12} color={Theme.textMuted} />
              </Pressable>
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Min Order Quantity (MOQ)</Text>
              <TextInput
                style={styles.input}
                value={formData.moq}
                onChangeText={(t) => setFormData(f => ({ ...f, moq: t }))}
                placeholder="1"
                placeholderTextColor={Theme.textMuted}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={formData.location}
                onChangeText={(t) => setFormData(f => ({ ...f, location: t }))}
                placeholder="e.g. Dar es Salaam"
                placeholderTextColor={Theme.textMuted}
              />
            </View>
          </View>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(t) => setFormData(f => ({ ...f, description: t }))}
            placeholder="Tell customers more about your product..."
            placeholderTextColor={Theme.textMuted}
            multiline
            numberOfLines={4}
          />

          <View 
            style={[styles.deliveryToggle, { opacity: 0.8 }]} 
          >
            <FontAwesome 
              name="check-square" 
              size={24} 
              color={Theme.primary} 
            />
            <Text style={styles.deliveryText}>Delivery handled by Tola (Always Enabled)</Text>
          </View>

          <Pressable 
            style={[styles.submitBtn, (loading || uploadingImage) && { opacity: 0.7 }]} 
            onPress={handleCreate}
            disabled={loading || uploadingImage}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Product</Text>}
          </Pressable>
        </View>
      </ScrollView>

      {/* Select Modals */}
      <Modal
        visible={activeModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setActiveModal(null)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeModal === 'category' ? 'Select Category' : 'Select Quality Grade'}
              </Text>
              <Pressable onPress={() => setActiveModal(null)}>
                <FontAwesome name="times-circle" size={24} color={Theme.textMuted} />
              </Pressable>
            </View>
            
            <ScrollView contentContainerStyle={styles.modalList}>
              {activeModal === 'category' ? (
                <>
                  <Pressable
                    style={[
                      styles.modalItem,
                      !formData.category_id && styles.modalItemActive
                    ]}
                    onPress={() => {
                      setFormData(f => ({ ...f, category_id: '' }));
                      setActiveModal(null);
                    }}
                  >
                    <Text style={[
                      styles.modalItemText,
                      !formData.category_id && styles.modalItemTextActive,
                      { color: Theme.textMuted }
                    ]}>
                      No Category
                    </Text>
                  </Pressable>
                  {categories.map((cat) => (
                    <Pressable
                      key={cat.id}
                      style={[
                        styles.modalItem,
                        formData.category_id === cat.id && styles.modalItemActive
                      ]}
                      onPress={() => {
                        setFormData(f => ({ ...f, category_id: cat.id }));
                        setActiveModal(null);
                      }}
                    >
                      <Text style={[
                        styles.modalItemText,
                        formData.category_id === cat.id && styles.modalItemTextActive
                      ]}>
                        {cat.name}
                      </Text>
                      {formData.category_id === cat.id && (
                        <FontAwesome name="check" size={16} color={Theme.primary} />
                      )}
                    </Pressable>
                  ))}
                </>
              ) : (
                <>
                  <Pressable
                    style={[
                      styles.modalItem,
                      !formData.quality_grade && styles.modalItemActive
                    ]}
                    onPress={() => {
                      setFormData(f => ({ ...f, quality_grade: '' }));
                      setActiveModal(null);
                    }}
                  >
                    <Text style={[
                      styles.modalItemText,
                      !formData.quality_grade && styles.modalItemTextActive,
                      { color: Theme.textMuted }
                    ]}>
                      No Quality Grade
                    </Text>
                  </Pressable>
                  {[
                    { value: 'A', label: 'Grade A (Premium)' },
                    { value: 'B', label: 'Grade B (Standard)' },
                    { value: 'C', label: 'Grade C (Basic)' },
                  ].map((g) => (
                    <Pressable
                      key={g.value}
                      style={[
                        styles.modalItem,
                        formData.quality_grade === g.value && styles.modalItemActive
                      ]}
                      onPress={() => {
                        setFormData(f => ({ ...f, quality_grade: g.value }));
                        setActiveModal(null);
                      }}
                    >
                      <Text style={[
                        styles.modalItemText,
                        formData.quality_grade === g.value && styles.modalItemTextActive
                      ]}>
                        {g.label}
                      </Text>
                      {formData.quality_grade === g.value && (
                        <FontAwesome name="check" size={16} color={Theme.primary} />
                      )}
                    </Pressable>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
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
  
  // Custom dropdown styles
  pickerButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Theme.backgroundSecondary, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Theme.inputBorder },
  pickerButtonText: { fontSize: 16, color: Theme.text },
  pickerButtonPlaceholder: { fontSize: 16, color: Theme.textMuted },
  
  // Images Upload Styles
  imagesContainer: { marginBottom: 4 },
  imageScroll: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
  imageWrapper: { position: 'relative', width: 90, height: 90, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: Theme.inputBorder },
  imagePreview: { width: '100%', height: '100%' },
  removeImageBtn: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(239, 68, 68, 0.85)', alignItems: 'center', justifyContent: 'center' },
  uploadCard: { width: 90, height: 90, borderRadius: 10, borderWidth: 1.5, borderColor: Theme.inputBorder, borderStyle: 'dashed', backgroundColor: Theme.backgroundSecondary, alignItems: 'center', justifyContent: 'center', gap: 4 },
  uploadCardText: { fontSize: 10, color: Theme.textMuted, fontWeight: '600' },
  
  // Modal Picker Styles
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Theme.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Theme.inputBorder },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Theme.text },
  modalList: { padding: 10 },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 10 },
  modalItemActive: { backgroundColor: Theme.primary + '10' },
  modalItemText: { fontSize: 16, color: Theme.text },
  modalItemTextActive: { color: Theme.primary, fontWeight: '600' },
});
