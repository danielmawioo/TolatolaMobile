import React, { useState } from 'react';
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

const VEHICLE_TYPES = [
  { value: 'bodaboda', label: 'Bodaboda (Motorcycle)' },
  { value: 'bajaj', label: 'Bajaj (Three-Wheeler)' },
  { value: 'car', label: 'Car / Small Van' },
  { value: 'canter', label: 'Canter / Fuso Truck' },
  { value: 'semi_trailer', label: 'Semi Trailer Truck' },
  { value: 'flight', label: 'Air Transport' },
];

export default function TransporterRegisterScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [businessName, setBusinessName] = useState('');
  const [vehicleType, setVehicleType] = useState('bodaboda');
  const [vehicleRegistration, setVehicleRegistration] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [phone, setPhone] = useState('');
  
  const [idDocument, setIdDocument] = useState('');
  const [driverLicense, setDriverLicense] = useState('');
  
  const [uploadingDoc, setUploadingDoc] = useState<'id' | 'license' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);

  const requestPermissions = async () => {
    const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (camStatus !== 'granted' || libStatus !== 'granted') {
      Alert.alert('Permissions Required', 'Camera and photo library access needed to upload documents.');
      return false;
    }
    return true;
  };

  const pickImage = async (docType: 'id' | 'license', useCamera: boolean) => {
    const hasPerms = await requestPermissions();
    if (!hasPerms) return;

    setUploadingDoc(docType);
    try {
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: true });

      if (result.canceled || !result.assets?.[0]) { setUploadingDoc(null); return; }

      const asset = result.assets[0];
      const base64 = asset.base64;
      if (!base64) { Alert.alert('Error', 'Failed to read image data'); setUploadingDoc(null); return; }

      const ext = asset.uri.split('.').pop() || 'jpg';
      const contentType = `image/${ext === 'png' ? 'png' : 'jpeg'}`;
      const filename = `transporter_${docType}_${Date.now()}.${ext}`;

      const uploadRes = await apiPost<any>('/transporters/documents', {
        filename, data: base64, contentType,
      }, session?.access_token);

      if (uploadRes?.url) {
        if (docType === 'id') {
          setIdDocument(uploadRes.url);
        } else {
          setDriverLicense(uploadRes.url);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Error', 'Upload failed — no URL returned');
      }
    } catch (e: any) {
      Alert.alert('Upload Error', e.message || 'Failed to upload document');
    }
    setUploadingDoc(null);
  };

  const showUploadOptions = (docType: 'id' | 'license') => {
    Alert.alert('Upload Document', 'Choose how to upload your document', [
      { text: 'Take Photo', onPress: () => pickImage(docType, true) },
      { text: 'Choose from Library', onPress: () => pickImage(docType, false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    if (!vehicleRegistration || !licenseNumber || !region || !district || !phone) {
      Alert.alert('Required Fields', 'Please fill in all fields marked with *');
      return;
    }

    if (!idDocument || !driverLicense) {
      Alert.alert('Documents Required', 'Please upload both your ID Document and Driver License');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        business_name: businessName || undefined,
        vehicle_type: vehicleType,
        vehicle_registration: vehicleRegistration,
        license_number: licenseNumber,
        region,
        district,
        phone,
        id_document_url: idDocument,
        driver_license_url: driverLicense,
        kyc_status: 'pending',
      };

      await apiPost('/transporters', payload, session?.access_token);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Your transporter profile has been submitted successfully and is under review.');
      router.replace('/(transporter)/dashboard');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit transporter profile');
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
        <Text style={styles.headerTitle}>Transporter Registration</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Intro */}
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Join the Logistics Team</Text>
          <Text style={styles.introDesc}>
            Complete your transporter registration and KYC details to start claiming trips and delivering packages.
          </Text>
        </View>

        {/* Basic Info Section */}
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Business Name / Display Name</Text>
            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="e.g. Mwakaleli Deliveries (Optional)"
              placeholderTextColor={Theme.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Transporter Contact Phone *</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="e.g. +255 700 000 000"
              placeholderTextColor={Theme.textMuted}
            />
          </View>
        </View>

        {/* Vehicle Details */}
        <Text style={styles.sectionTitle}>Vehicle Details</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Vehicle Type *</Text>
            <Pressable style={styles.picker} onPress={() => setShowVehiclePicker(!showVehiclePicker)}>
              <Text style={styles.pickerText}>{VEHICLE_TYPES.find(t => t.value === vehicleType)?.label}</Text>
              <FontAwesome name="chevron-down" size={10} color={Theme.textMuted} />
            </Pressable>
            {showVehiclePicker && (
              <View style={styles.dropdown}>
                {VEHICLE_TYPES.map(t => (
                  <Pressable 
                    key={t.value} 
                    style={[styles.dropItem, vehicleType === t.value && styles.dropItemActive]} 
                    onPress={() => {
                      setVehicleType(t.value);
                      setShowVehiclePicker(false);
                    }}
                  >
                    <Text style={[styles.dropText, vehicleType === t.value && { color: Theme.primary, fontWeight: '700' }]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Vehicle Registration Number *</Text>
            <TextInput
              style={styles.input}
              value={vehicleRegistration}
              onChangeText={setVehicleRegistration}
              placeholder="e.g. T 123 ABC"
              autoCapitalize="characters"
              placeholderTextColor={Theme.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Driver License Number *</Text>
            <TextInput
              style={styles.input}
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              placeholder="e.g. DL-123456789"
              placeholderTextColor={Theme.textMuted}
            />
          </View>
        </View>

        {/* Operating Area */}
        <Text style={styles.sectionTitle}>Operating Location</Text>
        <View style={styles.card}>
          <View style={styles.row2}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Region *</Text>
              <TextInput
                style={styles.input}
                value={region}
                onChangeText={setRegion}
                placeholder="e.g. Dar es Salaam"
                placeholderTextColor={Theme.textMuted}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>District *</Text>
              <TextInput
                style={styles.input}
                value={district}
                onChangeText={setDistrict}
                placeholder="e.g. Kinondoni"
                placeholderTextColor={Theme.textMuted}
              />
            </View>
          </View>
        </View>

        {/* Verification Documents */}
        <Text style={styles.sectionTitle}>Verification Documents</Text>

        {/* ID Document Card */}
        <View style={styles.docCard}>
          <Text style={styles.docLabel}>ID Document (NIDA / Passport / Voter ID) *</Text>
          <Text style={styles.docDesc}>Upload a clear photo of the front page of your government-issued ID card.</Text>
          
          {idDocument ? (
            <View style={styles.docPreview}>
              <Image source={{ uri: idDocument }} style={styles.docImage} resizeMode="cover" />
              <Pressable style={styles.docRemoveBtn} onPress={() => setIdDocument('')}>
                <FontAwesome name="times" size={14} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <View style={styles.docActions}>
              <Pressable style={styles.docActionBtn} onPress={() => pickImage('id', false)} disabled={uploadingDoc !== null}>
                <FontAwesome name="upload" size={20} color={Theme.textMuted} />
                <Text style={styles.docActionText}>Upload File</Text>
              </Pressable>
              <Pressable style={styles.docActionBtn} onPress={() => pickImage('id', true)} disabled={uploadingDoc !== null}>
                <FontAwesome name="camera" size={20} color={Theme.textMuted} />
                <Text style={styles.docActionText}>Take Photo</Text>
              </Pressable>
            </View>
          )}

          {uploadingDoc === 'id' && <ActivityIndicator color={Theme.primary} style={{ marginTop: 8 }} />}
        </View>

        {/* Driver License Card */}
        <View style={styles.docCard}>
          <Text style={styles.docLabel}>Driver License *</Text>
          <Text style={styles.docDesc}>Upload a clear photo of your valid driver's license card.</Text>
          
          {driverLicense ? (
            <View style={styles.docPreview}>
              <Image source={{ uri: driverLicense }} style={styles.docImage} resizeMode="cover" />
              <Pressable style={styles.docRemoveBtn} onPress={() => setDriverLicense('')}>
                <FontAwesome name="times" size={14} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <View style={styles.docActions}>
              <Pressable style={styles.docActionBtn} onPress={() => pickImage('license', false)} disabled={uploadingDoc !== null}>
                <FontAwesome name="upload" size={20} color={Theme.textMuted} />
                <Text style={styles.docActionText}>Upload File</Text>
              </Pressable>
              <Pressable style={styles.docActionBtn} onPress={() => pickImage('license', true)} disabled={uploadingDoc !== null}>
                <FontAwesome name="camera" size={20} color={Theme.textMuted} />
                <Text style={styles.docActionText}>Take Photo</Text>
              </Pressable>
            </View>
          )}

          {uploadingDoc === 'license' && <ActivityIndicator color={Theme.primary} style={{ marginTop: 8 }} />}
        </View>

        {/* Submit */}
        <Pressable 
          style={[styles.submitBtn, (submitting || uploadingDoc !== null) && { opacity: 0.5 }]} 
          onPress={handleSubmit} 
          disabled={submitting || uploadingDoc !== null}
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
  
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Theme.text, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: Theme.background, padding: 16, borderRadius: Theme.radiusLg, borderWidth: 1, borderColor: Theme.inputBorder, gap: 14 },
  row2: { flexDirection: 'row', gap: 12 },
  field: { gap: 6 },
  label: { fontSize: 11, fontWeight: '600', color: Theme.textSecondary },
  input: { height: 46, backgroundColor: Theme.inputBg, borderRadius: Theme.radiusSm, borderWidth: 1, borderColor: Theme.inputBorder, paddingHorizontal: 12, fontSize: 14, color: Theme.text },
  
  picker: { height: 46, backgroundColor: Theme.inputBg, borderRadius: Theme.radiusSm, borderWidth: 1, borderColor: Theme.inputBorder, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerText: { fontSize: 14, color: Theme.text, fontWeight: '500' },
  dropdown: { backgroundColor: '#fff', borderRadius: Theme.radiusSm, borderWidth: 1, borderColor: Theme.inputBorder, marginTop: 4, ...Theme.shadowMd },
  dropItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 0.5, borderBottomColor: Theme.inputBorder },
  dropItemActive: { backgroundColor: Theme.primary + '08' },
  dropText: { fontSize: 14, color: Theme.text },

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
