import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';
import { OptimizedImage } from '@/components/OptimizedImage';
import { getRoleRedirectPath } from '@/src/lib/roleRedirect';
import { pickImageSafe, requestImagePermissions } from '@/src/lib/imagePicker';
import type { useThemeColors } from '@/src/hooks/useThemeColors';

type ThemeColors = ReturnType<typeof useThemeColors>;

interface HomeHeaderProps {
  theme: ThemeColors;
  cartCount: number;
  isVendorApproved: boolean;
  isTransporterApproved: boolean;
  isAdmin: boolean;
}

async function triggerImagePicker() {
  Alert.alert(
    'Search by Image',
    'Upload a photo to find matching products using TOLATOLA AI',
    [
      {
        text: 'Take Photo',
        onPress: async () => {
          const ok = await requestImagePermissions();
          if (!ok) return;
          const picked = await pickImageSafe(true);
          if (picked?.base64) {
            router.push({
              pathname: '/(tabs)/shop',
              params: { imageBase64: picked.base64, mimeType: picked.mimeType },
            });
          }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const ok = await requestImagePermissions();
          if (!ok) return;
          const picked = await pickImageSafe(false);
          if (picked?.base64) {
            router.push({
              pathname: '/(tabs)/shop',
              params: { imageBase64: picked.base64, mimeType: picked.mimeType },
            });
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ],
  );
}

export function HomeHeader({ theme, cartCount, isVendorApproved, isTransporterApproved, isAdmin }: HomeHeaderProps) {
  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
      <View style={styles.headerTop}>
        <Pressable style={styles.logoGroup} onPress={() => {}}>
          <View style={[styles.logoBox, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
             <OptimizedImage source="https://tolatola.co/logo-new.png" width="100%" height="100%" resizeMode="contain" />
          </View>
          <Text style={[styles.logoTitle, { color: theme.text }]}>TOLA.</Text>
        </Pressable>
        <View style={styles.headerRight}>
           {/* Show dashboard buttons for ALL approved roles */}
           {isVendorApproved && (
             <Pressable
               style={({ pressed }) => [styles.dashboardBtn, pressed && { opacity: 0.75 }]}
               onPress={() => router.push('/(vendor)/dashboard' as any)}
               hitSlop={10}
             >
               <FontAwesome name="dashboard" size={13} color="#fff" />
               <Text style={styles.dashboardBtnLabel}>Seller Hub</Text>
             </Pressable>
           )}
           {isTransporterApproved && (
             <Pressable
               style={({ pressed }) => [styles.dashboardBtn, { backgroundColor: '#10b981' }, pressed && { opacity: 0.75 }]}
               onPress={() => router.push('/(transporter)/dashboard' as any)}
               hitSlop={10}
             >
               <FontAwesome name="truck" size={13} color="#fff" />
               <Text style={styles.dashboardBtnLabel}>Transporter</Text>
             </Pressable>
           )}
           {isAdmin && (
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
             onPress={() => router.push('/(tabs)/shop')}
             hitSlop={10}
           >
             <FontAwesome name="shopping-bag" size={14} color={theme.primary} />
             <Text style={styles.shopTextBtnLabel}>Shop</Text>
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

      {/* Navbar – Row 2: Track Order + Search */}
      <View style={styles.headerRow2}>
        <Pressable
          style={({ pressed }) => [styles.trackOrderBtn, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/(guest)/track')}
        >
          <FontAwesome name="map-marker" size={14} color="#fff" />
          <Text style={styles.trackOrderBtnText}>Track Order</Text>
        </Pressable>
        <View style={[styles.headerSearchBar, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
          <Pressable
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            onPress={() => router.push('/(tabs)/shop')}
          >
            <FontAwesome name="search" size={14} color={theme.textMuted} />
            <Text style={[styles.headerSearchPlaceholder, { color: theme.textMuted }]}>What are you looking for...</Text>
          </Pressable>
          <Pressable
            onPress={triggerImagePicker}
            style={{ paddingHorizontal: 6, paddingVertical: 5 }}
            hitSlop={8}
          >
            <FontAwesome name="camera" size={15} color="#F59E0B" />
          </Pressable>
        </View>
      </View>
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
    gap: 8,
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Theme.inputBg,
    ...Theme.shadowSm,
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Theme.text,
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
    gap: 4,
    backgroundColor: Theme.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  headerSearchPlaceholder: {
    fontSize: 13,
    color: Theme.textMuted,
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
});
