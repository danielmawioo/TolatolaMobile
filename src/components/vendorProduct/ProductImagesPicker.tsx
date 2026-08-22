import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';
import { apiPost } from '@/src/services/api';
import { pickImageSafe, requestImagePermissions } from '@/src/lib/imagePicker';

interface Props {
  images: string[];
  onImagesChange: (images: string[]) => void;
  accessToken: string | null | undefined;
  uploadingImage: boolean;
  onUploadingChange: (uploading: boolean) => void;
}

/**
 * Product gallery upload strip used at the top of the vendor "edit product" form.
 * The uploading flag is lifted to the parent (rather than owned locally) because
 * the parent's submit button is disabled while an image upload is in flight.
 */
export function ProductImagesPicker({ images, onImagesChange, accessToken, uploadingImage, onUploadingChange }: Props) {
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

    onUploadingChange(true);
    try {
      const picked = await pickImageSafe(useCamera);
      if (!picked) { onUploadingChange(false); return; }

      const ext = picked.fileName.split('.').pop() || 'jpg';
      const filename = `product_${Date.now()}.${ext}`;

      const uploadRes = await apiPost<any>('/uploads/products', {
        filename, data: picked.base64, contentType: picked.mimeType,
      }, accessToken);

      if (uploadRes?.url) {
        onImagesChange([...images, uploadRes.url]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      Alert.alert('Upload Error', e.message || 'Failed to upload product image');
    } finally {
      onUploadingChange(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <>
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
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: Theme.textSecondary, marginBottom: 4 },
  imagesContainer: { marginBottom: 4 },
  imageScroll: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
  imageWrapper: { position: 'relative', width: 90, height: 90, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: Theme.inputBorder },
  imagePreview: { width: '100%', height: '100%' },
  removeImageBtn: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(239, 68, 68, 0.85)', alignItems: 'center', justifyContent: 'center' },
  uploadCard: { width: 90, height: 90, borderRadius: 10, borderWidth: 1.5, borderColor: Theme.inputBorder, borderStyle: 'dashed', backgroundColor: Theme.backgroundSecondary, alignItems: 'center', justifyContent: 'center', gap: 4 },
  uploadCardText: { fontSize: 10, color: Theme.textMuted, fontWeight: '600' },
});
