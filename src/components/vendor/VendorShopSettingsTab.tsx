import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';

interface Props {
  shop: any;
  vendor: any;
  onGoToProfile: () => void;
}

export function VendorShopSettingsTab({ shop, vendor, onGoToProfile }: Props) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Shop Settings</Text>
            <Text style={styles.cardDesc}>Manage your shop information and location</Text>
          </View>
          <View style={styles.cardActions}>
            <Pressable style={styles.outlineBtn} onPress={onGoToProfile}>
              <FontAwesome name="edit" size={14} color={Theme.text} />
              <Text style={styles.outlineBtnText}>Profile</Text>
            </Pressable>
            <Pressable style={styles.outlineBtn} onPress={() => router.push('/(vendor)/shop/edit')}>
              <FontAwesome name="edit" size={14} color={Theme.text} />
              <Text style={styles.outlineBtnText}>Shop</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.shopInfoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Shop Name</Text>
            <Text style={styles.infoValue}>{shop?.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Description</Text>
            <Text style={styles.infoValue}>{shop?.description || 'No description'}</Text>
          </View>
        </View>

        <View style={styles.shopInfoSection}>
          <Text style={styles.sectionSubtitle}>Business Contact (Vendor)</Text>
          <View style={styles.infoRowInline}>
            <Text style={styles.infoLabelInline}>Business Name:</Text>
            <Text style={styles.infoValueInline}>{vendor?.business_name}</Text>
          </View>
          <View style={styles.infoRowInline}>
            <Text style={styles.infoLabelInline}>Phone:</Text>
            <Text style={styles.infoValueInline}>{vendor?.phone || 'No phone added'}</Text>
          </View>
          <View style={styles.infoRowInline}>
            <Text style={styles.infoLabelInline}>Description:</Text>
            <Text style={styles.infoValueInline}>{vendor?.description || 'No description added'}</Text>
          </View>
        </View>

        <View style={[styles.shopInfoSection, { borderBottomWidth: 0 }]}>
          <Text style={styles.sectionSubtitle}>Shop Location</Text>
          {shop?.address ? (
            <>
              <View style={styles.infoRowInline}>
                <Text style={styles.infoLabelInline}>Address:</Text>
                <Text style={styles.infoValueInline}>{shop?.address}</Text>
              </View>
              <View style={styles.infoRowInline}>
                <Text style={styles.infoLabelInline}>Region:</Text>
                <Text style={styles.infoValueInline}>{shop?.region}</Text>
              </View>
              <View style={styles.infoRowInline}>
                <Text style={styles.infoLabelInline}>District:</Text>
                <Text style={styles.infoValueInline}>{shop?.district}</Text>
              </View>
              {shop?.ward && (
                <View style={styles.infoRowInline}>
                  <Text style={styles.infoLabelInline}>Ward:</Text>
                  <Text style={styles.infoValueInline}>{shop?.ward}</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.warningBox}>
              <FontAwesome name="exclamation-circle" size={16} color="#d97706" />
              <Text style={styles.warningText}>Please add your shop location for accurate delivery fees</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContent: { flex: 1 },
  card: { backgroundColor: Theme.background, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: Theme.inputBorder, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: Theme.text, marginBottom: 4 },
  cardDesc: { fontSize: 14, color: Theme.textSecondary },
  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },

  outlineBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, gap: 6, borderWidth: 1, borderColor: Theme.inputBorder },
  outlineBtnText: { color: Theme.text, fontSize: 13, fontWeight: '500' },

  shopInfoSection: { borderBottomWidth: 1, borderBottomColor: Theme.inputBorder, paddingVertical: 16 },
  sectionSubtitle: { fontSize: 15, fontWeight: '600', color: Theme.text, marginBottom: 12 },
  infoRow: { marginBottom: 12 },
  infoLabel: { fontSize: 13, fontWeight: '500', color: Theme.text, marginBottom: 4 },
  infoValue: { fontSize: 14, color: Theme.textSecondary },
  infoRowInline: { flexDirection: 'row', marginBottom: 8, alignItems: 'center' },
  infoLabelInline: { width: 100, fontSize: 13, fontWeight: '500', color: Theme.text },
  infoValueInline: { flex: 1, fontSize: 13, color: Theme.textSecondary },

  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', padding: 12, borderRadius: 8 },
  warningText: { fontSize: 13, color: '#d97706', flex: 1 },
});
