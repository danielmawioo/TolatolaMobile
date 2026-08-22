import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Theme } from '@/constants/Theme';
import { formatTzs } from '@/src/lib/currency';

interface Props {
  registrations: any[];
  commissions: any[];
}

function withinPeriod(dateStr: string, period: 'week' | 'month' | 'year'): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (period === 'week') return diffDays <= 7;
  if (period === 'month') return diffDays <= 30;
  return diffDays <= 365;
}

export function AgentPerformanceTab({ registrations, commissions }: Props) {
  const [perfPeriod, setPerfPeriod] = useState<'week' | 'month' | 'year'>('month');

  const registrationsInPeriod = registrations.filter((reg) => withinPeriod(reg.created_at, perfPeriod));
  const commissionsInPeriod = commissions.filter((comm) => withinPeriod(comm.created_at, perfPeriod));

  return (
    <View>
      {/* Period Select Filter */}
      <View style={styles.filterRow}>
        {(['week', 'month', 'year'] as const).map((period) => (
          <Pressable
            key={period}
            style={[styles.filterChip, perfPeriod === period && styles.filterChipActive, { flex: 1, alignItems: 'center' }]}
            onPress={() => setPerfPeriod(period)}
          >
            <Text style={[styles.filterChipText, perfPeriod === period && styles.filterChipTextActive, { textTransform: 'capitalize' }]}>
              {period}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Performance Stats Cards */}
      <View style={styles.cardWrapper}>
        <View style={styles.perfStatRow}>
          <View style={styles.perfStatCol}>
            <Text style={styles.perfStatVal}>{registrationsInPeriod.length}</Text>
            <Text style={styles.perfStatLbl}>Registrations</Text>
          </View>
          <View style={styles.perfStatCol}>
            <Text style={styles.perfStatVal}>
              {formatTzs(commissionsInPeriod.reduce((acc, c) => acc + Number(c.amount || 0), 0))}
            </Text>
            <Text style={styles.perfStatLbl}>Commissions</Text>
          </View>
        </View>

        {/* Conversion Breakdown details */}
        <View style={styles.perfDetailSection}>
          <Text style={styles.perfDetailTitle}>Activity Breakdown</Text>
          <View style={styles.perfBreakdownRow}>
            <Text style={styles.perfBreakdownLabel}>Shops Registered</Text>
            <Text style={styles.perfBreakdownValue}>
              {registrationsInPeriod.filter((r) => r.registration_type === 'vendor').length}
            </Text>
          </View>
          <View style={styles.perfBreakdownRow}>
            <Text style={styles.perfBreakdownLabel}>Transporters Registered</Text>
            <Text style={styles.perfBreakdownValue}>
              {registrationsInPeriod.filter((r) => r.registration_type === 'transporter').length}
            </Text>
          </View>
          <View style={styles.perfBreakdownRow}>
            <Text style={styles.perfBreakdownLabel}>Customers Referred</Text>
            <Text style={styles.perfBreakdownValue}>
              {registrationsInPeriod.filter((r) => r.registration_type === 'customer').length}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: Theme.background, borderWidth: 1, borderColor: Theme.inputBorder },
  filterChipActive: { backgroundColor: Theme.primary, borderColor: Theme.primary },
  filterChipText: { fontSize: 12, color: Theme.textSecondary, fontWeight: '600', textTransform: 'capitalize' },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },
  cardWrapper: { backgroundColor: Theme.background, borderRadius: 12, borderWidth: 1, borderColor: Theme.inputBorder, padding: 16, marginBottom: 22 },
  perfStatRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  perfStatCol: { flex: 1, backgroundColor: Theme.backgroundSecondary, padding: 16, borderRadius: 10, alignItems: 'center', gap: 4 },
  perfStatVal: { fontSize: 18, fontWeight: '900', color: Theme.text },
  perfStatLbl: { fontSize: 11, fontWeight: '700', color: Theme.textSecondary },
  perfDetailSection: { marginTop: 10 },
  perfDetailTitle: { fontSize: 13, fontWeight: '800', color: Theme.text, marginBottom: 12 },
  perfBreakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Theme.backgroundSecondary },
  perfBreakdownLabel: { fontSize: 12, color: Theme.textSecondary, fontWeight: '500' },
  perfBreakdownValue: { fontSize: 12, fontWeight: '700', color: Theme.text },
});
