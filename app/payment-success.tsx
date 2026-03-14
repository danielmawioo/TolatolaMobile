import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';

export default function PaymentSuccessScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top,
          paddingBottom: 48 + insets.bottom,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome name="arrow-left" size={22} color={Theme.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Payment Success</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.successWrap}>
        <View style={styles.checkCircle}>
          <FontAwesome name="check" size={48} color="#fff" />
        </View>
        <Text style={styles.successTitle}>Payment received!</Text>
      </View>

      <View style={styles.detailsCard}>
        <Text style={styles.detailRow}>Order Number: TOLA-2024-12345678</Text>
        <Text style={styles.detailRow}>Tracking Code: TDX-ABC12-DEF34</Text>
      </View>

      <View style={styles.mapCard}>
        <View style={styles.mapPlaceholder}>
          <FontAwesome name="map" size={40} color={Theme.inputBorder} />
          <Text style={styles.mapText}>Delivery route map</Text>
        </View>
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressStep}>
          <View style={[styles.progressDot, styles.progressDotDone]}>
            <FontAwesome name="check" size={12} color="#fff" />
          </View>
          <Text style={styles.progressLabel}>Ordered</Text>
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressStep}>
          <View style={[styles.progressDot, styles.progressDotDone]}>
            <FontAwesome name="check" size={12} color="#fff" />
          </View>
          <Text style={styles.progressLabel}>Shipped</Text>
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressStep}>
          <View style={[styles.progressDot, styles.progressDotPending]} />
          <Text style={[styles.progressLabel, styles.progressLabelPending]}>Delivered</Text>
        </View>
      </View>

      <View style={styles.transporterCard}>
        <Text style={styles.transporterTitle}>Transporter info</Text>
        <View style={styles.transporterRow}>
          <Text style={styles.transporterName}>Delivery by Alex (TolaTrans)</Text>
          <FontAwesome name="truck" size={20} color={Theme.primary} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  content: { paddingBottom: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gap.md,
    paddingVertical: 12,
    backgroundColor: Theme.background,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Theme.text },
  headerRight: { width: 40 },
  successWrap: { alignItems: 'center', paddingVertical: 32 },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Theme.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: { fontSize: 22, fontWeight: '700', color: Theme.text },
  detailsCard: {
    backgroundColor: Theme.background,
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  detailRow: { fontSize: 15, color: Theme.text },
  mapCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Theme.inputBg,
  },
  mapPlaceholder: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapText: { fontSize: 14, color: Theme.textMuted },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  progressStep: { alignItems: 'center' },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotDone: { backgroundColor: Theme.success },
  progressDotPending: {
    backgroundColor: Theme.inputBorder,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: Theme.inputBorder,
  },
  progressLabel: { fontSize: 12, color: Theme.textSecondary, marginTop: 6 },
  progressLabelPending: { color: Theme.textMuted },
  transporterCard: {
    backgroundColor: Theme.background,
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 12,
  },
  transporterTitle: { fontSize: 14, fontWeight: '600', color: Theme.text, marginBottom: 8 },
  transporterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transporterName: { fontSize: 15, color: Theme.text },
});
