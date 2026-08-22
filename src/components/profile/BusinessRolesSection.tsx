import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';
import { useAuth } from '@/src/contexts/AuthContext';

type RoleKind = 'vendor' | 'transporter';

interface RoleCardConfig {
  role: RoleKind;
  title: string;
  icon: string;
  accentColor: string;
  activeDesc: string;
  pendingDesc: string;
  rejectedDesc: string;
  defaultDesc: string;
  dashboardPath: string;
  registerPath: string;
}

const ROLE_CARDS: RoleCardConfig[] = [
  {
    role: 'vendor',
    title: 'Seller',
    icon: 'shopping-bag',
    accentColor: Theme.primary,
    activeDesc: 'Your seller account is active',
    pendingDesc: 'Application under review',
    rejectedDesc: 'Application was not approved',
    defaultDesc: 'Sell your products on TOLA',
    dashboardPath: '/(vendor)/dashboard',
    registerPath: '/(vendor)/register',
  },
  {
    role: 'transporter',
    title: 'Transporter',
    icon: 'truck',
    accentColor: '#10b981',
    activeDesc: 'Your transporter account is active',
    pendingDesc: 'Application under review',
    rejectedDesc: 'Application was not approved',
    defaultDesc: 'Deliver orders across Tanzania',
    dashboardPath: '/(transporter)/dashboard',
    registerPath: '/(transporter)/register',
  },
];

/**
 * "Your Business Roles" section of the profile screen — lets a customer
 * apply for (or switch into) the Seller and Transporter roles.
 */
export function BusinessRolesSection() {
  const { session, switchRole } = useAuth();
  const [switchingRole, setSwitchingRole] = useState<string | null>(null);

  return (
    <View style={styles.rolesSection}>
      <Text style={styles.rolesSectionTitle}>Your Business Roles</Text>
      <Text style={styles.rolesSectionSubtitle}>Expand your account — sell products or deliver orders</Text>

      {ROLE_CARDS.map((config) => {
        const roleProfile = (session?.user as any)?.[config.role];
        const roleStatus = roleProfile?.kyc_status;
        const isApproved = roleStatus === 'approved';
        const isPending = roleStatus === 'pending';
        const isRejected = roleStatus === 'rejected';
        const isSwitching = switchingRole === config.role;

        return (
          <View
            key={config.role}
            style={[styles.roleCard, isApproved && styles.roleCardApproved, isPending && styles.roleCardPending, isRejected && styles.roleCardRejected]}
          >
            <View style={styles.roleCardHeader}>
              <View style={[styles.roleIconBox, { backgroundColor: isApproved ? '#16a34a' : isPending ? '#d97706' : isRejected ? '#dc2626' : config.accentColor }]}>
                <FontAwesome name={config.icon as any} size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleCardTitle}>{config.title}</Text>
                <Text style={styles.roleCardDesc}>
                  {isApproved ? config.activeDesc : isPending ? config.pendingDesc : isRejected ? config.rejectedDesc : config.defaultDesc}
                </Text>
              </View>
              {isApproved && (
                <View style={styles.roleApprovedBadge}>
                  <FontAwesome name="check-circle" size={12} color="#16a34a" />
                  <Text style={styles.roleApprovedBadgeText}>Active</Text>
                </View>
              )}
              {isPending && (
                <View style={[styles.roleApprovedBadge, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]}>
                  <FontAwesome name="clock-o" size={12} color="#d97706" />
                  <Text style={[styles.roleApprovedBadgeText, { color: '#92400e' }]}>Pending</Text>
                </View>
              )}
              {isRejected && (
                <View style={[styles.roleApprovedBadge, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                  <FontAwesome name="times-circle" size={12} color="#dc2626" />
                  <Text style={[styles.roleApprovedBadgeText, { color: '#991b1b' }]}>Rejected</Text>
                </View>
              )}
            </View>
            {isRejected && roleProfile?.kyc_notes && (
              <View style={styles.rejectionReasonBox}>
                <Text style={styles.rejectionReasonLabel}>Reason:</Text>
                <Text style={styles.rejectionReasonText}>{roleProfile.kyc_notes}</Text>
              </View>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.roleActionBtn,
                isApproved ? { backgroundColor: '#16a34a' } : isRejected ? { backgroundColor: '#dc2626' } : isPending ? { backgroundColor: '#9ca3af' } : { backgroundColor: config.accentColor },
                (pressed || isSwitching) && { opacity: 0.7 },
              ]}
              disabled={isPending || isSwitching}
              onPress={async () => {
                if (isApproved) {
                  try {
                    setSwitchingRole(config.role);
                    await switchRole(config.role);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    router.push(config.dashboardPath as any);
                  } catch (e: any) {
                    Alert.alert('Error', e.message || 'Failed to switch role');
                  } finally {
                    setSwitchingRole(null);
                  }
                } else {
                  router.push(config.registerPath as any);
                }
              }}
            >
              {isSwitching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.roleActionBtnText}>
                    {isApproved ? `Switch to ${config.title} Dashboard` : isPending ? 'Under Review' : isRejected ? 'Reapply' : `Become a ${config.title}`}
                  </Text>
                  {!isPending && <FontAwesome name="arrow-right" size={12} color="#fff" />}
                </>
              )}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rolesSection: {
    marginBottom: 20,
    gap: 12,
  },
  rolesSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Theme.text,
    letterSpacing: -0.3,
  },
  rolesSectionSubtitle: {
    fontSize: 13,
    color: Theme.textMuted,
    marginBottom: 4,
  },
  roleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 16,
    gap: 12,
    ...Theme.shadowSm,
  },
  roleCardApproved: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  roleCardPending: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  roleCardRejected: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadowSm,
  },
  roleCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.text,
  },
  roleCardDesc: {
    fontSize: 12,
    color: Theme.textMuted,
    marginTop: 2,
  },
  roleApprovedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleApprovedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  rejectionReasonBox: {
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  rejectionReasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 2,
  },
  rejectionReasonText: {
    fontSize: 12,
    color: '#7f1d1d',
    lineHeight: 18,
  },
  roleActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    ...Theme.shadowSm,
  },
  roleActionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
