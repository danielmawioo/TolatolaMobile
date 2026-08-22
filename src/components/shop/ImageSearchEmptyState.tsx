import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';

interface ImageSearchEmptyStateProps {
  imageAnalysis: string;
  onBackToShop: () => void;
}

/** Empty state shown when an image search returns no matching products. */
export function ImageSearchEmptyState({ imageAnalysis, onBackToShop }: ImageSearchEmptyStateProps) {
  return (
    <View style={styles.imageEmptyCard}>
      <View style={styles.imageEmptyIconBox}>
        <FontAwesome name="camera" size={28} color={Theme.textMuted} />
      </View>
      {imageAnalysis ? (
        <Text style={styles.imageEmptyAnalysis}>
          We identified: <Text style={{ fontWeight: '800', color: Theme.textPrimary }}>{imageAnalysis}</Text>
        </Text>
      ) : null}
      <Text style={styles.imageEmptyTitle}>No similar products found</Text>
      <Text style={styles.imageEmptySub}>Try uploading a different photo with clearer product details.</Text>
      <Pressable onPress={onBackToShop} style={styles.backToShopBtn}>
        <Text style={styles.backToShopText}>Back to Shop</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  imageEmptyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
  },
  imageEmptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  imageEmptyAnalysis: {
    fontSize: 13,
    color: Theme.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  imageEmptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.textPrimary,
  },
  imageEmptySub: {
    fontSize: 12,
    color: Theme.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  backToShopBtn: {
    marginTop: 16,
    backgroundColor: Theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backToShopText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
});
