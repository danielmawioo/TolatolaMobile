import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Theme } from '@/constants/Theme';
import { apiPost } from '@/src/services/api';

interface RegisterUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'vendor' | 'customer' | 'transporter';
  accessToken: string;
  onSuccess: () => void;
}

export function RegisterUserModal({
  isOpen,
  onClose,
  type,
  accessToken,
  onSuccess,
}: RegisterUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [area, setArea] = useState('');

  // Auto-captured metadata
  const [gps, setGps] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [gpsStatus, setGpsStatus] = useState<'loading' | 'success' | 'error'>('loading');

  // Load geo location on open
  useEffect(() => {
    if (isOpen) {
      setGpsStatus('loading');
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setGpsStatus('error');
            return;
          }
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setGps({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          });
          setGpsStatus('success');
        } catch (err) {
          console.error('[AGENT REGISTRATION] GPS error:', err);
          setGpsStatus('error');
        }
      })();
    }
  }, [isOpen]);

  const handleClose = () => {
    setFullName('');
    setPhone('');
    setEmail('');
    setRegion('');
    setDistrict('');
    setArea('');
    onClose();
  };

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!fullName.trim() || !phone.trim()) {
      Alert.alert('Registration Error', 'Please fill in both Full Name and Phone Number.');
      return;
    }

    setIsLoading(true);

    try {
      const deviceOS = `${Platform.OS} ${Platform.Version}`;
      
      await apiPost(
        '/agents/registrations',
        {
          registration_type: type,
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          gps_latitude: gps.lat,
          gps_longitude: gps.lng,
          region: region.trim() || undefined,
          district: district.trim() || undefined,
          area: area.trim() || undefined,
          device_info: `TolatolaMobile (${deviceOS})`,
          referral_source: 'agent_mobile',
        },
        accessToken
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Success',
        `User ${fullName} has been fully registered as a ${type}.`
      );
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('[AGENT REGISTRATION] Submission error:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Registration Failed', err.message || 'An error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>New Registration: {type}</Text>
              <Text style={styles.subtitle}>Fill in this form to register a new user.</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeBtn}>
              <FontAwesome name="times" size={20} color={Theme.textSecondary} />
            </Pressable>
          </View>

          {/* Form */}
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g., John Doe"
              placeholderTextColor={Theme.textMuted}
              value={fullName}
              onChangeText={setFullName}
              editable={!isLoading}
            />

            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g., +255 712 345 678"
              placeholderTextColor={Theme.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!isLoading}
            />

            <Text style={styles.label}>Email Address (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g., john@example.com"
              placeholderTextColor={Theme.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />

            <Text style={styles.label}>Region / State</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g., Dar es Salaam"
              placeholderTextColor={Theme.textMuted}
              value={region}
              onChangeText={setRegion}
              editable={!isLoading}
            />

            <Text style={styles.label}>District</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g., Kinondoni"
              placeholderTextColor={Theme.textMuted}
              value={district}
              onChangeText={setDistrict}
              editable={!isLoading}
            />

            <Text style={styles.label}>Area / Ward</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g., Masaki"
              placeholderTextColor={Theme.textMuted}
              value={area}
              onChangeText={setArea}
              editable={!isLoading}
            />

            {/* GPS Capture Indicator */}
            <View style={styles.gpsWrap}>
              <View style={[styles.gpsIndicator, gpsStatus === 'success' ? styles.gpsSuccess : gpsStatus === 'error' ? styles.gpsError : styles.gpsLoading]}>
                <FontAwesome
                  name={gpsStatus === 'success' ? 'check-circle' : gpsStatus === 'error' ? 'exclamation-circle' : 'refresh'}
                  size={12}
                  color="#fff"
                />
              </View>
              <Text style={styles.gpsText}>
                {gpsStatus === 'loading' && 'Acquiring GPS coordinates...'}
                {gpsStatus === 'success' && `GPS Locked: ${gps.lat?.toFixed(5)}, ${gps.lng?.toFixed(5)}`}
                {gpsStatus === 'error' && 'Failed to capture GPS. Please enable Location.'}
              </Text>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Pressable
              style={[styles.btn, styles.cancelBtn]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.btn, styles.submitBtn, isLoading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Registration</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: Theme.radiusLg * 1.5,
    borderTopRightRadius: Theme.radiusLg * 1.5,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: Theme.inputBorder,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.text,
    textTransform: 'capitalize',
  },
  subtitle: {
    fontSize: 12,
    color: Theme.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  },
  formScroll: {
    maxHeight: 400,
  },
  formContent: {
    padding: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Theme.inputBg,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    borderRadius: Theme.radiusMd,
    padding: 12,
    fontSize: 15,
    color: Theme.text,
    marginBottom: 16,
  },
  gpsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.backgroundSecondary,
    padding: 12,
    borderRadius: Theme.radiusMd,
    marginTop: 4,
    marginBottom: 8,
  },
  gpsIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  gpsLoading: {
    backgroundColor: '#f59e0b',
  },
  gpsSuccess: {
    backgroundColor: '#10b981',
  },
  gpsError: {
    backgroundColor: '#ef4444',
  },
  gpsText: {
    fontSize: 12,
    color: Theme.textSecondary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderColor: Theme.inputBorder,
    gap: 12,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: Theme.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    backgroundColor: '#fff',
  },
  cancelBtnText: {
    color: Theme.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: Theme.primary,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
