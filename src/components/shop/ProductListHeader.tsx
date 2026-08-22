import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';

interface ProductListHeaderProps {
  isImageSearchMode: boolean;
  isImageSearching: boolean;
  imageAnalysis: string;
  imageKeywords: string[];
  displayProductsCount: number;
  onClearImageSearch: () => void;
  searchQuery: string;
  productsCount: number;
  onClearSearch: () => void;
}

/**
 * Header shown above the product grid: either the "AI is analyzing" /
 * image-search-results banner (when an image search is active), or the
 * plain text-search results summary, or nothing.
 */
export function ProductListHeader({
  isImageSearchMode,
  isImageSearching,
  imageAnalysis,
  imageKeywords,
  displayProductsCount,
  onClearImageSearch,
  searchQuery,
  productsCount,
  onClearSearch,
}: ProductListHeaderProps) {
  if (isImageSearchMode) {
    return (
      <View style={{ marginBottom: 16 }}>
        {isImageSearching && (
          <View style={styles.aiAnalyzingCard}>
            <ActivityIndicator size="large" color="#F59E0B" style={{ marginBottom: 12 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <FontAwesome name="camera" size={16} color="#F59E0B" />
              <Text style={styles.aiAnalyzingTitle}>AI is Analyzing Your Image...</Text>
            </View>
            <Text style={styles.aiAnalyzingDesc}>
              TOLATOLA AI is identifying product features, category, and visual details to find matching products for you.
            </Text>
          </View>
        )}

        {!isImageSearching && (
          <View style={styles.imageResultsCard}>
            <View style={styles.imageResultsHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                <View style={styles.cameraIconBox}>
                  <FontAwesome name="camera" size={16} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <FontAwesome name="sparkles" size={14} color="#F59E0B" />
                    <Text style={styles.imageResultsTitle}>Image Search Results</Text>
                  </View>
                  {imageAnalysis ? (
                    <Text style={styles.imageResultsAnalysis}>
                      AI identified: <Text style={{ fontWeight: '800', color: Theme.textPrimary }}>{imageAnalysis}</Text>
                    </Text>
                  ) : null}
                  {imageKeywords.length > 0 && (
                    <View style={styles.keywordPillsRow}>
                      {imageKeywords.slice(0, 6).map((kw, i) => (
                        <View key={i} style={styles.keywordPill}>
                          <Text style={styles.keywordPillText}>{kw.toUpperCase()}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <Text style={styles.imageResultsCount}>
                    {displayProductsCount} {displayProductsCount === 1 ? 'product' : 'products'} found
                  </Text>
                </View>
              </View>
              <Pressable onPress={onClearImageSearch} style={styles.clearImageBtn} hitSlop={10}>
                <FontAwesome name="times" size={16} color={Theme.textMuted} />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  }

  if (!searchQuery) return null;
  return (
    <View style={styles.searchResultsHeader}>
      <Text style={styles.searchResultsText}>
        {productsCount} {productsCount === 1 ? 'product' : 'products'} found for "{searchQuery}"
      </Text>
      <Pressable onPress={onClearSearch} style={styles.clearSearchBtn}>
        <Text style={styles.clearSearchText}>Clear</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  aiAnalyzingCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAnalyzingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  aiAnalyzingDesc: {
    fontSize: 12,
    color: '#B45309',
    textAlign: 'center',
    lineHeight: 18,
  },
  imageResultsCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 14,
  },
  imageResultsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cameraIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageResultsTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#78350F',
  },
  imageResultsAnalysis: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 2,
  },
  keywordPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  keywordPill: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  keywordPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#78350F',
  },
  imageResultsCount: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '700',
    marginTop: 6,
  },
  clearImageBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  searchResultsText: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.text,
    flex: 1,
  },
  clearSearchBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: Theme.backgroundTertiary,
    borderRadius: 12,
  },
  clearSearchText: {
    fontSize: 12,
    color: Theme.textMuted,
    fontWeight: '600',
  },
});
