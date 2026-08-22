import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import type { TransporterProfile } from '@/src/hooks/useTransporterDashboardData';

type GateStatus = 'missing' | 'pending' | 'rejected';

interface Props {
  status: GateStatus;
  transporter: TransporterProfile | null;
  topInset: number;
  refreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

export function TransporterKycGate({ status, transporter, topInset, refreshing, onRefresh, onLogout }: Props) {
  const headerSubtitle = status === 'missing' ? 'Transporter Profile' : status === 'pending' ? 'Under Review' : 'Rejected';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.logoText}>TOLA.</Text>
          <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.logoutBtn} onPress={onLogout}>
            <FontAwesome name="sign-out" size={14} color={Theme.text} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.gateContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />}
      >
        {status === 'missing' && (
          <View style={styles.gateCard}>
            <View style={[styles.gateIconContainer, { backgroundColor: '#ede9fe' }]}>
              <FontAwesome name="truck" size={32} color="#7c3aed" />
            </View>
            <Text style={styles.gateTitle}>Transporter KYC Required</Text>
            <Text style={styles.gateDesc}>
              To start taking deliveries and earning with Tolatola, you need to register your transporter details and verify your license.
            </Text>

            <Pressable
              style={styles.gatePrimaryBtn}
              onPress={() => router.push('/(transporter)/register' as any)}
            >
              <Text style={styles.gatePrimaryBtnText}>Register as Transporter</Text>
            </Pressable>
          </View>
        )}

        {status === 'pending' && (
          <View style={styles.gateCard}>
            <View style={[styles.gateIconContainer, { backgroundColor: '#fef3c7' }]}>
              <FontAwesome name="clock-o" size={36} color="#d97706" />
            </View>
            <Text style={styles.gateTitle}>KYC Under Review</Text>
            <Text style={styles.gateSubtitle}>Your application for {transporter?.business_name || 'Transporter'} is being reviewed</Text>
            <Text style={styles.gateDesc}>
              Thank you for submitting your transporter profile. Our admin team is currently reviewing your documents and vehicle details.
            </Text>

            <View style={styles.gateInfoBox}>
              <Text style={styles.gateInfoText}>Typical review time: 24-48 hours</Text>
            </View>
          </View>
        )}

        {status === 'rejected' && (
          <View style={[styles.gateCard, { borderColor: '#fca5a5' }]}>
            <View style={[styles.gateIconContainer, { backgroundColor: '#fee2e2' }]}>
              <FontAwesome name="times-circle" size={36} color={Theme.error} />
            </View>
            <Text style={[styles.gateTitle, { color: Theme.error }]}>Application Rejected</Text>
            <Text style={styles.gateSubtitle}>Your transporter profile application has been rejected</Text>

            {transporter?.kyc_notes && (
              <View style={styles.rejectionBox}>
                <Text style={styles.rejectionTitle}>Rejection Reason:</Text>
                <Text style={styles.rejectionText}>{transporter.kyc_notes}</Text>
              </View>
            )}

            <Text style={styles.gateDesc}>
              Please review the rejection reason above and make the necessary corrections before reapplying.
            </Text>

            <Pressable
              style={[styles.gatePrimaryBtn, { backgroundColor: Theme.error }]}
              onPress={() => router.push('/(transporter)/register' as any)}
            >
              <Text style={styles.gatePrimaryBtnText}>Reapply as Transporter</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Theme.background,
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBorder
  },
  headerLeft: { gap: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoText: { fontSize: 24, fontWeight: '900', color: Theme.primary, letterSpacing: -1 },
  headerSubtitle: { fontSize: 11, color: Theme.textSecondary, fontWeight: '600' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Theme.inputBorder, borderRadius: 6 },
  logoutText: { fontSize: 13, color: Theme.text, fontWeight: '500' },

  // KYC Gate Styles
  gateContent: { flexGrow: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  gateCard: { width: '100%', backgroundColor: Theme.background, borderRadius: Theme.radiusLg, borderWidth: 1, borderColor: Theme.inputBorder, padding: 24, alignItems: 'center', gap: 16, ...Theme.shadowMd },
  gateIconContainer: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  gateTitle: { fontSize: 20, fontWeight: '800', color: Theme.text, textAlign: 'center' },
  gateSubtitle: { fontSize: 14, fontWeight: '600', color: Theme.textSecondary, textAlign: 'center', lineHeight: 20 },
  gateDesc: { fontSize: 13, color: Theme.textMuted, textAlign: 'center', lineHeight: 20 },
  gatePrimaryBtn: { width: '100%', backgroundColor: Theme.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  gatePrimaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  gateInfoBox: { width: '100%', backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 8, padding: 12, marginTop: 8 },
  gateInfoText: { fontSize: 12, color: '#b45309', fontWeight: '600', textAlign: 'center' },
  rejectionBox: { width: '100%', backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, padding: 14, marginTop: 4, gap: 4 },
  rejectionTitle: { fontSize: 12, fontWeight: '700', color: '#991b1b', textTransform: 'uppercase' },
  rejectionText: { fontSize: 13, color: '#dc2626', lineHeight: 18 },
});
