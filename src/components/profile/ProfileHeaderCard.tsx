import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { OptimizedImage } from '@/components/OptimizedImage';

interface Props {
  userName: string;
  userEmail: string;
  initials: string;
  profileImageUrl?: string | null;
  rawKycStatus: string | undefined;
}

/**
 * Top-of-screen identity card: avatar (with verified badge when KYC is
 * approved), name, email, and the overall KYC status badge.
 */
export function ProfileHeaderCard({ userName, userEmail, initials, profileImageUrl, rawKycStatus }: Props) {
  const status = String(rawKycStatus || '').toLowerCase();
  const isApproved = status === 'approved';

  let badgeStyle = {};
  let textStyle = {};
  let label = 'Not Verified';

  if (status === 'approved') {
    badgeStyle = { backgroundColor: '#16a34a', borderWidth: 0 };
    textStyle = { color: '#ffffff' };
    label = 'Verified';
  } else if (status === 'pending') {
    badgeStyle = { backgroundColor: 'rgba(234, 179, 8, 0.15)', borderColor: '#fef08a', borderWidth: 1 };
    textStyle = { color: '#a16207' };
    label = 'Pending Review';
  } else if (status === 'rejected') {
    badgeStyle = { backgroundColor: '#dc2626', borderWidth: 0 };
    textStyle = { color: '#ffffff' };
    label = 'Rejected';
  } else if (status === 'changes_requested') {
    badgeStyle = { backgroundColor: '#fff7ed', borderColor: '#fed7aa', borderWidth: 1 };
    textStyle = { color: '#c2410c' };
    label = 'Changes Requested';
  } else {
    badgeStyle = { backgroundColor: '#e2e8f0', borderWidth: 0 };
    textStyle = { color: '#475569' };
    label = 'Not Verified';
  }

  return (
    <View style={styles.userHeaderCard}>
      <View style={{ position: 'relative' }}>
        <View style={styles.avatarCircle}>
          {profileImageUrl ? (
            <OptimizedImage
              source={profileImageUrl}
              width="100%"
              height="100%"
              style={{ borderRadius: 24 }}
            />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>
        {isApproved && (
          <View style={styles.verifiedMiniBadge}>
            <FontAwesome name="check-circle" size={14} color="#16a34a" />
          </View>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
        <Text style={styles.userEmail} numberOfLines={1}>{userEmail}</Text>
      </View>
      <View style={[styles.badgeWrapper, badgeStyle]}>
        <Text style={[styles.badgeText, textStyle]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userHeaderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Theme.shadowSm,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.primary + '20',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadowSm,
  },
  verifiedMiniBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 1,
    ...Theme.shadowSm,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: Theme.textMuted,
  },
  badgeWrapper: {
    backgroundColor: Theme.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.textSecondary,
  },
});
