import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ActivityIndicator, Image } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';
import { apiPost } from '@/src/services/api';
import { pickImageSafe, requestImagePermissions } from '@/src/lib/imagePicker';
import type { ProductColor } from '@/src/hooks/useEditProductData';

interface Props {
  colors: ProductColor[];
  onColorsChange: (colors: ProductColor[]) => void;
  sizes: string[];
  onSizesChange: (sizes: string[]) => void;
  accessToken: string | null | undefined;
}

/**
 * "Fashion Variations" section (sizes + color swatches with per-color image upload),
 * only rendered when the selected product category is Fashion.
 */
export function FashionVariationsEditor({ colors, onColorsChange, sizes, onSizesChange, accessToken }: Props) {
  const [newColorName, setNewColorName] = useState('');
  const [newColorImageUri, setNewColorImageUri] = useState('');
  const [uploadingColorImage, setUploadingColorImage] = useState(false);
  const [newSize, setNewSize] = useState('');

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
      }, accessToken);
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
    onColorsChange([...colors, { name: newColorName.trim(), image: newColorImageUri }]);
    setNewColorName('');
    setNewColorImageUri('');
  };

  const handleRemoveColor = (index: number) => {
    onColorsChange(colors.filter((_, i) => i !== index));
  };

  const handleAddSize = () => {
    if (!newSize.trim()) return;
    const formatted = newSize.trim().toUpperCase();
    if (!sizes.includes(formatted)) {
      onSizesChange([...sizes, formatted]);
    }
    setNewSize('');
  };

  const handleRemoveSize = (index: number) => {
    onSizesChange(sizes.filter((_, i) => i !== index));
  };

  return (
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
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: Theme.textSecondary, marginBottom: 4 },
  input: { backgroundColor: Theme.backgroundSecondary, borderRadius: 12, padding: 14, fontSize: 16, color: Theme.text, borderWidth: 1, borderColor: Theme.inputBorder },
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
