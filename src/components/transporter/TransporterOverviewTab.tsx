import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { TransporterAssignmentsTab } from '@/src/components/transporter/TransporterAssignmentsTab';
import type { TransporterProfile } from '@/src/hooks/useTransporterDashboardData';

interface Props {
  transporterId: string;
  accessToken: string;
  transporter: TransporterProfile | null;
  activeCount: number;
  completedCount: number;
  availableBalance: number;
  refreshing: boolean;
  onRefresh: () => void;
  isUpdatingLocation: boolean;
  locationStatus: 'updated' | 'error' | 'idle';
  onUpdateLocation: () => void;
}

export function TransporterOverviewTab({
  transporterId,
  accessToken,
  transporter,
  activeCount,
  completedCount,
  availableBalance,
  refreshing,
  onRefresh,
  isUpdatingLocation,
  locationStatus,
  onUpdateLocation,
}: Props) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.bodyContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />}
    >
      {/* Driver Cockpit Banner */}
      <View style={styles.cockpitHero}>
        <View style={styles.cockpitTop}>
          <View style={styles.verifiedBadge}>
            <FontAwesome name="shield" size={12} color="#16a34a" />
            <Text style={styles.verifiedText}>Verified Transporter</Text>
          </View>
          <View style={styles.dutyBadge}>
            <View style={styles.dutyDot} />
            <Text style={styles.dutyText}>Active on duty</Text>
          </View>
        </View>

        <Text style={styles.welcomeTitle}>Transporter Dashboard</Text>
        <Text style={styles.welcomeSubtitle}>{transporter?.business_name || 'Welcome to your dashboard'}</Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
            <FontAwesome name="truck" size={15} color="#2563eb" />
          </View>
          <Text style={styles.statValue}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#dcfce7' }]}>
            <FontAwesome name="check-circle" size={15} color="#16a34a" />
          </View>
          <Text style={styles.statValue}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#ede9fe' }]}>
            <FontAwesome name="money" size={15} color="#7c3aed" />
          </View>
          <Text style={styles.statValue}>{availableBalance > 0 ? `${Math.round(availableBalance / 1000)}k` : '0'}</Text>
          <Text style={styles.statLabel}>Balance</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}>
            <FontAwesome name="star" size={15} color="#d97706" />
          </View>
          <Text style={styles.statValue}>{transporter?.rating || '5.0'}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      {/* Modern Location Card */}
      <View style={styles.locationCard}>
        <View style={styles.locationCardHeader}>
          <View style={styles.locationIconWrap}>
            <FontAwesome name="map-marker" size={16} color={Theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.locationCardTitle}>My Location</Text>
            <Text style={styles.locationCardSub}>Share live GPS coordinates for quick cargo dispatch</Text>
          </View>
        </View>
        <Pressable
          style={[styles.locationBtn, isUpdatingLocation && { opacity: 0.6 }]}
          onPress={onUpdateLocation}
          disabled={isUpdatingLocation}
        >
          <FontAwesome name="crosshairs" size={14} color="#fff" />
          <Text style={styles.locationBtnText}>{isUpdatingLocation ? 'Updating...' : 'Update My Location'}</Text>
        </Pressable>
        {locationStatus === 'updated' && <Text style={styles.locationSuccess}>✓ Location synced</Text>}
        {locationStatus === 'error' && <Text style={styles.locationError}>Failed to sync location</Text>}
      </View>

      {/* Assignments */}
      <TransporterAssignmentsTab
        transporterId={transporterId}
        accessToken={accessToken}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bodyContent: { padding: 16, paddingBottom: 48 },

  // Cockpit Hero
  cockpitHero: {
    backgroundColor: Theme.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    ...Theme.shadowSm,
  },
  cockpitTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  dutyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  dutyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563eb',
  },
  dutyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: Theme.textSecondary,
    fontWeight: '500',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Theme.background,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    ...Theme.shadowSm,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Theme.text,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Location Card
  locationCard: {
    backgroundColor: Theme.background,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    ...Theme.shadowSm,
  },
  locationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Theme.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.text,
  },
  locationCardSub: {
    fontSize: 11,
    color: Theme.textMuted,
    marginTop: 1,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Theme.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  locationBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  locationSuccess: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '600',
    textAlign: 'center',
  },
  locationError: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
    textAlign: 'center',
  },
});
