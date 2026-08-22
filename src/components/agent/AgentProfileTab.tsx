import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import type { AgentProfile } from '@/src/hooks/useAgentDashboardData';

interface Props {
  agentProfile: AgentProfile | null;
  onLogout: () => void;
}

export function AgentProfileTab({ agentProfile, onLogout }: Props) {
  return (
    <View>
      <View style={styles.profileSection}>
        {/* Agent Avatar Badge */}
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>
            {agentProfile?.users?.full_name?.charAt(0) || 'A'}
          </Text>
        </View>

        <Text style={styles.profileName}>{agentProfile?.users?.full_name || 'Agent'}</Text>
        <Text style={styles.profileCode}>{agentProfile?.agent_code || 'TOLA-AG-XXXX'}</Text>

        {/* Agent Detail Information Grid */}
        <View style={styles.profileInfoCard}>
          <View style={styles.profileInfoRow}>
            <Text style={styles.profileInfoLabel}>Email:</Text>
            <Text style={styles.profileInfoValue}>{agentProfile?.users?.email || 'N/A'}</Text>
          </View>
          <View style={styles.profileInfoRow}>
            <Text style={styles.profileInfoLabel}>Phone:</Text>
            <Text style={styles.profileInfoValue}>{agentProfile?.phone || agentProfile?.users?.phone || 'N/A'}</Text>
          </View>
          <View style={styles.profileInfoRow}>
            <Text style={styles.profileInfoLabel}>Territory:</Text>
            <Text style={styles.profileInfoValue}>
              {agentProfile?.area ? `${agentProfile.area}, ` : ''}
              {agentProfile?.district ? `${agentProfile.district}, ` : ''}
              {agentProfile?.region || 'Tanzania'}
            </Text>
          </View>
          <View style={styles.profileInfoRow}>
            <Text style={styles.profileInfoLabel}>Registered On:</Text>
            <Text style={styles.profileInfoValue}>
              {agentProfile?.created_at ? new Date(agentProfile.created_at).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>

        <Pressable style={styles.profileLogoutBtn} onPress={onLogout}>
          <FontAwesome name="sign-out" size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.profileLogoutBtnText}>Log Out Account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileSection: { alignItems: 'center', paddingVertical: 10 },
  profileAvatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Theme.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: Theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  profileAvatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  profileName: { fontSize: 18, fontWeight: '800', color: Theme.text },
  profileCode: { fontSize: 12, color: Theme.textSecondary, fontWeight: '600', marginTop: 4, textTransform: 'uppercase' },
  profileInfoCard: { backgroundColor: Theme.background, borderRadius: 12, borderWidth: 1, borderColor: Theme.inputBorder, width: '100%', padding: 16, marginTop: 24, gap: 12 },
  profileInfoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Theme.inputBg },
  profileInfoLabel: { fontSize: 12, color: Theme.textMuted, fontWeight: '600' },
  profileInfoValue: { fontSize: 12, color: Theme.text, fontWeight: '700' },
  profileLogoutBtn: { flexDirection: 'row', backgroundColor: '#dc2626', borderRadius: 10, width: '100%', paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  profileLogoutBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
