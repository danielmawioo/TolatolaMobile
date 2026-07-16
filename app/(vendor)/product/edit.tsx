import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, ActivityIndicator, Image, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { apiGet, apiPut, apiPost } from '@/src/services/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { pickImageSafe, requestImagePermissions } from '@/src/lib/imagePicker';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Image states
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Picker Modal states
  const [activeModal, setActiveModal] = useState<'category' | 'grade' | 'weight_unit' | 'vehicle_section' | 'transmission' | 'fuel_type' | 'condition' | 'dietary_info' | 'prep_time' | 'drink_section' | null>(null);

  // Fashion variation states
  const [colors, setColors] = useState<{ name: string; image: string }[]>([]);
  const [newColorName, setNewColorName] = useState('');
  const [newColorImageUri, setNewColorImageUri] = useState('');
  const [uploadingColorImage, setUploadingColorImage] = useState(false);
  const [sizes, setSizes] = useState<string[]>([]);
  const [newSize, setNewSize] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    stock_quantity: '',
    moq: '1',
    category_id: '',
    quality_grade: '',
    location: '',
    delivery_available: true,
    weight_unit: '',
    // Vehicles fields
    vehicle_section: '', // vehicle | spare_part
    brand: '',
    model: '',
    year: '',
    mileage: '',
    transmission: '',
    fuel_type: '',
    engine_size: '',
    part_number: '',
    compatibility: '',
    condition: '',
    // Ready to eat
    dietary_info: '',
    prep_time: '',
    // Drinks
    drink_section: '',
  });

  useEffect(() => {
    if (!id || !session?.access_token) return;

    (async () => {
      try {
        // Fetch categories and product details
        const [catsRes, productRes] = await Promise.all([
          apiGet<any>('/categories'),
          apiGet<any>(`/products/${id}`, session.access_token)
        ]);

        const cats = catsRes?.data || catsRes?.categories || [];
        setCategories(cats);

        const product = productRes?.data || productRes || {};
        
        setFormData({
          name: product.name || '',
          price: product.price?.toString() || '',
          description: product.description || '',
          location: product.location || '',
          moq: product.moq?.toString() || '1',
          stock_quantity: product.stock_quantity?.toString() || '0',
          category_id: product.category_id || '',
          quality_grade: product.quality_grade || '',
          delivery_available: product.delivery_available ?? true,
          weight_unit: product.weight_unit || '',
          vehicle_section: product.vehicle_section || '',
          brand: product.brand || '',
          model: product.model || '',
          year: product.year?.toString() || '',
          mileage: product.mileage?.toString() || '',
          transmission: product.transmission || '',
          fuel_type: product.fuel_type || '',
          engine_size: product.engine_size || '',
          part_number: product.part_number || '',
          compatibility: product.compatibility || '',
          condition: product.condition || '',
          dietary_info: product.dietary_info || '',
          prep_time: product.prep_time || '',
          drink_section: product.drink_section || '',
        });

        setImages(product.images || []);
        setColors(product.colors || []);
        setSizes(product.sizes || []);
      } catch (error: any) {
        console.error('Failed to load edit product details', error);
        Alert.alert('Error', 'Failed to fetch product details');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id, session?.access_token]);

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

  const handleUpdate = async () => {
    if (!formData.name || !formData.price || !formData.stock_quantity) {
      Alert.alert('Error', 'Please fill in Name, Price, and Stock Quantity.');
      return;
    }

    if (!formData.category_id) {
      Alert.alert('Error', 'Please select a product category before uploading.');
      return;
    }

    if (isAgriculture && !formData.weight_unit) {
      Alert.alert('Error', 'Please select a weight unit for agricultural products.');
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await apiPut(`/products/${id}`, {
        ...formData,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity),
        moq: parseInt(formData.moq) || 1,
        images: images,
        category_id: formData.category_id || null,
        quality_grade: formData.quality_grade || null,
        colors: isFashion ? colors : null,
        sizes: isFashion ? sizes : null,
        weight_unit: isAgriculture && formData.weight_unit ? formData.weight_unit : null,
        vehicle_section: isVehicles ? (formData.vehicle_section || null) : null,
        brand: isVehicles ? (formData.brand || null) : null,
        condition: isVehicles ? (formData.condition || null) : null,
        model: (isVehicles && formData.vehicle_section === 'vehicle') ? (formData.model || null) : null,
        year: (isVehicles && formData.vehicle_section === 'vehicle' && formData.year) ? parseInt(formData.year) : null,
        mileage: (isVehicles && formData.vehicle_section === 'vehicle' && formData.mileage) ? parseInt(formData.mileage) : null,
        transmission: (isVehicles && formData.vehicle_section === 'vehicle') ? (formData.transmission || null) : null,
        fuel_type: (isVehicles && formData.vehicle_section === 'vehicle') ? (formData.fuel_type || null) : null,
        engine_size: (isVehicles && formData.vehicle_section === 'vehicle') ? (formData.engine_size || null) : null,
        part_number: (isVehicles && formData.vehicle_section === 'spare_part') ? (formData.part_number || null) : null,
        compatibility: (isVehicles && formData.vehicle_section === 'spare_part') ? (formData.compatibility || null) : null,
        dietary_info: isReadyToEat ? (formData.dietary_info || null) : null,
        prep_time: isReadyToEat ? (formData.prep_time || null) : null,
        drink_section: isDrinks ? (formData.drink_section || null) : null,
        updated_at: new Date().toISOString(),
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

  const selectedCategoryName = categories.find(c => c.id === formData.category_id)?.name;
  const isFashion = selectedCategoryName?.toLowerCase() === 'fashion';
  const isAgriculture = selectedCategoryName?.toLowerCase() === 'agriculture';
  const isVehicles = selectedCategoryName?.toLowerCase() === 'vehicles';
  const isReadyToEat = selectedCategoryName?.toLowerCase() === 'ready to eat' || selectedCategoryName?.toLowerCase() === 'ready-to-eat';
  const isDrinks = selectedCategoryName?.toLowerCase() === 'drinks';

  useEffect(() => {
    if (!isAgriculture && formData.weight_unit) {
      setFormData(prev => ({ ...prev, weight_unit: '' }));
    }
  }, [isAgriculture]);

  const selectedGradeLabel = formData.quality_grade === 'A' ? 'Grade A (Premium)' :
                             formData.quality_grade === 'B' ? 'Grade B (Standard)' :
                             formData.quality_grade === 'C' ? 'Grade C (Basic)' : '';

  const handlePickColorImage = () => {
    Alert.alert('Color Image', 'Choose how to upload', [
      { text: 'Take Photo', onPress: () => pickColorImage(true) },
      { text: 'Gallery', onPress: () => pickColorImage(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickColorImage = async (useCamera: boolean) => {
    const hasPerms = await requestImagePermissions();
    if (!hasPerms) return;
    setUploadingColorImage(true);
    try {
      const picked = await pickImageSafe(useCamera);
      if (!picked) { setUploadingColorImage(false); return; }
      const ext = picked.fileName.split('.').pop() || 'jpg';
      const filename = `color_${Date.now()}.${ext}`;
      const uploadRes = await apiPost<any>('/uploads/products', {
        filename, data: picked.base64, contentType: picked.mimeType,
      }, session?.access_token);
      if (uploadRes?.url) {
        setNewColorImageUri(uploadRes.url);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      Alert.alert('Upload Error', e.message || 'Failed to upload color image');
    } finally {
      setUploadingColorImage(false);
    }
  };

  const handleAddColor = () => {
    if (!newColorName.trim()) return;
    setColors(prev => [...prev, { name: newColorName.trim(), image: newColorImageUri }]);
    setNewColorName('');
    setNewColorImageUri('');
  };

  const handleRemoveColor = (index: number) => {
    setColors(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddSize = () => {
    if (!newSize.trim()) return;
    const formatted = newSize.trim().toUpperCase();
    if (!sizes.includes(formatted)) {
      setSizes(prev => [...prev, formatted]);
    }
    setNewSize('');
  };

  const handleRemoveSize = (index: number) => {
    setSizes(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome name="chevron-left" size={20} color={Theme.text} />
          </Pressable>
          <Text style={styles.title}>Edit Product</Text>
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
              <Text style={styles.label}>Category *</Text>
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

          {isAgriculture && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Sold by Weight (Weight Unit) *</Text>
              <Pressable style={styles.pickerButton} onPress={() => setActiveModal('weight_unit')}>
                <Text 
                  style={formData.weight_unit ? styles.pickerButtonText : styles.pickerButtonPlaceholder}
                  numberOfLines={1}
                >
                  {formData.weight_unit ? (
                    formData.weight_unit === 'Kg' ? 'Kilograms (Kg)' :
                    formData.weight_unit === 'g' ? 'Grams (g)' :
                    formData.weight_unit === 'Tons' ? 'Tons (Tons)' : formData.weight_unit
                  ) : 'Select Weight Unit'}
                </Text>
                <FontAwesome name="chevron-down" size={12} color={Theme.textMuted} />
              </Pressable>
            </View>
          )}

          {isVehicles && (
            <View style={[styles.variationsSection, { marginTop: 12 }]}>
              <Text style={styles.variationsTitle}>Vehicles / Spare Parts Details</Text>
              
              <Text style={styles.label}>Section *</Text>
              <Pressable style={styles.pickerButton} onPress={() => setActiveModal('vehicle_section')}>
                <Text style={formData.vehicle_section ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                  {formData.vehicle_section === 'vehicle' ? 'Vehicle' : formData.vehicle_section === 'spare_part' ? 'Spare Part' : 'Select Section'}
                </Text>
                <FontAwesome name="chevron-down" size={12} color={Theme.textMuted} />
              </Pressable>

              <Text style={styles.label}>Brand / Make</Text>
              <TextInput
                style={styles.input}
                value={formData.brand}
                onChangeText={(t) => setFormData(f => ({ ...f, brand: t }))}
                placeholder="e.g. Toyota, Honda"
                placeholderTextColor={Theme.textMuted}
              />

              <Text style={styles.label}>Condition</Text>
              <Pressable style={styles.pickerButton} onPress={() => setActiveModal('condition')}>
                <Text style={formData.condition ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                  {formData.condition || 'Select Condition'}
                </Text>
                <FontAwesome name="chevron-down" size={12} color={Theme.textMuted} />
              </Pressable>

              {formData.vehicle_section === 'vehicle' && (
                <View style={{ gap: 12 }}>
                  <Text style={styles.label}>Model</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.model}
                    onChangeText={(t) => setFormData(f => ({ ...f, model: t }))}
                    placeholder="e.g. Corolla, Civic"
                    placeholderTextColor={Theme.textMuted}
                  />

                  <Text style={styles.label}>Year</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.year}
                    onChangeText={(t) => setFormData(f => ({ ...f, year: t }))}
                    placeholder="e.g. 2020"
                    placeholderTextColor={Theme.textMuted}
                    keyboardType="numeric"
                  />

                  <Text style={styles.label}>Mileage (km)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.mileage}
                    onChangeText={(t) => setFormData(f => ({ ...f, mileage: t }))}
                    placeholder="e.g. 50000"
                    placeholderTextColor={Theme.textMuted}
                    keyboardType="numeric"
                  />

                  <Text style={styles.label}>Transmission</Text>
                  <Pressable style={styles.pickerButton} onPress={() => setActiveModal('transmission')}>
                    <Text style={formData.transmission ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                      {formData.transmission || 'Select Transmission'}
                    </Text>
                    <FontAwesome name="chevron-down" size={12} color={Theme.textMuted} />
                  </Pressable>

                  <Text style={styles.label}>Fuel Type</Text>
                  <Pressable style={styles.pickerButton} onPress={() => setActiveModal('fuel_type')}>
                    <Text style={formData.fuel_type ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                      {formData.fuel_type || 'Select Fuel Type'}
                    </Text>
                    <FontAwesome name="chevron-down" size={12} color={Theme.textMuted} />
                  </Pressable>

                  <Text style={styles.label}>Engine Size</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.engine_size}
                    onChangeText={(t) => setFormData(f => ({ ...f, engine_size: t }))}
                    placeholder="e.g. 2.0L, 1500cc"
                    placeholderTextColor={Theme.textMuted}
                  />
                </View>
              )}

              {formData.vehicle_section === 'spare_part' && (
                <View style={{ gap: 12 }}>
                  <Text style={styles.label}>Part Number</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.part_number}
                    onChangeText={(t) => setFormData(f => ({ ...f, part_number: t }))}
                    placeholder="OEM / Manufacturer Part #"
                    placeholderTextColor={Theme.textMuted}
                  />

                  <Text style={styles.label}>Compatible Vehicles</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.compatibility}
                    onChangeText={(t) => setFormData(f => ({ ...f, compatibility: t }))}
                    placeholder="e.g. Toyota Corolla 2015-2020"
                    placeholderTextColor={Theme.textMuted}
                  />
                </View>
              )}
            </View>
          )}

          {isReadyToEat && (
            <View style={[styles.variationsSection, { marginTop: 12 }]}>
              <Text style={styles.variationsTitle}>Ready to Eat Details</Text>

              <Text style={styles.label}>Dietary Information</Text>
              <Pressable style={styles.pickerButton} onPress={() => setActiveModal('dietary_info')}>
                <Text style={formData.dietary_info ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                  {formData.dietary_info || 'Select Dietary Info'}
                </Text>
                <FontAwesome name="chevron-down" size={12} color={Theme.textMuted} />
              </Pressable>

              <Text style={styles.label}>Preparation Time</Text>
              <Pressable style={styles.pickerButton} onPress={() => setActiveModal('prep_time')}>
                <Text style={formData.prep_time ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                  {formData.prep_time || 'Select Prep Time'}
                </Text>
                <FontAwesome name="chevron-down" size={12} color={Theme.textMuted} />
              </Pressable>
            </View>
          )}

          {isDrinks && (
            <View style={[styles.variationsSection, { marginTop: 12 }]}>
              <Text style={styles.variationsTitle}>Drinks Details</Text>

              <Text style={styles.label}>Section *</Text>
              <Pressable style={styles.pickerButton} onPress={() => setActiveModal('drink_section')}>
                <Text style={formData.drink_section ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                  {formData.drink_section === 'alcoholic' ? 'Alcoholic' : formData.drink_section === 'non_alcoholic' ? 'Non-Alcoholic' : 'Select Section'}
                </Text>
                <FontAwesome name="chevron-down" size={12} color={Theme.textMuted} />
              </Pressable>
            </View>
          )}

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

          {/* Fashion Variations — only shown when Fashion category is selected */}
          {isFashion && (
            <View style={styles.variationsSection}>
              <Text style={styles.variationsTitle}>Fashion Variations</Text>

              {/* Sizes */}
              <View style={styles.varBlock}>
                <Text style={styles.label}>Available Sizes</Text>
                <View style={styles.varInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={newSize}
                    onChangeText={setNewSize}
                    placeholder="e.g. S, M, L, XL, 42"
                    placeholderTextColor={Theme.textMuted}
                    onSubmitEditing={handleAddSize}
                    returnKeyType="done"
                  />
                  <Pressable style={styles.varAddBtn} onPress={handleAddSize}>
                    <FontAwesome name="plus" size={14} color="#fff" />
                  </Pressable>
                </View>
                {sizes.length > 0 && (
                  <View style={styles.chipRow}>
                    {sizes.map((s, i) => (
                      <View key={i} style={styles.chip}>
                        <Text style={styles.chipText}>{s}</Text>
                        <Pressable onPress={() => handleRemoveSize(i)} hitSlop={6}>
                          <FontAwesome name="times" size={10} color={Theme.textMuted} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Colors */}
              <View style={styles.varBlock}>
                <Text style={styles.label}>Color Variations (with Image)</Text>
                <View style={styles.varColorForm}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={newColorName}
                    onChangeText={setNewColorName}
                    placeholder="e.g. Cherry Red"
                    placeholderTextColor={Theme.textMuted}
                  />
                  <Pressable
                    style={styles.varImageBtn}
                    onPress={handlePickColorImage}
                    disabled={uploadingColorImage}
                  >
                    {uploadingColorImage ? (
                      <ActivityIndicator size="small" color={Theme.primary} />
                    ) : newColorImageUri ? (
                      <Image source={{ uri: newColorImageUri }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                    ) : (
                      <FontAwesome name="camera" size={16} color={Theme.textMuted} />
                    )}
                  </Pressable>
                  <Pressable
                    style={[styles.varAddBtn, !newColorName.trim() && { opacity: 0.5 }]}
                    onPress={handleAddColor}
                    disabled={!newColorName.trim()}
                  >
                    <FontAwesome name="plus" size={14} color="#fff" />
                  </Pressable>
                </View>
                {colors.length > 0 && (
                  <View style={styles.colorChipRow}>
                    {colors.map((c, i) => (
                      <View key={i} style={styles.colorChip}>
                        <View style={styles.colorChipPreview}>
                          {c.image ? (
                            <Image source={{ uri: c.image }} style={{ width: 28, height: 28, borderRadius: 14 }} />
                          ) : (
                            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.name.toLowerCase() }} />
                          )}
                        </View>
                        <Text style={styles.colorChipText} numberOfLines={1}>{c.name}</Text>
                        <Pressable onPress={() => handleRemoveColor(i)} hitSlop={6}>
                          <FontAwesome name="times" size={10} color={Theme.textMuted} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          <Pressable 
            style={styles.deliveryToggle} 
            onPress={() => setFormData(f => ({ ...f, delivery_available: !f.delivery_available }))}
          >
            <FontAwesome 
              name={formData.delivery_available ? "check-square" : "square-o"} 
              size={24} 
              color={formData.delivery_available ? Theme.primary : Theme.textMuted} 
            />
            <Text style={styles.deliveryText}>Delivery handled by Tola</Text>
          </Pressable>

          <Pressable 
            style={[styles.submitBtn, (saving || uploadingImage) && { opacity: 0.7 }]} 
            onPress={handleUpdate}
            disabled={saving || uploadingImage}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Update Product</Text>}
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
                {activeModal === 'category' ? 'Select Category' :
                 activeModal === 'grade' ? 'Select Quality Grade' :
                 activeModal === 'weight_unit' ? 'Select Weight Unit' :
                 activeModal === 'vehicle_section' ? 'Select Section' :
                 activeModal === 'transmission' ? 'Select Transmission' :
                 activeModal === 'fuel_type' ? 'Select Fuel Type' :
                 activeModal === 'condition' ? 'Select Condition' :
                 activeModal === 'dietary_info' ? 'Select Dietary Info' :
                 activeModal === 'prep_time' ? 'Select Prep Time' :
                 activeModal === 'drink_section' ? 'Select Drink Type' : 'Select Option'}
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
              ) : activeModal === 'grade' ? (
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
              ) : activeModal === 'weight_unit' ? (
                <>
                  {[
                    { value: 'Kg', label: 'Kilograms (Kg)' },
                    { value: 'g', label: 'Grams (g)' },
                    { value: 'Tons', label: 'Tons (Tons)' },
                  ].map((u) => (
                    <Pressable
                      key={u.value}
                      style={[styles.modalItem, formData.weight_unit === u.value && styles.modalItemActive]}
                      onPress={() => {
                        setFormData(f => ({ ...f, weight_unit: u.value }));
                        setActiveModal(null);
                      }}
                    >
                      <Text style={[styles.modalItemText, formData.weight_unit === u.value && styles.modalItemTextActive]}>
                        {u.label}
                      </Text>
                    </Pressable>
                  ))}
                </>
              ) : activeModal === 'vehicle_section' ? (
                <>
                  {[
                    { value: 'vehicle', label: 'Vehicle' },
                    { value: 'spare_part', label: 'Spare Part' },
                  ].map((x) => (
                    <Pressable
                      key={x.value}
                      style={[styles.modalItem, formData.vehicle_section === x.value && styles.modalItemActive]}
                      onPress={() => {
                        setFormData(f => ({ ...f, vehicle_section: x.value }));
                        setActiveModal(null);
                      }}
                    >
                      <Text style={[styles.modalItemText, formData.vehicle_section === x.value && styles.modalItemTextActive]}>
                        {x.label}
                      </Text>
                    </Pressable>
                  ))}
                </>
              ) : activeModal === 'transmission' ? (
                <>
                  {[
                    { value: 'Automatic', label: 'Automatic' },
                    { value: 'Manual', label: 'Manual' },
                  ].map((x) => (
                    <Pressable
                      key={x.value}
                      style={[styles.modalItem, formData.transmission === x.value && styles.modalItemActive]}
                      onPress={() => {
                        setFormData(f => ({ ...f, transmission: x.value }));
                        setActiveModal(null);
                      }}
                    >
                      <Text style={[styles.modalItemText, formData.transmission === x.value && styles.modalItemTextActive]}>
                        {x.label}
                      </Text>
                    </Pressable>
                  ))}
                </>
              ) : activeModal === 'fuel_type' ? (
                <>
                  {['Petrol', 'Diesel', 'Hybrid', 'Electric', 'Other'].map((fType) => (
                    <Pressable
                      key={fType}
                      style={[styles.modalItem, formData.fuel_type === fType && styles.modalItemActive]}
                      onPress={() => {
                        setFormData(f => ({ ...f, fuel_type: fType }));
                        setActiveModal(null);
                      }}
                    >
                      <Text style={[styles.modalItemText, formData.fuel_type === fType && styles.modalItemTextActive]}>
                        {fType}
                      </Text>
                    </Pressable>
                  ))}
                </>
              ) : activeModal === 'condition' ? (
                <>
                  {['New', 'Used', 'Reconditioned'].map((cond) => (
                    <Pressable
                      key={cond}
                      style={[styles.modalItem, formData.condition === cond && styles.modalItemActive]}
                      onPress={() => {
                        setFormData(f => ({ ...f, condition: cond }));
                        setActiveModal(null);
                      }}
                    >
                      <Text style={[styles.modalItemText, formData.condition === cond && styles.modalItemTextActive]}>
                        {cond}
                      </Text>
                    </Pressable>
                  ))}
                </>
              ) : activeModal === 'dietary_info' ? (
                <>
                  {['Halal', 'Vegetarian', 'Vegan', 'Gluten-Free', 'None'].map((dInfo) => (
                    <Pressable
                      key={dInfo}
                      style={[styles.modalItem, formData.dietary_info === dInfo && styles.modalItemActive]}
                      onPress={() => {
                        setFormData(f => ({ ...f, dietary_info: dInfo }));
                        setActiveModal(null);
                      }}
                    >
                      <Text style={[styles.modalItemText, formData.dietary_info === dInfo && styles.modalItemTextActive]}>
                        {dInfo}
                      </Text>
                    </Pressable>
                  ))}
                </>
              ) : activeModal === 'prep_time' ? (
                <>
                  {['Ready Now', '5-10 min', '10-20 min', '20-30 min', '30-60 min', '1+ hour'].map((pTime) => (
                    <Pressable
                      key={pTime}
                      style={[styles.modalItem, formData.prep_time === pTime && styles.modalItemActive]}
                      onPress={() => {
                        setFormData(f => ({ ...f, prep_time: pTime }));
                        setActiveModal(null);
                      }}
                    >
                      <Text style={[styles.modalItemText, formData.prep_time === pTime && styles.modalItemTextActive]}>
                        {pTime}
                      </Text>
                    </Pressable>
                  ))}
                </>
              ) : activeModal === 'drink_section' ? (
                <>
                  {[
                    { label: 'Alcoholic', value: 'alcoholic' },
                    { label: 'Non-Alcoholic', value: 'non_alcoholic' }
                  ].map((item) => (
                    <Pressable
                      key={item.value}
                      style={[styles.modalItem, formData.drink_section === item.value && styles.modalItemActive]}
                      onPress={() => {
                        setFormData(f => ({ ...f, drink_section: item.value }));
                        setActiveModal(null);
                      }}
                    >
                      <Text style={[styles.modalItemText, formData.drink_section === item.value && styles.modalItemTextActive]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </>
              ) : null}
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.background },
  
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

  // Fashion Variations
  variationsSection: {
    backgroundColor: Theme.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  variationsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.text,
    letterSpacing: -0.3,
  },
  varBlock: { gap: 8 },
  varInputRow: { flexDirection: 'row', gap: 8 },
  varAddBtn: {
    width: 44, height: 48, borderRadius: 12,
    backgroundColor: Theme.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: Theme.inputBorder,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: Theme.text },
  varColorForm: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  varImageBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#fff', borderWidth: 1, borderColor: Theme.inputBorder,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  colorChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 12,
    paddingRight: 10, paddingVertical: 4, paddingLeft: 4,
    borderWidth: 1, borderColor: Theme.inputBorder,
  },
  colorChipPreview: {
    width: 28, height: 28, borderRadius: 14, overflow: 'hidden',
  },
  colorChipText: { fontSize: 11, fontWeight: '700', color: Theme.text, maxWidth: 80 },
});
