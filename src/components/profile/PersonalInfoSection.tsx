import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';

interface FormData {
  full_name: string;
  phone: string;
}

interface Props {
  editing: boolean;
  setEditing: (editing: boolean) => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  loading: boolean;
  onSave: () => void;
  userName: string;
  userEmail: string;
  userType: string;
  phone: string;
}

/**
 * "Personal Info" tab: read-only profile summary, or an editable form for
 * full name and phone number.
 */
export function PersonalInfoSection({ editing, setEditing, formData, setFormData, loading, onSave, userName, userEmail, userType, phone }: Props) {
  return (
    <View style={styles.tabContentInner}>
      {editing ? (
        <View style={styles.infoCard}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput style={styles.fieldInput} value={formData.full_name} onChangeText={(t) => setFormData(f => ({ ...f, full_name: t }))} placeholder="Your full name" />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={[styles.fieldValue, { color: Theme.textMuted }]}>{userEmail}</Text>
            <Text style={styles.fieldHint}>Email cannot be changed here</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput style={styles.fieldInput} value={formData.phone} onChangeText={(t) => setFormData(f => ({ ...f, phone: t }))} placeholder="Phone number" keyboardType="phone-pad" />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Account Type</Text>
            <Text style={styles.fieldValue}>{userType}</Text>
          </View>
          <View style={styles.editActions}>
            <Pressable style={styles.cancelEditBtn} onPress={() => setEditing(false)}>
              <Text style={styles.cancelEditText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.saveBtn, loading && { opacity: 0.5 }]} onPress={onSave} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.infoCard}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <Text style={styles.fieldValue}>{userName}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={[styles.fieldValue, { color: Theme.textMuted }]}>{userEmail}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <Text style={styles.fieldValue}>{String(phone || 'Not provided')}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Account Type</Text>
            <Text style={[styles.fieldValue, { textTransform: 'capitalize' }]}>{userType}</Text>
          </View>
          <Pressable style={styles.editProfileBtn} onPress={() => setEditing(true)}>
            <FontAwesome name="edit" size={14} color="#fff" />
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabContentInner: {
    gap: 16,
  },
  infoCard: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.textSecondary,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '500',
    color: Theme.text,
  },
  fieldInput: {
    backgroundColor: Theme.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Theme.text,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  fieldHint: {
    fontSize: 11,
    color: Theme.textMuted,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelEditBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelEditText: {
    fontWeight: '600',
    color: Theme.textSecondary,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: Theme.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Theme.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  editProfileBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
