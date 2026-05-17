import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Image, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '@/src/services/api';
import { Theme } from '@/constants/Theme';

const COMPLAINT_REASONS = [
  'DELAYED_DELIVERY',
  'DAMAGED_GOODS',
  'MISSING_ITEMS',
  'WRONG_ITEM',
  'OTHER',
];

export default function TrackComplaintScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ token: string; orderId: string }>();
  
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!reason) {
      setError('Please select a reason.');
      return;
    }
    if (!description.trim()) {
      setError('Please add a description.');
      return;
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('token', params.token || '');
      formData.append('order_id', params.orderId || '');
      formData.append('reason', reason);
      formData.append('description', description.trim());
      
      if (photo) {
        const uri = Platform.OS === 'ios' ? photo.uri.replace('file://', '') : photo.uri;
        const filename = uri.split('/').pop() || 'photo.jpg';
        const type = photo.mimeType || 'image/jpeg';
        
        formData.append('photo', {
          uri,
          name: filename,
          type,
        } as any);
      }

      const res = await apiFetch('/tracking/complaint', {
        method: 'POST',
        body: formData,
        headers: new Headers(), // letting fetch set the correct multipart boundary
      });

      // API might return data.dispute_id
      const data = res as any;
      if (data?.dispute_id) {
        // App has no disputes route yet, so return to status with token
        router.replace({ pathname: '/(guest)/track/status', params: { token: params.token || '' } });
      } else {
        router.replace({ pathname: '/(guest)/track/status', params: { token: params.token || '' } });
      }
    } catch (e: any) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setLoading(false);
    }
  };

  if (!params.token || !params.orderId) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <View style={styles.errorCard}>
          <FontAwesome name="exclamation-circle" size={24} color={Theme.error} style={{ marginBottom: 12 }} />
          <Text style={styles.errorTitle}>Missing order context.</Text>
          <Pressable style={styles.outlineButton} onPress={() => router.replace('/(guest)/track')}>
            <Text style={styles.outlineButtonText}>Track an order</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40, paddingHorizontal: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable 
        style={styles.backButton} 
        onPress={() => router.replace({ pathname: '/(guest)/track/status', params: { token: params.token }})}
      >
        <FontAwesome name="arrow-left" size={14} color={Theme.textMuted} />
        <Text style={styles.backText}>Back to order status</Text>
      </Pressable>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}>
            <FontAwesome name="exclamation" size={24} color={Theme.error} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Raise a complaint</Text>
            <Text style={styles.subtitle}>
              Your payment will be frozen until the dispute is resolved. Our team will review and contact you.
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Reason</Text>
            <View style={styles.reasonWrap}>
              {COMPLAINT_REASONS.map((r) => (
                <Pressable
                  key={r}
                  style={[styles.reasonChip, reason === r && styles.reasonChipActive]}
                  onPress={() => setReason(r)}
                >
                  <Text style={[styles.reasonText, reason === r && styles.reasonTextActive]}>
                    {r.replace(/_/g, ' ')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe what went wrong..."
              placeholderTextColor={Theme.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Photo (optional)</Text>
            <View style={styles.photoRow}>
              <Pressable style={styles.uploadButton} onPress={pickImage}>
                <FontAwesome name="camera" size={16} color={Theme.textSecondary} />
                <Text style={styles.uploadButtonText}>Choose Photo</Text>
              </Pressable>
              
              {photo && (
                <View style={styles.photoPreviewContainer}>
                  <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                  <Pressable style={styles.removePhotoBtn} onPress={() => setPhoto(null)}>
                    <FontAwesome name="times" size={12} color="#fff" />
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          {error && (
            <View style={styles.alert}>
              <FontAwesome name="exclamation-circle" size={16} color={Theme.error} />
              <Text style={styles.alertText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              (loading || !reason || !description.trim()) && styles.buttonDisabled,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleSubmit}
            disabled={loading || !reason || !description.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Submit complaint</Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.backgroundSecondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.backgroundSecondary,
    paddingHorizontal: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 14,
    color: Theme.textMuted,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.error + '40',
    alignItems: 'center',
    width: '100%',
    ...Theme.shadowSm,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.error,
    marginBottom: 20,
    textAlign: 'center',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.text,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Theme.shadowSm,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 16,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBorder,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Theme.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Theme.textSecondary,
    lineHeight: 18,
  },
  cardContent: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.text,
    marginBottom: 8,
  },
  reasonWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Theme.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  reasonChipActive: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
  },
  reasonText: {
    fontSize: 13,
    fontWeight: '500',
    color: Theme.textSecondary,
  },
  reasonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    minHeight: 100,
    backgroundColor: '#fff',
    color: Theme.text,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    borderRadius: 12,
    borderStyle: 'dashed',
    backgroundColor: Theme.backgroundSecondary,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.textSecondary,
  },
  photoPreviewContainer: {
    position: 'relative',
  },
  photoPreview: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Theme.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.error + '10',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: Theme.error,
    fontWeight: '500',
  },
  button: {
    backgroundColor: Theme.primary,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
