import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { gap, scaleByWidth, scaleByHeight } from '@/constants/layout';
import { OptimizedImage } from '@/components/OptimizedImage';
import { ScreenSafeLayout } from '@/components/ScreenSafeLayout';
import { apiGet } from '@/src/services/api';
import { resolveCategoryImage } from '@/src/constants/categoryImages';
import { getCachedData, setCachedData, CACHE_KEYS } from '@/src/services/cache';
import { OfflineBanner } from '@/components/OfflineBanner';
import { OfflineMessage } from '@/components/OfflineMessage';

type Category = {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  parent_id?: string | null;
};

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const theme = useThemeColors();

  // 2 columns
  const numColumns = 2;
  const padding = scaleByWidth(14);
  const cardGap = gap.sm;
  const cardWidth = (width - padding * 2 - cardGap * (numColumns - 1)) / numColumns;

  async function loadCategories() {
    setLoading(true);
    try {
      const res = await apiGet<{ data: Category[] }>('/categories');
      if (res?.data) {
        // Use categories in the order returned by the API
        setCategories(res.data);
        setIsOffline(false);
        await setCachedData(CACHE_KEYS.CATEGORIES, res.data);
      }
    } catch (error) {
      console.error('Failed to load categories, trying cache', error);
      setIsOffline(true);
      const cached = await getCachedData<Category[]>(CACHE_KEYS.CATEGORIES);
      if (cached) {
        setCategories(cached);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  const filteredCategories = categories
    .filter((c) => !c.parent_id && c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const isAService = a.slug === "services" || a.name?.toLowerCase() === "services"
      const isBService = b.slug === "services" || b.name?.toLowerCase() === "services"
      if (isAService && !isBService) return 1
      if (!isAService && isBService) return -1
      return 0
    })

  return (
    <ScreenSafeLayout edges={['top']}>
      <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
        {/* Header Section */}
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Explore Categories</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Find exactly what you need</Text>
          
          <View style={[styles.searchWrap, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
            <FontAwesome name="search" size={scaleByWidth(16)} color={theme.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search categories..."
              placeholderTextColor={theme.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} style={styles.clearBtn}>
                <FontAwesome name="times-circle" size={16} color={Theme.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {isOffline && <OfflineBanner onRetry={loadCategories} />}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Theme.primary} />
          </View>
        ) : isOffline && categories.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <OfflineMessage type="categories" onRetry={loadCategories} />
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + scaleByHeight(100), paddingHorizontal: padding }
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.grid}>
              {filteredCategories.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={({ pressed }) => [
                    styles.circleItem,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => router.push(`/(tabs)/shop?category=${cat.id}`)}
                >
                  <View style={[styles.circleBox, { backgroundColor: theme.catCircleBg, borderColor: theme.catCircleBorder }]}>
                    <OptimizedImage
                      source={resolveCategoryImage(cat)}
                      width="100%"
                      height="100%"
                      style={{ borderRadius: scaleByWidth(24) }}
                    />
                  </View>
                  <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            
            {filteredCategories.length === 0 && (
              <View style={styles.empty}>
                <FontAwesome name="folder-open-o" size={48} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>No categories found.</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </ScreenSafeLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  header: {
    backgroundColor: Theme.background,
    paddingHorizontal: scaleByWidth(14),
    paddingTop: scaleByHeight(8),
    paddingBottom: scaleByHeight(16),
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBorder,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: scaleByWidth(24),
    fontWeight: '900',
    color: Theme.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: scaleByWidth(14),
    color: Theme.textSecondary,
    marginTop: 2,
    marginBottom: scaleByHeight(16),
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.backgroundSecondary,
    paddingHorizontal: scaleByWidth(12),
    height: scaleByHeight(44),
    borderRadius: Theme.radiusLg,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  searchIcon: { marginRight: gap.sm },
  searchInput: { 
    flex: 1, 
    fontSize: scaleByWidth(15), 
    color: Theme.text, 
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { flex: 1 },
  listContent: {
    paddingTop: scaleByHeight(16),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: scaleByHeight(22),
  },
  circleItem: {
    width: '33.33%',
    alignItems: 'center',
    paddingHorizontal: scaleByWidth(4),
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  circleBox: {
    width: scaleByWidth(90),
    height: scaleByWidth(90),
    borderRadius: scaleByWidth(24),
    overflow: 'hidden',
    backgroundColor: Theme.inputBg,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    ...Theme.shadowSm,
  },
  name: {
    fontSize: scaleByWidth(13),
    fontWeight: '700',
    color: Theme.text,
    textAlign: 'center',
    marginTop: scaleByHeight(8),
    lineHeight: scaleByHeight(16),
  },
  empty: {
    paddingVertical: scaleByHeight(40),
    alignItems: 'center',
    justifyContent: 'center',
    gap: gap.sm,
  },
  emptyText: {
    fontSize: scaleByWidth(15),
    color: Theme.textMuted,
    fontWeight: '500',
  },
});
