import React from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { Theme } from '@/constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { ProductCategoryLike } from '@/src/lib/productForm';

interface Props {
  name: string;
  onNameChange: (text: string) => void;
  price: string;
  onPriceChange: (text: string) => void;
  stockQuantity: string;
  onStockQuantityChange: (text: string) => void;
  categories: ProductCategoryLike[];
  parentCategoryId: string;
  subCategoryId: string;
  selectedGradeLabel: string;
  onCategoryPress: () => void;
  onGradePress: () => void;
  onSubcategoryPress: () => void;
}

/**
 * Product Name / Price / Stock Quantity / Category / Quality Grade / Subcategory
 * fields shared by the vendor "create product" and "edit product" screens
 * (app/(vendor)/product/create.tsx and edit.tsx), which previously duplicated
 * this JSX block identically.
 */
export function ProductFormFields({
  name,
  onNameChange,
  price,
  onPriceChange,
  stockQuantity,
  onStockQuantityChange,
  categories,
  parentCategoryId,
  subCategoryId,
  selectedGradeLabel,
  onCategoryPress,
  onGradePress,
  onSubcategoryPress,
}: Props) {
  return (
    <>
      <Text style={styles.label}>Product Name *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={onNameChange}
        placeholder="e.g. Premium Basmati Rice"
        placeholderTextColor={Theme.textMuted}
      />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Price (TZS) *</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={onPriceChange}
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
            value={stockQuantity}
            onChangeText={onStockQuantityChange}
            placeholder="e.g. 100"
            placeholderTextColor={Theme.textMuted}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Category *</Text>
          <Pressable style={styles.pickerButton} onPress={onCategoryPress}>
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
          <Pressable style={styles.pickerButton} onPress={onGradePress}>
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
          <Pressable style={styles.pickerButton} onPress={onSubcategoryPress}>
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
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: Theme.textSecondary, marginBottom: 4 },
  input: { backgroundColor: Theme.backgroundSecondary, borderRadius: 12, padding: 14, fontSize: 16, color: Theme.text, borderWidth: 1, borderColor: Theme.inputBorder },
  row: { flexDirection: 'row' },
  pickerButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Theme.backgroundSecondary, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Theme.inputBorder },
  pickerButtonText: { fontSize: 16, color: Theme.text },
  pickerButtonPlaceholder: { fontSize: 16, color: Theme.textMuted },
});
