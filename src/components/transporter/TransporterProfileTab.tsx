import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl, ActivityIndicator, TextInput, Image, Alert } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';
import { apiPatch, apiPost } from '@/src/services/api';
import { pickImageSafe, requestImagePermissions } from '@/src/lib/imagePicker';
import type { Session } from '@/src/contexts/AuthContext';
import type { TransporterProfile, TransporterProfileFormData } from '@/src/hooks/useTransporterDashboardData';

const VEHICLE_TYPES = [
  { value: 'bodaboda', label: 'Bodaboda (Motorcycle)' },
  { value: 'bajaj', label: 'Bajaj (Three-Wheeler)' },
  { value: 'car', label: 'Car / Small Van' },
  { value: 'canter', label: 'Canter / Fuso Truck' },
  { value: 'semi_trailer', label: 'Semi Trailer Truck' },
  { value: 'flight', label: 'Air Transport' },
];

interface Props {
  transporter: TransporterProfile | null;
  profileData: TransporterProfileFormData;
  setProfileData: React.Dispatch<React.SetStateAction<TransporterProfileFormData>>;
  session: Session | null;
  setSession: (session: Session | null) => Promise<void>;
  // Shared with the top-level dashboard fetch state on purpose: the parent
  // dashboard hides ALL tab content behind a full-screen spinner while this
  // is true, so this drives that spinner during a profile save too.
  loading: boolean;
  setLoading: (v: boolean) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onTransporterUpdated: (transporter: TransporterProfile) => void;
  onCancelEdit: () => void;
}

export function TransporterProfileTab({
  transporter,
  profileData,
  setProfileData,
  session,
  setSession,
  loading,
  setLoading,
  refreshing,
  onRefresh,
  onTransporterUpdated,
  onCancelEdit,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    const hasPerms = await requestImagePermissions();
    if (!hasPerms) return;

    setIsUploadingImage(true);
    try {
      const picked = await pickImageSafe(useCamera);
      if (!picked) { setIsUploadingImage(false); return; }

      const dataUrl = `data:${picked.mimeType};base64,${picked.base64}`;

      await apiPost('/profile/avatar', { image: dataUrl }, session?.access_token);

      setProfileData(p => ({ ...p, profile_image_url: dataUrl }));
      if (session) {
        await setSession({
          ...session,
          user: {
            ...session.user,
            profile_image_url: dataUrl,
          }
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Profile photo updated successfully');
    } catch (e: any) {
      Alert.alert('Upload Error', e.message || 'Failed to update profile photo');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const showUploadOptions = () => {
    Alert.alert('Profile Photo', 'Choose how to upload your profile photo', [
      { text: 'Take Photo', onPress: () => pickImage(true) },
      { text: 'Choose from Library', onPress: () => pickImage(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const getKycBadgeStyle = (status: string | undefined) => {
    const s = String(status || '').toLowerCase();
    if (s === 'approved') return { backgroundColor: '#16a34a' };
    if (s === 'pending') return { backgroundColor: 'rgba(234, 179, 8, 0.15)', borderColor: '#fef08a', borderWidth: 1 };
    if (s === 'rejected') return { backgroundColor: '#dc2626' };
    return { backgroundColor: '#e2e8f0' };
  };

  const getKycTextStyle = (status: string | undefined) => {
    const s = String(status || '').toLowerCase();
    if (s === 'approved' || s === 'rejected') return { color: '#ffffff' };
    if (s === 'pending') return { color: '#a16207' };
    return { color: '#475569' };
  };

  const handleUpdateProfile = async () => {
    if (!session?.access_token) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      // 1. Update user profile (name and phone)
      const updatedUser = await apiPatch<any>('/profile', {
        full_name: profileData.full_name,
        phone: profileData.phone,
      }, session.access_token);

      // 2. Update transporter details (business_name, vehicle_type, license_plate)
      const updatedTransporter = await apiPost<any>('/transporters', {
        business_name: profileData.business_name,
        vehicle_type: profileData.vehicle_type,
        license_plate: profileData.license_plate,
        vehicle_registration: profileData.license_plate,
      }, session.access_token);

      onTransporterUpdated(updatedTransporter.transporter);

      if (session) {
        await setSession({
          ...session,
          user: {
            ...session.user,
            ...updatedUser.profile,
          }
        });
      }

      setIsEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.bodyContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />}
    >
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Profile Details</Text>

        <View style={styles.formCard}>
          {/* Avatar/Profile Photo Section */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarFrame}>
              {profileData.profile_image_url ? (
                <Image source={{ uri: profileData.profile_image_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>
                    {profileData.full_name
                      ? profileData.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                      : 'T'}
                  </Text>
                </View>
              )}
              {isUploadingImage && (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              )}
              {isEditing && (
                <Pressable style={styles.avatarEditBadge} onPress={showUploadOptions}>
                  <FontAwesome name="camera" size={12} color="#fff" />
                </Pressable>
              )}
            </View>
            <Text style={styles.avatarTitle}>Profile Photo</Text>
            {isEditing && <Text style={styles.avatarSubtitle}>Tap camera icon to change</Text>}
          </View>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={profileData.full_name}
            onChangeText={(t) => setProfileData(p => ({ ...p, full_name: t }))}
            editable={isEditing}
            placeholder="Your full name"
            placeholderTextColor={Theme.textMuted}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Email Address</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={profileData.email}
            editable={false}
            placeholder="Your email address"
            placeholderTextColor={Theme.textMuted}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Phone Number</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={profileData.phone}
            onChangeText={(t) => setProfileData(p => ({ ...p, phone: t }))}
            keyboardType="phone-pad"
            editable={isEditing}
            placeholder="e.g. +255..."
            placeholderTextColor={Theme.textMuted}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Base Location / Address</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={profileData.address || 'Not provided'}
            editable={false}
            placeholder="e.g. Dar es Salaam"
            placeholderTextColor={Theme.textMuted}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Business Name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={profileData.business_name}
            onChangeText={(t) => setProfileData(p => ({ ...p, business_name: t }))}
            editable={isEditing}
            placeholder="Transport Company Name"
            placeholderTextColor={Theme.textMuted}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Vehicle Type *</Text>
          <Pressable
            style={[styles.picker, !isEditing && styles.pickerDisabled]}
            onPress={() => isEditing && setShowVehiclePicker(!showVehiclePicker)}
            disabled={!isEditing}
          >
            <Text style={[styles.pickerText, !isEditing && { color: Theme.textMuted }]}>
              {VEHICLE_TYPES.find(t => t.value === profileData.vehicle_type)?.label || profileData.vehicle_type || 'Select vehicle type'}
            </Text>
            {isEditing && <FontAwesome name="chevron-down" size={12} color={Theme.textMuted} />}
          </Pressable>
          {showVehiclePicker && isEditing && (
            <View style={styles.dropdown}>
              {VEHICLE_TYPES.map(t => (
                <Pressable
                  key={t.value}
                  style={[styles.dropItem, profileData.vehicle_type === t.value && styles.dropItemActive]}
                  onPress={() => {
                    setProfileData(p => ({ ...p, vehicle_type: t.value }));
                    setShowVehiclePicker(false);
                  }}
                >
                  <Text style={[styles.dropText, profileData.vehicle_type === t.value && { color: Theme.primary, fontWeight: '700' }]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={[styles.label, { marginTop: 12 }]}>License Plate</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={profileData.license_plate}
            onChangeText={(t) => setProfileData(p => ({ ...p, license_plate: t }))}
            placeholder="e.g. T 123 ABC"
            placeholderTextColor={Theme.textMuted}
            editable={isEditing}
            autoCapitalize="characters"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>KYC Status</Text>
          <View style={styles.kycStatusContainer}>
            <View style={[styles.kycStatusBadge, getKycBadgeStyle(transporter?.kyc_status)]}>
              <Text style={[styles.kycStatusText, getKycTextStyle(transporter?.kyc_status)]}>
                {transporter?.kyc_status ? (transporter.kyc_status.charAt(0).toUpperCase() + transporter.kyc_status.slice(1)) : 'Pending'}
              </Text>
            </View>
            {transporter?.kyc_status === 'approved' && (
              <Text style={styles.kycStatusHint}>Verified Transporter</Text>
            )}
          </View>

          {!isEditing ? (
            <Pressable
              style={styles.editBtn}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </Pressable>
          ) : (
            <View style={styles.actionsRow}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => {
                  setIsEditing(false);
                  setShowVehiclePicker(false);
                  onCancelEdit();
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, loading && { opacity: 0.5 }]}
                onPress={handleUpdateProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bodyContent: { padding: 20, paddingBottom: 48 },

  tabContent: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Theme.text, marginBottom: 16 },
  formCard: { backgroundColor: Theme.background, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: Theme.inputBorder },
  label: { fontSize: 12, color: Theme.textSecondary, marginBottom: 4, fontWeight: '600' },
  input: { backgroundColor: Theme.backgroundSecondary, borderRadius: 8, padding: 12, fontSize: 16, color: Theme.text, borderWidth: 1, borderColor: Theme.inputBorder },
  inputDisabled: { backgroundColor: '#f4f4f5', color: Theme.textSecondary, borderColor: Theme.inputBorder },
  picker: {
    height: 48,
    backgroundColor: Theme.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  pickerDisabled: { backgroundColor: '#f4f4f5', borderColor: Theme.inputBorder },
  pickerText: { fontSize: 16, color: Theme.text, fontWeight: '500' },
  dropdown: {
    backgroundColor: Theme.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    marginTop: 4,
    ...Theme.shadowMd
  },
  dropItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 0.5, borderBottomColor: Theme.inputBorder },
  dropItemActive: { backgroundColor: Theme.primary + '08' },
  dropText: { fontSize: 14, color: Theme.text },

  // Avatar/Profile Photo styles
  avatarContainer: { alignItems: 'center', marginVertical: 20, gap: 6 },
  avatarFrame: { width: 120, height: 120, borderRadius: 60, position: 'relative' },
  avatarImage: { width: 120, height: 120, borderRadius: 60 },
  avatarFallback: { width: 120, height: 120, borderRadius: 60, backgroundColor: Theme.primary + '15', justifyContent: 'center', alignItems: 'center' },
  avatarFallbackText: { fontSize: 36, fontWeight: '800', color: Theme.primary },
  avatarLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
  avatarEditBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: Theme.primary, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderColor: '#fff', borderWidth: 2 },
  avatarTitle: { fontSize: 15, fontWeight: '600', color: Theme.text },
  avatarSubtitle: { fontSize: 12, color: Theme.textMuted },

  // KYC status container
  kycStatusContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 8 },
  kycStatusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  kycStatusText: { fontSize: 13, fontWeight: '700' },
  kycStatusHint: { fontSize: 12, color: Theme.textMuted },

  // Edit / Action Buttons
  editBtn: { backgroundColor: Theme.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 24 },
  editBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: Theme.inputBorder, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: Theme.textSecondary, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, backgroundColor: Theme.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
