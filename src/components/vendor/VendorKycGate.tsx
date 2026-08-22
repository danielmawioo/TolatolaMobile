import React from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';
import type { Vendor } from '@/src/types';

type KycStatus = 'missing' | 'pending' | 'rejected';

interface Props {
  status: KycStatus;
  vendor: Vendor | null;
  refreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

export function VendorKycGate({ status, vendor, refreshing, onRefresh, onLogout }: Props) {
  const insets = useSafeAreaInsets();

  const headerSubtitle =
    status === 'missing' ? 'Vendor Registration' : status === 'pending' ? 'Under Review' : 'Rejected';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: Theme.primary, letterSpacing: -1 }}>TOLA.</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
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
              <FontAwesome name="id-card" size={32} color="#7c3aed" />
            </View>
            <Text style={styles.gateTitle}>Vendor KYC Required</Text>
            <Text style={styles.gateDesc}>
              To start selling on Tolatola, you need to complete your vendor profile and verify your identity details.
            </Text>

            <Pressable
              style={styles.gatePrimaryBtn}
              onPress={() => router.push('/(vendor)/register' as any)}
            >
              <Text style={styles.gatePrimaryBtnText}>Register as Vendor</Text>
            </Pressable>
          </View>
        )}

        {status === 'pending' && (
          <View style={styles.gateCard}>
            <View style={[styles.gateIconContainer, { backgroundColor: '#fef3c7' }]}>
              <FontAwesome name="clock-o" size={36} color="#d97706" />
            </View>
            <Text style={styles.gateTitle}>KYC Under Review</Text>
            <Text style={styles.gateSubtitle}>Your application for {vendor?.business_name} is being reviewed</Text>
            <Text style={styles.gateDesc}>
              Thank you for submitting your vendor application. Our admin team is currently reviewing your documents and business information.
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
            <Text style={styles.gateSubtitle}>Your vendor application for {vendor?.business_name} has been rejected</Text>

            {vendor?.kyc_notes && (
              <View style={styles.rejectionBox}>
                <Text style={styles.rejectionTitle}>Rejection Reason:</Text>
                <Text style={styles.rejectionText}>{vendor.kyc_notes}</Text>
              </View>
            )}

            <Text style={styles.gateDesc}>
              Please review the rejection reason above and make the necessary corrections before reapplying.
            </Text>

            <Pressable
              style={[styles.gatePrimaryBtn, { backgroundColor: Theme.error }]}
              onPress={() => router.push('/(vendor)/register' as any)}
            >
              <Text style={styles.gatePrimaryBtnText}>Reapply as Vendor</Text>
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
  headerLeft: {},
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerSubtitle: { fontSize: 13, color: Theme.textSecondary },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Theme.inputBorder, borderRadius: 6 },
  logoutText: { fontSize: 13, color: Theme.text, fontWeight: '500' },

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
