import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';
import { useAuth } from '@/src/contexts/AuthContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEditProductData } from '@/src/hooks/useEditProductData';
import { useUpdateProductSubmit } from '@/src/hooks/useUpdateProductSubmit';
import { ProductImagesPicker } from '@/src/components/vendorProduct/ProductImagesPicker';
import { FashionVariationsEditor } from '@/src/components/vendorProduct/FashionVariationsEditor';
import { ProductOptionPickerModal, type ActiveModal } from '@/src/components/vendorProduct/ProductOptionPickerModal';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const {
    loading,
    categories,
    formData, setFormData,
    images, setImages,
    colors, setColors,
    sizes, setSizes,
    parentCategoryId, setParentCategoryId,
    subCategoryId, setSubCategoryId,
    selectedGradeLabel,
    isFashion,
    isAgriculture,
    isVehicles,
    isReadyToEat,
    isDrinks,
  } = useEditProductData(id, session?.access_token);

  // Picker Modal state
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Tracks the main gallery upload in flight so the submit button can be disabled
  const [uploadingImage, setUploadingImage] = useState(false);

  const { saving, handleUpdate } = useUpdateProductSubmit({
    id,
    accessToken: session?.access_token,
    formData,
    images,
    colors,
    sizes,
    flags: { isFashion, isAgriculture, isVehicles, isReadyToEat, isDrinks },
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Theme.primary} size="large" />
      </View>
    );
  }

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
          <ProductImagesPicker
            images={images}
            onImagesChange={setImages}
            accessToken={session?.access_token}
            uploadingImage={uploadingImage}
            onUploadingChange={setUploadingImage}
          />

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
                  style={parentCategoryId ? styles.pickerButtonText : styles.pickerButtonPlaceholder}
                  numberOfLines={1}
                >
                  {categories.find(c => c.id === parentCategoryId)?.name || 'Select Category'}
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

          {categories.filter(c => c.parent_id === parentCategoryId).length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Subcategory *</Text>
              <Pressable style={styles.pickerButton} onPress={() => setActiveModal('subcategory')}>
                <Text
                  style={subCategoryId ? styles.pickerButtonText : styles.pickerButtonPlaceholder}
                  numberOfLines={1}
                >
                  {categories.find(c => c.id === subCategoryId)?.name || 'Select Subcategory'}
                </Text>
                <FontAwesome name="chevron-down" size={12} color={Theme.textMuted} />
              </Pressable>
            </View>
          )}

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
              <Text style={styles.variationsTitle}>{(() => {
                const subCat = categories.find(c => c.id === subCategoryId);
                const sectionLabel = formData.vehicle_section === 'vehicle' ? 'Vehicle' : formData.vehicle_section === 'spare_part' ? 'Spare Part' : '';
                if (subCat?.name && sectionLabel) return `${subCat.name} / ${sectionLabel} Details`;
                if (subCat?.name) return `${subCat.name} Details`;
                return 'Vehicles / Spare Parts Details';
              })()}</Text>

              <Text style={styles.label}>Section *</Text>
              {formData.vehicle_section ? (
                <View style={[styles.pickerButton, { backgroundColor: Theme.backgroundSecondary }]}>
                  <Text style={styles.pickerButtonText}>
                    {formData.vehicle_section === 'vehicle' ? '🚗 Vehicle' : '🔧 Spare Part'}
                  </Text>
                  <Text style={[styles.pickerButtonPlaceholder, { fontSize: 10 }]}>(from subcategory)</Text>
                </View>
              ) : (
                <Pressable style={styles.pickerButton} onPress={() => setActiveModal('vehicle_section')}>
                  <Text style={formData.vehicle_section ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                    {formData.vehicle_section === 'vehicle' ? 'Vehicle' : formData.vehicle_section === 'spare_part' ? 'Spare Part' : 'Select Section'}
                  </Text>
                  <FontAwesome name="chevron-down" size={12} color={Theme.textMuted} />
                </Pressable>
              )}

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
                  <Text style={styles.label}>Spare Part Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.model}
                    onChangeText={(t) => setFormData(f => ({ ...f, model: t }))}
                    placeholder="e.g. Brake Pad, Oil Filter, Chain"
                    placeholderTextColor={Theme.textMuted}
                  />

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
              {formData.drink_section ? (
                <View style={[styles.pickerButton, { backgroundColor: Theme.backgroundSecondary }]}>
                  <Text style={styles.pickerButtonText}>
                    {formData.drink_section === 'alcoholic' ? '🍹 Alcoholic' : '🥤 Non-Alcoholic'}
                  </Text>
                  <Text style={[styles.pickerButtonPlaceholder, { fontSize: 10 }]}>(from subcategory)</Text>
                </View>
              ) : (
                <Pressable style={styles.pickerButton} onPress={() => setActiveModal('drink_section')}>
                  <Text style={formData.drink_section ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                    {formData.drink_section === 'alcoholic' ? 'Alcoholic' : formData.drink_section === 'non_alcoholic' ? 'Non-Alcoholic' : 'Select Section'}
                  </Text>
                  <FontAwesome name="chevron-down" size={12} color={Theme.textMuted} />
                </Pressable>
              )}
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
            <FashionVariationsEditor
              colors={colors}
              onColorsChange={setColors}
              sizes={sizes}
              onSizesChange={setSizes}
              accessToken={session?.access_token}
            />
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

      <ProductOptionPickerModal
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        categories={categories}
        parentCategoryId={parentCategoryId}
        subCategoryId={subCategoryId}
        setParentCategoryId={setParentCategoryId}
        setSubCategoryId={setSubCategoryId}
        formData={formData}
        setFormData={setFormData}
      />
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

  // Fashion / Vehicle / Ready-to-eat / Drinks section wrapper (also duplicated
  // in FashionVariationsEditor since that component renders standalone)
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
});
