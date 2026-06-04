import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';
import { apiPost } from '@/src/services/api';
import { TanzaniaAddressForm } from '@/src/components/checkout/TanzaniaAddressForm';
import MapPicker from '@/src/components/MapPicker';


type KYCType = 'individual' | 'company';

export default function VendorRegisterScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [kycType, setKycType] = useState<KYCType>('individual');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  
  // Address / Location
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [addressData, setAddressData] = useState({
    country: 'Tanzania',
    region: '',
    district: '',
    ward: '',
    village: '',
    street: '',
  });

  
  const [businessLicense, setBusinessLicense] = useState<string>('');
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Representative fields (for Company)
  const [repFullName, setRepFullName] = useState('');
  const [repPhone, setRepPhone] = useState('');
  const [repTin, setRepTin] = useState('');
  const [repNationalId, setRepNationalId] = useState('');
  const [repPosition, setRepPosition] = useState('');

  const requestPermissions = async () => {
    const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (camStatus !== 'granted' || libStatus !== 'granted') {
      Alert.alert('Permissions Required', 'Camera and photo library access needed to upload documents.');
      return false;
    }
    return true;
  };

  const pickImage = async (useCamera: boolean) => {
    const hasPerms = await requestPermissions();
    if (!hasPerms) return;

    setUploadingLicense(true);
    try {
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: true });

      if (result.canceled || !result.assets?.[0]) { setUploadingLicense(false); return; }

      const asset = result.assets[0];
      const base64 = asset.base64;
      if (!base64) { Alert.alert('Error', 'Failed to read image data'); setUploadingLicense(false); return; }

      const ext = asset.uri.split('.').pop() || 'jpg';
      const contentType = `image/${ext === 'png' ? 'png' : 'jpeg'}`;
      const filename = `vendor_license_${Date.now()}.${ext}`;

      const uploadRes = await apiPost<any>('/kyc/upload', {
        filename, data: base64, contentType,
      }, session?.access_token);

      if (uploadRes?.url) {
        setBusinessLicense(uploadRes.url);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Error', 'Upload failed — no URL returned');
      }
    } catch (e: any) {
      Alert.alert('Upload Error', e.message || 'Failed to upload business license');
    }
    setUploadingLicense(false);
  };

  const showUploadOptions = () => {
    Alert.alert('Upload Business License', 'Choose how to upload your valid business license', [
      { text: 'Take Photo', onPress: () => pickImage(true) },
      { text: 'Choose from Library', onPress: () => pickImage(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleAddressComplete = (fullAddress: string, coords?: { lat: number, lng: number }) => {
    if (coords) {
      setLatitude(coords.lat);
      setLongitude(coords.lng);
    }
  };

  const handleSubmit = async () => {
    if (!phoneNumber || !businessName || !tinNumber || !addressData.region || !addressData.district || !addressData.street) {
      Alert.alert('Required Fields', 'Please fill in all fields marked with *');
      return;
    }

    if (!businessLicense) {
      Alert.alert('Required Document', 'Please upload a valid business license document');
      return;
    }

    if (kycType === 'company') {
      if (!repFullName || !repPhone || !repTin || !repNationalId || !repPosition) {
        Alert.alert('Company Representative Details', 'Please fill in all representative fields');
        return;
      }
    }

    setSubmitting(true);
    try {
      const fullAddress = `${addressData.street}, ${addressData.ward ? addressData.ward + ', ' : ''}${addressData.district}, ${addressData.region}`;
      const payload: any = {
        kyc_type: kycType,
        phone_number: phoneNumber,
        business_name: businessName,
        tin_number: tinNumber,
        location: fullAddress,
        region: addressData.region,
        district: addressData.district,
        ward: addressData.ward,
        street: addressData.street,
        village: addressData.village,
        business_license_url: businessLicense,
        kyc_status: 'pending',
        latitude,
        longitude,
      };


      if (kycType === 'company') {
        payload.representative_full_name = repFullName;
        payload.representative_phone = repPhone;
        payload.representative_tin = repTin;
        payload.representative_national_id = repNationalId;
        payload.representative_position = repPosition;
      }

      await apiPost('/vendors', payload, session?.access_token);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Your vendor application has been submitted successfully and is under review.');
      router.replace('/(vendor)/dashboard');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit vendor profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome name="chevron-left" size={16} color={Theme.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Vendor KYC Registration</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Intro */}
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Complete Your Profile</Text>
          <Text style={styles.introDesc}>
            Complete your KYC to start selling and listing products on Tolatola Tanzania.
          </Text>
        </View>

        {/* KYC Type selector */}
        <Text style={styles.sectionLabel}>Select KYC Type *</Text>
        <View style={styles.typeSelectorRow}>
          <Pressable
            style={[styles.typeCard, kycType === 'individual' && styles.typeCardActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setKycType('individual');
            }}
          >
            <View style={styles.radioHeader}>
              <FontAwesome name="user" size={18} color={kycType === 'individual' ? Theme.primary : Theme.textMuted} />
              <View style={[styles.radioCircle, kycType === 'individual' && styles.radioCircleActive]}>
                {kycType === 'individual' && <View style={styles.radioInner} />}
              </View>
            </View>
            <Text style={[styles.typeTitle, kycType === 'individual' && styles.typeTitleActive]}>Individual / Sole Trader</Text>
            <Text style={styles.typeDesc}>For individual business sellers</Text>
          </Pressable>

          <Pressable
            style={[styles.typeCard, kycType === 'company' && styles.typeCardActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setKycType('company');
            }}
          >
            <View style={styles.radioHeader}>
              <FontAwesome name="building" size={18} color={kycType === 'company' ? Theme.primary : Theme.textMuted} />
              <View style={[styles.radioCircle, kycType === 'company' && styles.radioCircleActive]}>
                {kycType === 'company' && <View style={styles.radioInner} />}
              </View>
            </View>
            <Text style={[styles.typeTitle, kycType === 'company' && styles.typeTitleActive]}>Company</Text>
            <Text style={styles.typeDesc}>For registered corporate entities</Text>
          </Pressable>
        </View>

        {/* Business Info Section */}
        <Text style={styles.sectionTitle}>Business Information</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Business Name *</Text>
            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="e.g. ABC Traders"
              placeholderTextColor={Theme.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Business Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholder="e.g. +255 700 000 000"
              placeholderTextColor={Theme.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Business TIN Number *</Text>
            <TextInput
              style={styles.input}
              value={tinNumber}
              onChangeText={setTinNumber}
              placeholder="e.g. 123-456-789"
              placeholderTextColor={Theme.textMuted}
            />
          </View>
        </View>

        {/* Location Section */}
        <TanzaniaAddressForm
          value={addressData}
          onChange={setAddressData}
          onAddressComplete={handleAddressComplete}
        />

        <MapPicker
          latitude={latitude}
          longitude={longitude}
          onLocationSelect={({ lat, lng }) => {
            setLatitude(lat);
            setLongitude(lng);
          }}
          title="Pick Business Location"
        />


        {/* Representative details for Company */}
        {kycType === 'company' && (
          <>
            <Text style={styles.sectionTitle}>Company Representative Details</Text>
            <View style={styles.card}>
              <View style={styles.field}>
                <Text style={styles.label}>Representative's Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={repFullName}
                  onChangeText={setRepFullName}
                  placeholder="Director / Secretary full name"
                  placeholderTextColor={Theme.textMuted}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Representative Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  value={repPhone}
                  onChangeText={setRepPhone}
                  keyboardType="phone-pad"
                  placeholder="e.g. +255 700 000 000"
                  placeholderTextColor={Theme.textMuted}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Representative Position *</Text>
                <TextInput
                  style={styles.input}
                  value={repPosition}
                  onChangeText={setRepPosition}
                  placeholder="e.g. Managing Director"
                  placeholderTextColor={Theme.textMuted}
                />
              </View>

              <View style={styles.row2}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Representative TIN *</Text>
                  <TextInput
                    style={styles.input}
                    value={repTin}
                    onChangeText={setRepTin}
                    placeholder="Representative TIN"
                    placeholderTextColor={Theme.textMuted}
                  />
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Representative NIDA ID *</Text>
                  <TextInput
                    style={styles.input}
                    value={repNationalId}
                    onChangeText={setRepNationalId}
                    placeholder="NIDA Number"
                    placeholderTextColor={Theme.textMuted}
                  />
                </View>
              </View>
            </View>
          </>
        )}

        {/* License Document Section */}
        <Text style={styles.sectionTitle}>Business License Document</Text>
        <View style={styles.docCard}>
          <Text style={styles.docLabel}>Valid Business License *</Text>
          <Text style={styles.docDesc}>Upload a clear image/photo of your valid commercial business license (max 5MB).</Text>
          
          {businessLicense ? (
            <View style={styles.docPreview}>
              <Image source={{ uri: businessLicense }} style={styles.docImage} resizeMode="cover" />
              <Pressable style={styles.docRemoveBtn} onPress={() => setBusinessLicense('')}>
                <FontAwesome name="times" size={14} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <View style={styles.docActions}>
              <Pressable style={styles.docActionBtn} onPress={() => pickImage(false)} disabled={uploadingLicense}>
                <FontAwesome name="upload" size={20} color={Theme.textMuted} />
                <Text style={styles.docActionText}>Upload File</Text>
              </Pressable>
              <Pressable style={styles.docActionBtn} onPress={() => pickImage(true)} disabled={uploadingLicense}>
                <FontAwesome name="camera" size={20} color={Theme.textMuted} />
                <Text style={styles.docActionText}>Take Photo</Text>
              </Pressable>
            </View>
          )}

          {uploadingLicense && <ActivityIndicator color={Theme.primary} style={{ marginTop: 8 }} />}
        </View>

        {/* Submit */}
        <Pressable 
          style={[styles.submitBtn, (submitting || uploadingLicense) && { opacity: 0.5 }]} 
          onPress={handleSubmit} 
          disabled={submitting || uploadingLicense}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <FontAwesome name="shield" size={16} color="#fff" />
              <Text style={styles.submitText}>Submit for Review</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingBottom: 16, 
    backgroundColor: Theme.background, 
    borderBottomWidth: 1, 
    borderBottomColor: Theme.inputBorder 
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Theme.text },
  scrollContent: { padding: 20, paddingBottom: 48, gap: 16 },
  introSection: { marginBottom: 8 },
  introTitle: { fontSize: 22, fontWeight: '700', color: Theme.text, marginBottom: 6 },
  introDesc: { fontSize: 13, color: Theme.textSecondary, lineHeight: 18 },
  
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Theme.textSecondary, textTransform: 'uppercase', marginBottom: 2 },
  typeSelectorRow: { flexDirection: 'row', gap: 12 },
  typeCard: { flex: 1, backgroundColor: Theme.background, padding: 14, borderRadius: Theme.radiusMd, borderWidth: 2, borderColor: Theme.inputBorder },
  typeCardActive: { borderColor: Theme.primary, backgroundColor: Theme.primary + '04' },
  radioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: Theme.textMuted, alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { borderColor: Theme.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Theme.primary },
  typeTitle: { fontSize: 13, fontWeight: '700', color: Theme.textSecondary, marginBottom: 2 },
  typeTitleActive: { color: Theme.text },
  typeDesc: { fontSize: 10, color: Theme.textMuted },
  
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Theme.text, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: Theme.background, padding: 16, borderRadius: Theme.radiusLg, borderWidth: 1, borderColor: Theme.inputBorder, gap: 14 },
  row2: { flexDirection: 'row', gap: 12 },
  field: { gap: 6 },
  label: { fontSize: 11, fontWeight: '600', color: Theme.textSecondary },
  input: { height: 46, backgroundColor: Theme.inputBg, borderRadius: Theme.radiusSm, borderWidth: 1, borderColor: Theme.inputBorder, paddingHorizontal: 12, fontSize: 14, color: Theme.text },
  
  docCard: { backgroundColor: Theme.background, borderRadius: Theme.radiusLg, padding: 16, borderWidth: 1, borderColor: Theme.inputBorder, gap: 10 },
  docLabel: { fontSize: 13, fontWeight: '700', color: Theme.text },
  docDesc: { fontSize: 11, color: Theme.textMuted, lineHeight: 16 },
  docPreview: { position: 'relative', borderRadius: Theme.radiusSm, overflow: 'hidden', marginTop: 4 },
  docImage: { width: '100%', height: 180, borderRadius: Theme.radiusSm },
  docRemoveBtn: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(239,68,68,0.9)', alignItems: 'center', justifyContent: 'center' },
  docActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  docActionBtn: { flex: 1, height: 80, borderWidth: 2, borderColor: Theme.inputBorder, borderStyle: 'dashed', borderRadius: Theme.radiusSm, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Theme.backgroundSecondary },
  docActionText: { fontSize: 11, color: Theme.textMuted, fontWeight: '600' },
  
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Theme.primary, paddingVertical: 16, borderRadius: Theme.radiusMd, marginTop: 12 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
