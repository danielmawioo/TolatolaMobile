import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { OptimizedImage } from '@/components/OptimizedImage';

interface Partner {
  name: string;
  logo: string;
}

const PARTNERS: Partner[] = [
  { name: "CLICKPESA", logo: "https://tolatola.co/partners/clickpesa.png" },
  { name: "AIRTEL", logo: "https://tolatola.co/partners/airtel.svg" },
  { name: "VODACOM", logo: "https://tolatola.co/partners/vodacom.png" },
  { name: "MIX BY YAS", logo: "https://tolatola.co/partners/mix-by-yas.svg" },
  { name: "HALOTEL", logo: "https://tolatola.co/partners/halotel.png" },
  { name: "CRDB BANK", logo: "https://tolatola.co/partners/crdb.png" },
  { name: "EQUITY BANK", logo: "https://tolatola.co/partners/equity.png" },
  { name: "NMB BANK", logo: "https://tolatola.co/partners/nmb.png" },
  { name: "ABSA BANK", logo: "https://tolatola.co/partners/absa.svg" },
  { name: "DAN'G GROUP", logo: "https://tolatola.co/partners/dang-group.png" },
];

export function PartnersSection() {
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.badge}>
          <FontAwesome name="handshake-o" size={10} color={Theme.primary} />
          <Text style={styles.badgeText}>ECOSYSTEM PARTNERS</Text>
        </View>
        <Text style={styles.sectionTitle}>
          Our Strategic <Text style={styles.italicPrimary}>Partners</Text>
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {PARTNERS.map((partner, index) => (
          <View key={index} style={styles.partnerCard}>
            <View style={styles.logoContainer}>
              <OptimizedImage
                source={partner.logo}
                width="100%"
                height="100%"
                resizeMode="contain"
                style={{ backgroundColor: 'transparent' }}
              />
            </View>
            <Text style={styles.partnerName} numberOfLines={1}>
              {partner.name}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBorder + '60',
  },
  headerContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.primary + '15',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: Theme.primary,
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.text,
  },
  italicPrimary: {
    color: Theme.primary,
    fontStyle: 'italic',
  },
  scrollList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  partnerCard: {
    width: 140,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadowSm,
  },
  logoContainer: {
    width: '100%',
    height: 50,
    backgroundColor: Theme.inputBg,
    borderRadius: 10,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  partnerName: {
    fontSize: 11,
    fontWeight: '900',
    color: Theme.text,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
