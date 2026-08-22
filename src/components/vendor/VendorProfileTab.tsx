import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';
import { apiPut } from '@/src/services/api';

interface Props {
  vendor: any;
  accessToken: string;
  userEmail?: string | null;
  onVendorUpdated: (patch: any) => void;
}

function getKycBadge(vendor: any) {
  const status = vendor?.kyc_status;
  if (status === 'approved') return { label: 'Approved', bg: '#dcfce7', color: '#16a34a' };
  if (status === 'rejected') return { label: 'Rejected', bg: '#fee2e2', color: '#dc2626' };
  return { label: 'Pending', bg: '#fef3c7', color: '#d97706' };
}

export function VendorProfileTab({ vendor, accessToken, userEmail, onVendorUpdated }: Props) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    business_name: '',
    phone: '',
    description: '',
  });

  const handleStartEditProfile = () => {
    setProfileForm({
      business_name: vendor?.business_name || '',
      phone: vendor?.phone || '',
      description: vendor?.description || '',
    });
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    setIsEditingProfile(false);
  };

  const handleSaveProfile = async () => {
    if (!vendor?.id || !accessToken) return;
    if (!profileForm.business_name) {
      Alert.alert('Error', 'Business name is required.');
      return;
    }
    setSavingProfile(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await apiPut(`/vendors/${vendor.id}`, profileForm, accessToken);
      onVendorUpdated(profileForm);
      setIsEditingProfile(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Business profile updated successfully.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update business profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const kyc = getKycBadge(vendor);

  return (
    <View style={styles.tabContent}>
      {/* Vendor Business Profile Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Business Profile</Text>
            <Text style={styles.cardDesc}>Your vendor business information visible to customers</Text>
          </View>
          {!isEditingProfile && (
            <Pressable style={styles.outlineBtn} onPress={handleStartEditProfile}>
              <FontAwesome name="edit" size={14} color={Theme.text} />
              <Text style={styles.outlineBtnText}>Edit</Text>
            </Pressable>
          )}
        </View>

        {isEditingProfile ? (
          <View style={styles.profileEditForm}>
            <View style={styles.profileFieldGroup}>
              <Text style={styles.profileFieldLabel}>Business Name *</Text>
              <TextInput
                style={styles.profileInput}
                value={profileForm.business_name}
                onChangeText={(t) => setProfileForm(f => ({ ...f, business_name: t }))}
                placeholder="Your business name"
                placeholderTextColor={Theme.textMuted}
              />
            </View>
            <View style={styles.profileFieldGroup}>
              <Text style={styles.profileFieldLabel}>Phone Number</Text>
              <TextInput
                style={styles.profileInput}
                value={profileForm.phone}
                onChangeText={(t) => setProfileForm(f => ({ ...f, phone: t }))}
                placeholder="+255 XXX XXX XXX"
                placeholderTextColor={Theme.textMuted}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.profileFieldGroup}>
              <Text style={styles.profileFieldLabel}>Business Description</Text>
              <TextInput
                style={[styles.profileInput, { height: 80, textAlignVertical: 'top' }]}
                value={profileForm.description}
                onChangeText={(t) => setProfileForm(f => ({ ...f, description: t }))}
                placeholder="Describe your business..."
                placeholderTextColor={Theme.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>
            <View style={styles.profileEditActions}>
              <Pressable style={styles.profileCancelBtn} onPress={handleCancelEditProfile}>
                <Text style={styles.profileCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.profileSaveBtn, savingProfile && { opacity: 0.7 }]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.profileSaveBtnText}>Save Changes</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.shopInfoSection}>
              <View style={styles.infoRowInline}>
                <Text style={styles.infoLabelInline}>Business Name:</Text>
                <Text style={styles.infoValueInline}>{vendor?.business_name || '—'}</Text>
              </View>
              <View style={styles.infoRowInline}>
                <Text style={styles.infoLabelInline}>Phone:</Text>
                <Text style={styles.infoValueInline}>{vendor?.phone || 'No phone added'}</Text>
              </View>
              <View style={styles.infoRowInline}>
                <Text style={styles.infoLabelInline}>Description:</Text>
                <Text style={styles.infoValueInline}>{vendor?.description || 'No description added'}</Text>
              </View>
            </View>

            <View style={[styles.shopInfoSection, { borderBottomWidth: 0 }]}>
              <Text style={styles.sectionSubtitle}>Account Details</Text>
              <View style={styles.infoRowInline}>
                <Text style={styles.infoLabelInline}>Email:</Text>
                <Text style={styles.infoValueInline}>{userEmail || '—'}</Text>
              </View>
              <View style={styles.infoRowInline}>
                <Text style={styles.infoLabelInline}>KYC Status:</Text>
                <View style={[styles.kycBadge, { backgroundColor: kyc.bg }]}>
                  <Text style={[styles.kycBadgeText, { color: kyc.color }]}>{kyc.label}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* General Profile Link */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Account Settings</Text>
            <Text style={styles.cardDesc}>Manage your personal account, password, and preferences</Text>
          </View>
        </View>
        <Pressable style={[styles.outlineBtn, { alignSelf: 'flex-start', marginTop: 8 }]} onPress={() => router.push('/(tabs)/profile')}>
          <FontAwesome name="user" size={14} color={Theme.text} />
          <Text style={styles.outlineBtnText}>Go to Account Settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContent: { flex: 1 },
  card: { backgroundColor: Theme.background, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: Theme.inputBorder, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: Theme.text, marginBottom: 4 },
  cardDesc: { fontSize: 14, color: Theme.textSecondary },

  outlineBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, gap: 6, borderWidth: 1, borderColor: Theme.inputBorder },
  outlineBtnText: { color: Theme.text, fontSize: 13, fontWeight: '500' },

  shopInfoSection: { borderBottomWidth: 1, borderBottomColor: Theme.inputBorder, paddingVertical: 16 },
  sectionSubtitle: { fontSize: 15, fontWeight: '600', color: Theme.text, marginBottom: 12 },
  infoRowInline: { flexDirection: 'row', marginBottom: 8, alignItems: 'center' },
  infoLabelInline: { width: 100, fontSize: 13, fontWeight: '500', color: Theme.text },
  infoValueInline: { flex: 1, fontSize: 13, color: Theme.textSecondary },

  profileEditForm: { gap: 14 },
  profileFieldGroup: { gap: 4 },
  profileFieldLabel: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  profileInput: { backgroundColor: Theme.backgroundSecondary, borderRadius: 10, padding: 12, fontSize: 15, color: Theme.text, borderWidth: 1, borderColor: Theme.inputBorder },
  profileEditActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  profileCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Theme.inputBorder, alignItems: 'center' },
  profileCancelBtnText: { fontSize: 14, fontWeight: '600', color: Theme.text },
  profileSaveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Theme.primary, alignItems: 'center' },
  profileSaveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  kycBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  kycBadgeText: { fontSize: 12, fontWeight: '700' },
});
