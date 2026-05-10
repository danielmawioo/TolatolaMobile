import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  ActivityIndicator, Alert, Image, Platform,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';
import { apiGet, apiPost } from '@/src/services/api';

const ID_TYPES = [
  { id: 'nida', name: 'NIDA (National ID)' },
  { id: 'passport', name: 'Passport' },
  { id: 'drivers_license', name: "Driver's License" },
  { id: 'voters_id', name: "Voter's ID" },
];

interface Props { accessToken: string; userId: string; }

export function KycVerificationSection({ accessToken, userId }: Props) {
  const [kyc, setKyc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [showIdPicker, setShowIdPicker] = useState(false);

  const [form, setForm] = useState({
    full_name: '', date_of_birth: '', phone_number: '',
    address: '', city: '', region: '', postal_code: '',
    id_type: 'nida', id_number: '',
    id_document_front_url: '', id_document_back_url: '', selfie_url: '',
  });

  useEffect(() => { loadKyc(); }, [accessToken]);

  const loadKyc = async () => {
    try {
      const res = await apiGet<any>('/profile', accessToken);
      const kycData = res?.kyc || null;
      setKyc(kycData);
      if (kycData) {
        setForm(prev => ({
          ...prev,
          full_name: kycData.full_name || '',
          date_of_birth: kycData.date_of_birth || '',
          phone_number: kycData.phone_number || '',
          address: kycData.address || '',
          city: kycData.city || '',
          region: kycData.region || '',
          postal_code: kycData.postal_code || '',
          id_type: kycData.id_type || 'nida',
          id_number: kycData.id_number || '',
          id_document_front_url: kycData.id_document_front_url || '',
          id_document_back_url: kycData.id_document_back_url || '',
          selfie_url: kycData.selfie_url || '',
        }));
      }
    } catch (e) { console.error('KYC load error', e); }
    setLoading(false);
  };

  const status = kyc?.kyc_status?.toLowerCase();
  const canEdit = !kyc || status === 'rejected' || status === 'changes_requested';

  const requestPermissions = async () => {
    const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (camStatus !== 'granted' || libStatus !== 'granted') {
      Alert.alert('Permissions Required', 'Camera and photo library access needed for KYC verification.');
      return false;
    }
    return true;
  };

  const pickImage = async (docType: string, useCamera: boolean) => {
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
      const filename = `${userId}_${docType}_${Date.now()}.${ext}`;

      const uploadRes = await apiPost<any>('/kyc/upload', {
        filename, data: base64, contentType,
      }, accessToken);

      if (uploadRes?.url) {
        setForm(prev => ({ ...prev, [`${docType}_url`]: uploadRes.url }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Error', 'Upload failed — no URL returned');
      }
    } catch (e: any) {
      Alert.alert('Upload Error', e.message || 'Failed to upload document');
    }
    setUploadingDoc(null);
  };

  const showDocOptions = (docType: string) => {
    Alert.alert('Upload Document', 'Choose how to add your document', [
      { text: 'Take Photo', onPress: () => pickImage(docType, true) },
      { text: 'Choose from Library', onPress: () => pickImage(docType, false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    if (!form.full_name || !form.date_of_birth || !form.phone_number || !form.id_number) {
      Alert.alert('Required', 'Please fill in all required fields'); return;
    }
    if (!form.id_document_front_url) {
      Alert.alert('Required', 'Please upload the front of your ID document'); return;
    }
    if (!form.selfie_url) {
      Alert.alert('Required', 'Please upload a selfie with your ID'); return;
    }

    setSubmitting(true);
    try {
      await apiPost('/kyc', { ...form, user_id: userId }, accessToken);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Submitted', 'Your KYC application is now under review. We will notify you once processed.');
      loadKyc();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit KYC');
    }
    setSubmitting(false);
  };

  const updateField = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  if (loading) return <View style={s.center}><ActivityIndicator color={Theme.primary} /></View>;

  const renderStatusBanner = () => {
    if (!kyc) return (
      <View style={[s.banner, { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }]}>
        <FontAwesome name="info-circle" size={18} color="#4f46e5" />
        <View style={{ flex: 1 }}><Text style={[s.bannerTitle, { color: '#312e81' }]}>Verification Required</Text>
          <Text style={[s.bannerText, { color: '#4338ca' }]}>Complete KYC to unlock full TOLA features and build trust.</Text>
        </View>
      </View>
    );
    switch (status) {
      case 'approved': return (
        <View style={[s.banner, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
          <FontAwesome name="check-circle" size={18} color="#16a34a" />
          <View style={{ flex: 1 }}><Text style={[s.bannerTitle, { color: '#14532d' }]}>Verified Account</Text>
            <Text style={[s.bannerText, { color: '#15803d' }]}>Your identity has been verified. Full access granted.</Text>
          </View>
        </View>
      );
      case 'pending': return (
        <View style={[s.banner, { backgroundColor: '#fefce8', borderColor: '#fde68a' }]}>
          <FontAwesome name="clock-o" size={18} color="#ca8a04" />
          <View style={{ flex: 1 }}><Text style={[s.bannerTitle, { color: '#713f12' }]}>Under Review</Text>
            <Text style={[s.bannerText, { color: '#a16207' }]}>Your application is being reviewed. We'll notify you soon.</Text>
          </View>
        </View>
      );
      case 'rejected': return (
        <View style={[s.banner, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
          <FontAwesome name="times-circle" size={18} color="#dc2626" />
          <View style={{ flex: 1 }}><Text style={[s.bannerTitle, { color: '#7f1d1d' }]}>Verification Failed</Text>
            <Text style={[s.bannerText, { color: '#b91c1c' }]}>Your application was rejected. {kyc.kyc_notes ? `Reason: ${kyc.kyc_notes}` : 'Please resubmit.'}</Text>
          </View>
        </View>
      );
      case 'changes_requested': return (
        <View style={[s.banner, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
          <FontAwesome name="exclamation-circle" size={18} color="#ea580c" />
          <View style={{ flex: 1 }}><Text style={[s.bannerTitle, { color: '#7c2d12' }]}>Changes Requested</Text>
            <Text style={[s.bannerText, { color: '#c2410c' }]}>{kyc.kyc_notes || 'Please update your information and resubmit.'}</Text>
          </View>
        </View>
      );
      default: return null;
    }
  };

  const renderDocUpload = (label: string, docType: string, required: boolean, description: string) => {
    const urlKey = `${docType}_url` as keyof typeof form;
    const currentUrl = form[urlKey];
    const isUploading = uploadingDoc === docType;

    return (
      <View style={s.docCard}>
        <View style={s.docHeader}>
          <Text style={s.docLabel}>{label} {required && <Text style={{ color: '#ef4444' }}>*</Text>}</Text>
        </View>
        <Text style={s.docDesc}>{description}</Text>

        {currentUrl ? (
          <View style={s.docPreview}>
            <Image source={{ uri: currentUrl }} style={s.docImage} resizeMode="cover" />
            {canEdit && (
              <Pressable style={s.docRemoveBtn} onPress={() => setForm(prev => ({ ...prev, [urlKey]: '' }))}>
                <FontAwesome name="times" size={14} color="#fff" />
              </Pressable>
            )}
          </View>
        ) : canEdit ? (
          <View style={s.docActions}>
            <Pressable style={s.docActionBtn} onPress={() => pickImage(docType, false)} disabled={isUploading}>
              <FontAwesome name="upload" size={20} color={Theme.textMuted} />
              <Text style={s.docActionText}>Upload File</Text>
            </Pressable>
            <Pressable style={s.docActionBtn} onPress={() => pickImage(docType, true)} disabled={isUploading}>
              <FontAwesome name="camera" size={20} color={Theme.textMuted} />
              <Text style={s.docActionText}>Take Photo</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.docEmpty}><Text style={s.docEmptyText}>No document uploaded</Text></View>
        )}
        {isUploading && <ActivityIndicator color={Theme.primary} style={{ marginTop: 8 }} />}
      </View>
    );
  };

  return (
    <View style={s.container}>
      {renderStatusBanner()}

      <Text style={s.sectionTitle}>Identity Details</Text>
      <Text style={s.sectionDesc}>Provide your official identification details below.</Text>

      <View style={s.card}>
        <View style={s.row2}>
          <View style={[s.field, { flex: 1 }]}><Text style={s.label}>Full Name (as per ID) *</Text>
            <TextInput style={s.input} value={form.full_name} onChangeText={v => updateField('full_name', v)} editable={canEdit} placeholder="Full legal name" />
          </View>
          <View style={[s.field, { flex: 1 }]}><Text style={s.label}>Date of Birth *</Text>
            <TextInput style={s.input} value={form.date_of_birth} onChangeText={v => updateField('date_of_birth', v)} editable={canEdit} placeholder="YYYY-MM-DD" />
          </View>
        </View>
        <View style={s.row2}>
          <View style={[s.field, { flex: 1 }]}><Text style={s.label}>Phone Number *</Text>
            <TextInput style={s.input} value={form.phone_number} onChangeText={v => updateField('phone_number', v)} editable={canEdit} placeholder="+255..." keyboardType="phone-pad" />
          </View>
          <View style={[s.field, { flex: 1 }]}><Text style={s.label}>City *</Text>
            <TextInput style={s.input} value={form.city} onChangeText={v => updateField('city', v)} editable={canEdit} placeholder="City" />
          </View>
        </View>
        <View style={s.row2}>
          <View style={[s.field, { flex: 1 }]}><Text style={s.label}>Region *</Text>
            <TextInput style={s.input} value={form.region} onChangeText={v => updateField('region', v)} editable={canEdit} placeholder="Region" />
          </View>
          <View style={[s.field, { flex: 1 }]}><Text style={s.label}>Postal Code</Text>
            <TextInput style={s.input} value={form.postal_code} onChangeText={v => updateField('postal_code', v)} editable={canEdit} placeholder="Optional" />
          </View>
        </View>
        <View style={s.field}><Text style={s.label}>Full Address *</Text>
          <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} value={form.address} onChangeText={v => updateField('address', v)} editable={canEdit} placeholder="Street, ward, village..." multiline />
        </View>
      </View>

      {/* ID Documents */}
      <Text style={[s.sectionTitle, { marginTop: 8 }]}>Identification Documents</Text>

      <View style={s.card}>
        <View style={s.row2}>
          <View style={[s.field, { flex: 1 }]}><Text style={s.label}>ID Type *</Text>
            <Pressable style={s.picker} onPress={() => canEdit && setShowIdPicker(!showIdPicker)}>
              <Text style={s.pickerText}>{ID_TYPES.find(t => t.id === form.id_type)?.name}</Text>
              <FontAwesome name="chevron-down" size={10} color={Theme.textMuted} />
            </Pressable>
            {showIdPicker && (
              <View style={s.dropdown}>
                {ID_TYPES.map(t => (
                  <Pressable key={t.id} style={[s.dropItem, form.id_type === t.id && s.dropItemActive]} onPress={() => { updateField('id_type', t.id); setShowIdPicker(false); }}>
                    <Text style={[s.dropText, form.id_type === t.id && { color: Theme.primary, fontWeight: '700' }]}>{t.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
          <View style={[s.field, { flex: 1 }]}><Text style={s.label}>ID Number *</Text>
            <TextInput style={s.input} value={form.id_number} onChangeText={v => updateField('id_number', v)} editable={canEdit} placeholder="ID number" />
          </View>
        </View>
      </View>

      {renderDocUpload('ID Front', 'id_document_front', true, 'Clear photo of ID front side')}
      {renderDocUpload('ID Back', 'id_document_back', false, 'Clear photo of ID back (if applicable)')}
      {renderDocUpload('Selfie with ID', 'selfie', true, 'Your face and ID clearly visible together')}

      {canEdit && (
        <Pressable style={[s.submitBtn, (submitting || uploadingDoc !== null) && { opacity: 0.5 }]} onPress={handleSubmit} disabled={submitting || uploadingDoc !== null}>
          {submitting ? <ActivityIndicator color="#fff" /> : (
            <><FontAwesome name="shield" size={16} color="#fff" />
            <Text style={s.submitText}>{kyc ? 'Resubmit Application' : 'Submit Application'}</Text></>
          )}
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 14 },
  center: { padding: 40, alignItems: 'center' },
  // Banner
  banner: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: Theme.radiusMd, borderWidth: 1, alignItems: 'flex-start' },
  bannerTitle: { fontSize: 14, fontWeight: '700' },
  bannerText: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  // Section
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Theme.text },
  sectionDesc: { fontSize: 12, color: Theme.textMuted },
  // Card
  card: { backgroundColor: Theme.background, padding: 14, borderRadius: Theme.radiusLg, borderWidth: 1, borderColor: Theme.inputBorder, gap: 12 },
  row2: { flexDirection: 'row', gap: 10 },
  field: { gap: 4 },
  label: { fontSize: 10, fontWeight: '700', color: Theme.textSecondary, textTransform: 'uppercase' },
  input: { height: 44, backgroundColor: Theme.inputBg, borderRadius: Theme.radiusSm, borderWidth: 1, borderColor: Theme.inputBorder, paddingHorizontal: 12, fontSize: 14, color: Theme.text },
  picker: { height: 44, backgroundColor: Theme.inputBg, borderRadius: Theme.radiusSm, borderWidth: 1, borderColor: Theme.inputBorder, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerText: { fontSize: 13, color: Theme.text, fontWeight: '500' },
  dropdown: { backgroundColor: '#fff', borderRadius: Theme.radiusSm, borderWidth: 1, borderColor: Theme.inputBorder, marginTop: 4, ...Theme.shadowMd },
  dropItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: Theme.inputBorder },
  dropItemActive: { backgroundColor: Theme.primary + '08' },
  dropText: { fontSize: 13, color: Theme.text },
  // Document Upload
  docCard: { backgroundColor: Theme.backgroundSecondary, borderRadius: Theme.radiusMd, padding: 14, borderWidth: 1, borderColor: Theme.inputBorder, gap: 8 },
  docHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docLabel: { fontSize: 14, fontWeight: '600', color: Theme.text },
  docDesc: { fontSize: 11, color: Theme.textMuted },
  docPreview: { position: 'relative', borderRadius: Theme.radiusSm, overflow: 'hidden' },
  docImage: { width: '100%', height: 180, borderRadius: Theme.radiusSm },
  docRemoveBtn: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(239,68,68,0.9)', alignItems: 'center', justifyContent: 'center' },
  docActions: { flexDirection: 'row', gap: 10 },
  docActionBtn: { flex: 1, height: 80, borderWidth: 2, borderColor: Theme.inputBorder, borderStyle: 'dashed', borderRadius: Theme.radiusSm, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Theme.background },
  docActionText: { fontSize: 11, color: Theme.textMuted, fontWeight: '600' },
  docEmpty: { padding: 20, alignItems: 'center' },
  docEmptyText: { fontSize: 12, color: Theme.textMuted },
  // Submit
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#4f46e5', paddingVertical: 16, borderRadius: Theme.radiusMd, marginTop: 4 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
