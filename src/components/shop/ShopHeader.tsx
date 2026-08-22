import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { OptimizedImage } from '@/components/OptimizedImage';
import { getRoleRedirectPath } from '@/src/lib/roleRedirect';
import type { Session } from '@/src/contexts/AuthContext';
import { ShopFilterPanel } from '@/src/components/shop/ShopFilterPanel';

interface ShopHeaderProps {
  theme: ReturnType<typeof useThemeColors>;
  session: Session | null;
  cartCount: number;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSubmitSearch: () => void;
  onCameraPress: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
  locationQuery: string;
  onLocationChange: (value: string) => void;
  minPriceQuery: string;
  onMinPriceChange: (value: string) => void;
  maxPriceQuery: string;
  onMaxPriceChange: (value: string) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
}

/**
 * Top navbar (logo + dashboard shortcuts + cart/favorites) and the search
 * row (track order, search input, image-search camera button, filter
 * toggle), including the expandable location/price filter drawer.
 */
export function ShopHeader({
  theme,
  session,
  cartCount,
  searchInput,
  onSearchInputChange,
  onSubmitSearch,
  onCameraPress,
  showFilters,
  onToggleFilters,
  activeFilterCount,
  locationQuery,
  onLocationChange,
  minPriceQuery,
  onMinPriceChange,
  maxPriceQuery,
  onMaxPriceChange,
  onApplyFilters,
  onResetFilters,
}: ShopHeaderProps) {
  const userType = session?.user?.user_type || (session?.user as any)?.role;

  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
      <View style={styles.headerTop}>
        <Pressable style={styles.logoGroup} onPress={() => router.push('/(tabs)')}>
          <View style={[styles.logoBox, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <OptimizedImage source="https://tolatola.co/logo-new.png" width="100%" height="100%" resizeMode="contain" />
          </View>
          <Text style={[styles.logoTitle, { color: theme.primary }]}>TOLA.</Text>
        </Pressable>
        <View style={styles.headerRight}>
          {/* Show dashboard buttons for ALL approved roles */}
          {((session?.user as any)?.vendor?.kyc_status === 'approved' || userType === 'vendor') && (
            <Pressable
              style={({ pressed }) => [styles.dashboardBtn, pressed && { opacity: 0.75 }]}
              onPress={() => router.push('/(vendor)/dashboard' as any)}
              hitSlop={10}
            >
              <FontAwesome name="dashboard" size={13} color="#fff" />
              <Text style={styles.dashboardBtnLabel}>Seller Hub</Text>
            </Pressable>
          )}
          {((session?.user as any)?.transporter?.kyc_status === 'approved' || userType === 'transporter') && (
            <Pressable
              style={({ pressed }) => [styles.dashboardBtn, { backgroundColor: '#10b981' }, pressed && { opacity: 0.75 }]}
              onPress={() => router.push('/(transporter)/dashboard' as any)}
              hitSlop={10}
            >
              <FontAwesome name="truck" size={13} color="#fff" />
              <Text style={styles.dashboardBtnLabel}>Transporter</Text>
            </Pressable>
          )}
          {userType === 'admin' && (
            <Pressable
              style={({ pressed }) => [styles.dashboardBtn, pressed && { opacity: 0.75 }]}
              onPress={() => router.push(getRoleRedirectPath('admin') as any)}
              hitSlop={10}
            >
              <FontAwesome name="gears" size={13} color="#fff" />
              <Text style={styles.dashboardBtnLabel}>Admin</Text>
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [styles.shopTextBtn, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '40' }, pressed && { opacity: 0.7 }]}
            onPress={() => {}}
            hitSlop={10}
          >
            <FontAwesome name="shopping-bag" size={14} color={theme.primary} />
            <Text style={[styles.shopTextBtnLabel, { color: theme.primary }]}>Shop</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.iconButton, { backgroundColor: theme.iconBg }, pressed && { opacity: 0.7 }, { marginRight: 4 }]}
            onPress={() => router.push('/(tabs)/favorites')}
            hitSlop={10}
          >
            <FontAwesome name="heart-o" size={20} color={theme.primary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.iconButton, { backgroundColor: theme.iconBg }, pressed && { opacity: 0.7 }]}
            onPress={() => router.push('/(tabs)/cart')}
            hitSlop={10}
          >
            <FontAwesome name="shopping-cart" size={22} color={theme.primary} />
            {cartCount > 0 && (
              <View style={[styles.badge, { borderColor: theme.background }]}>
                <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Navbar – Row 2: Track Order + Search (with Camera & Sliders) */}
      <View style={styles.headerRow2}>
        <Pressable
          style={({ pressed }) => [styles.trackOrderBtn, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/(guest)/track')}
        >
          <FontAwesome name="map-marker" size={14} color="#fff" />
          <Text style={styles.trackOrderBtnText}>Track Order</Text>
        </Pressable>
        <View style={[styles.headerSearchBar, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
          <FontAwesome name="search" size={14} color={theme.textMuted} />
          <TextInput
            style={[styles.headerSearchInput, { color: theme.text }]}
            placeholder="Search products..."
            placeholderTextColor={theme.textMuted}
            value={searchInput}
            onChangeText={onSearchInputChange}
            onSubmitEditing={onSubmitSearch}
            returnKeyType="search"
          />
          {/* Camera Button for Image Search */}
          <Pressable onPress={onCameraPress} style={{ paddingHorizontal: 6, paddingVertical: 5 }} hitSlop={8}>
            <FontAwesome name="camera" size={15} color="#F59E0B" />
          </Pressable>
          {/* Filter Toggle */}
          <Pressable
            onPress={onToggleFilters}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: 8,
              backgroundColor: showFilters ? Theme.primary : 'transparent',
              position: 'relative',
            }}
            hitSlop={8}
          >
            <FontAwesome name="sliders" size={14} color={showFilters ? '#fff' : activeFilterCount > 0 ? Theme.primary : Theme.textMuted} />
            {activeFilterCount > 0 && !showFilters && (
              <View style={styles.filterBadgeMini}>
                <Text style={styles.filterBadgeMiniText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Expandable Location & Price Filter Drawer */}
      {showFilters && (
        <ShopFilterPanel
          locationQuery={locationQuery}
          onLocationChange={onLocationChange}
          minPriceQuery={minPriceQuery}
          onMinPriceChange={onMinPriceChange}
          maxPriceQuery={maxPriceQuery}
          onMaxPriceChange={onMaxPriceChange}
          activeFilterCount={activeFilterCount}
          onApply={onApplyFilters}
          onReset={onResetFilters}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBorder,
    backgroundColor: 'rgba(255,255,255,0.95)',
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Theme.inputBg,
    ...Theme.shadowSm,
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Theme.primary,
    letterSpacing: 1.5,
    lineHeight: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadowSm,
  },
  dashboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Theme.primary,
    ...Theme.shadowSm,
  },
  dashboardBtnLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Theme.accentRed,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  shopTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.primary + '15',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Theme.primary + '40',
  },
  shopTextBtnLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.primary,
  },
  headerRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  trackOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    ...Theme.shadowSm,
  },
  trackOrderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  headerSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.inputBg,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
    height: 40,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: Theme.text,
    paddingVertical: 0,
  },
  filterBadgeMini: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Theme.accentRed,
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeMiniText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
});
