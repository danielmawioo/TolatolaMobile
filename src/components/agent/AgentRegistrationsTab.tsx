import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import type { AgentRegistration } from '@/src/hooks/useAgentDashboardData';

interface Props {
  registrations: AgentRegistration[];
}

export function AgentRegistrationsTab({ registrations }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'vendor' | 'customer' | 'transporter'>('all');

  const filteredRegistrations = registrations.filter((reg) => {
    const matchesSearch =
      reg.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.phone?.includes(searchQuery) ||
      reg.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || reg.registration_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <View>
      {/* Search input bar */}
      <View style={styles.searchBar}>
        <FontAwesome name="search" size={16} color={Theme.textSecondary} style={{ marginRight: 10 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone or email..."
          placeholderTextColor={Theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Type Category Filter Segment */}
      <View style={styles.filterRow}>
        {(['all', 'vendor', 'transporter', 'customer'] as const).map((filter) => (
          <Pressable
            key={filter}
            style={[styles.filterChip, typeFilter === filter && styles.filterChipActive]}
            onPress={() => setTypeFilter(filter)}
          >
            <Text style={[styles.filterChipText, typeFilter === filter && styles.filterChipTextActive]}>
              {filter}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Render list of registrations */}
      <View style={styles.cardWrapper}>
        {filteredRegistrations.length === 0 ? (
          <Text style={styles.emptyText}>No registrations match your search criteria.</Text>
        ) : (
          filteredRegistrations.map((reg) => (
            <View key={reg.id} style={[styles.regRow, { paddingVertical: 14 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.regName}>{reg.full_name}</Text>
                <Text style={styles.regContact}>Phone: {reg.phone}</Text>
                {reg.email ? <Text style={styles.regContact}>Email: {reg.email}</Text> : null}
                {reg.region ? <Text style={styles.regContact}>Location: {reg.region}, {reg.district}</Text> : null}
                <Text style={styles.regDate}>Registered: {new Date(reg.created_at || '').toLocaleDateString()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', height: 60 }}>
                <View style={[styles.badge, reg.registration_type === 'vendor' ? styles.badgeVendor : reg.registration_type === 'customer' ? styles.badgeCustomer : styles.badgeTransporter]}>
                  <Text style={styles.badgeText}>{reg.registration_type}</Text>
                </View>
                <Text style={[styles.statusText, reg.status === 'active' ? styles.statusActive : styles.statusPending]}>
                  {reg.status}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.background, borderWidth: 1, borderColor: Theme.inputBorder,
    borderRadius: Theme.radiusMd, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: Theme.text },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: Theme.background, borderWidth: 1, borderColor: Theme.inputBorder },
  filterChipActive: { backgroundColor: Theme.primary, borderColor: Theme.primary },
  filterChipText: { fontSize: 12, color: Theme.textSecondary, fontWeight: '600', textTransform: 'capitalize' },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },
  cardWrapper: { backgroundColor: Theme.background, borderRadius: 12, borderWidth: 1, borderColor: Theme.inputBorder, padding: 16, marginBottom: 22 },
  emptyText: { textAlign: 'center', color: Theme.textMuted, fontSize: 12, paddingVertical: 16 },
  regRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Theme.inputBorder },
  regName: { fontSize: 14, fontWeight: '700', color: Theme.text },
  regDate: { fontSize: 11, color: Theme.textMuted, marginTop: 2 },
  regContact: { fontSize: 12, color: Theme.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeVendor: { backgroundColor: '#dcfce7' },
  badgeCustomer: { backgroundColor: '#dbeafe' },
  badgeTransporter: { backgroundColor: '#ede9fe' },
  badgeText: { fontSize: 9, fontWeight: '700', textTransform: 'capitalize', color: Theme.text },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  statusActive: { color: '#10b981' },
  statusPending: { color: '#f59e0b' },
});
