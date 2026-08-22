import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { ThemeToggle } from '@/src/components/ThemeToggle';

interface PasswordData {
  current: string;
  newPw: string;
  confirm: string;
}

interface Props {
  passwordData: PasswordData;
  setPasswordData: React.Dispatch<React.SetStateAction<PasswordData>>;
  changingPw: boolean;
  onChangePassword: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

/**
 * "Settings" tab: password change form, appearance toggle, and the
 * danger-zone actions (sign out / delete account).
 */
export function AccountSettingsSection({ passwordData, setPasswordData, changingPw, onChangePassword, onLogout, onDeleteAccount }: Props) {
  return (
    <View style={styles.tabContentInner}>
      <Text style={styles.settingsTitle}>Security</Text>
      <Text style={styles.settingsDesc}>Manage your password and security preferences.</Text>
      <View style={styles.infoCard}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Current Password</Text>
          <TextInput style={styles.fieldInput} value={passwordData.current} onChangeText={t => setPasswordData(p => ({ ...p, current: t }))} secureTextEntry placeholder="Current password" />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>New Password</Text>
          <TextInput style={styles.fieldInput} value={passwordData.newPw} onChangeText={t => setPasswordData(p => ({ ...p, newPw: t }))} secureTextEntry placeholder="New password" />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Confirm Password</Text>
          <TextInput style={styles.fieldInput} value={passwordData.confirm} onChangeText={t => setPasswordData(p => ({ ...p, confirm: t }))} secureTextEntry placeholder="Confirm new password" />
        </View>
        <Pressable style={[styles.editProfileBtn, changingPw && { opacity: 0.5 }]} onPress={onChangePassword} disabled={changingPw}>
          {changingPw ? <ActivityIndicator color="#fff" /> : <Text style={styles.editProfileBtnText}>Update Password</Text>}
        </Pressable>
      </View>

      <Text style={[styles.settingsTitle, { marginTop: 24 }]}>Appearance & Theme</Text>
      <Text style={styles.settingsDesc}>Switch between Light and Dark mode.</Text>
      <View style={[styles.infoCard, { alignItems: 'flex-start', paddingTop: 8 }]}>
        <ThemeToggle />
      </View>

      <Text style={[styles.settingsTitle, { color: Theme.error, marginTop: 24 }]}>Danger Zone</Text>
      <View style={styles.dangerCard}>
        <View style={styles.dangerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerLabel}>Sign out</Text>
            <Text style={styles.dangerDesc}>Sign out on this device.</Text>
          </View>
          <Pressable style={styles.dangerBtn} onPress={onLogout}>
            <FontAwesome name="sign-out" size={14} color={Theme.error} />
            <Text style={styles.dangerBtnText}>Sign Out</Text>
          </Pressable>
        </View>
        <View style={styles.dangerDivider} />
        <View style={styles.dangerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerLabel}>Delete Account</Text>
            <Text style={styles.dangerDesc}>Permanently delete your data.</Text>
          </View>
          <Pressable style={[styles.dangerBtn, { backgroundColor: Theme.error + '10', borderColor: Theme.error }]} onPress={onDeleteAccount}>
            <Text style={[styles.dangerBtnText, { color: Theme.error }]}>Delete</Text>
          </Pressable>
        </View>
      </View>
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
  fieldInput: {
    backgroundColor: Theme.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Theme.text,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
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
  settingsTitle: { fontSize: 16, fontWeight: '700', color: Theme.text },
  settingsDesc: { fontSize: 13, color: Theme.textMuted },
  dangerCard: { backgroundColor: '#fef2f2', borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', padding: 16, gap: 0 },
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  dangerLabel: { fontSize: 14, fontWeight: '700', color: Theme.text },
  dangerDesc: { fontSize: 12, color: Theme.textMuted },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#fecaca', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  dangerBtnText: { fontSize: 13, fontWeight: '700', color: Theme.error },
  dangerDivider: { height: 1, backgroundColor: '#fecaca', marginVertical: 8 },
});
