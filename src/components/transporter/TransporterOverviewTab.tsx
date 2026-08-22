import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { TransporterAssignmentsTab } from '@/src/components/transporter/TransporterAssignmentsTab';

interface Props {
  transporterId: string;
  accessToken: string;
  transporter: any;
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
      {/* Welcome */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>Transporter Dashboard</Text>
        <Text style={styles.welcomeSubtitle}>{transporter?.business_name || 'Welcome to your dashboard'}</Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}><FontAwesome name="truck" size={16} color="#2563eb" /></View>
          <Text style={styles.statValue}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#dcfce7' }]}><FontAwesome name="check-circle" size={16} color="#16a34a" /></View>
          <Text style={styles.statValue}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#ede9fe' }]}><FontAwesome name="money" size={16} color="#7c3aed" /></View>
          <Text style={styles.statValue}>{availableBalance > 0 ? `${Math.round(availableBalance / 1000)}k` : '0'}</Text>
          <Text style={styles.statLabel}>Balance</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}><FontAwesome name="star" size={16} color="#d97706" /></View>
          <Text style={styles.statValue}>{transporter?.rating || '5.0'}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      {/* Update Location Card */}
      <View style={styles.locationCard}>
        <View style={styles.locationCardHeader}>
          <FontAwesome name="map-marker" size={18} color={Theme.primary} />
          <Text style={styles.locationCardTitle}>My Location</Text>
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
  bodyContent: { padding: 20, paddingBottom: 48 },

  welcomeSection: { marginBottom: 20 },
  welcomeTitle: { fontSize: 24, fontWeight: '700', color: Theme.text, marginBottom: 4 },
  welcomeSubtitle: { fontSize: 14, color: Theme.textSecondary },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: Theme.background, borderRadius: 12, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Theme.inputBorder },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: Theme.text },
  statLabel: { fontSize: 9, fontWeight: '700', color: Theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Location Card
  locationCard: {
    backgroundColor: Theme.primary + '08',
    borderWidth: 1,
    borderColor: Theme.primary + '30',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  locationCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationCardTitle: { fontSize: 15, fontWeight: '700', color: Theme.text },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Theme.primary,
    paddingVertical: 12,
    borderRadius: 8,
  },
  locationBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  locationSuccess: { fontSize: 11, color: '#16a34a', fontWeight: '600', textAlign: 'center' },
  locationError: { fontSize: 11, color: '#ef4444', fontWeight: '600', textAlign: 'center' },
});
