import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAuth } from '@/src/contexts/AuthContext';
import { useCart } from '@/src/contexts/CartContext';
import { OfflineBanner } from '@/components/OfflineBanner';
import { OfflineMessage } from '@/components/OfflineMessage';
import { PartnersSection } from '@/components/PartnersSection';
import { useHomeScreenData } from '@/src/hooks/useHomeScreenData';
import { HomeHeader } from '@/src/components/home/HomeHeader';
import { SupplyChainBanner } from '@/src/components/home/SupplyChainBanner';
import { CategoryPillNav } from '@/src/components/home/CategoryPillNav';
import { PromoCarousel } from '@/src/components/home/PromoCarousel';
import { ProductSection } from '@/src/components/home/ProductSection';
import { BenefitsStrip } from '@/src/components/home/BenefitsStrip';
import { CategoryGrid } from '@/src/components/home/CategoryGrid';
import { TrustSection } from '@/src/components/home/TrustSection';
import { SellerCta } from '@/src/components/home/SellerCta';

export default function GuestHomeScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, session } = useAuth();
  const { items: cartItems, addItem } = useCart();
  const theme = useThemeColors();

  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const {
    categories,
    promotions,
    products,
    loading,
    isOffline,
    scNotification,
    scProducts,
    featuredProducts,
    bestSelling,
    bestDeals,
    fetchData,
  } = useHomeScreenData({ isAuthenticated, accessToken: session?.access_token });

  const toggleLike = (id: string) => {
    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const userType = session?.user?.user_type || (session?.user as any)?.role;
  const isVendorApproved = (session?.user as any)?.vendor?.kyc_status === 'approved' || userType === 'vendor';
  const isTransporterApproved = (session?.user as any)?.transporter?.kyc_status === 'approved' || userType === 'transporter';
  const isAdmin = userType === 'admin';

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      <HomeHeader
        theme={theme}
        cartCount={cartItems.length}
        isVendorApproved={isVendorApproved}
        isTransporterApproved={isTransporterApproved}
        isAdmin={isAdmin}
      />

      {isOffline && <OfflineBanner onRetry={fetchData} />}

      {isOffline && categories.length === 0 && products.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <OfflineMessage type="general" onRetry={fetchData} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Supply Chain Real-Time Notification Banner */}
          {isAuthenticated && scNotification && (
            <SupplyChainBanner theme={theme} notification={scNotification} />
          )}

          {/* Categories Nav - Squircle Tile Icons */}
          <CategoryPillNav theme={theme} categories={categories} />

          {/* Hero Slider */}
          <PromoCarousel promotions={promotions} />

          {/* Personalized Supply Chain Sections */}
          {isAuthenticated && (scProducts.matched.length > 0 || scProducts.others.length > 0) ? (
            <>
              <ProductSection
                theme={theme}
                subtitle="Sourced from preferred partners"
                titleMain="Supply Chain "
                titleItalic="Matches"
                italicColor={Theme.primary}
                products={scProducts.matched.slice(0, 10)}
                badge={{ text: 'MATCHED', variant: 'new' }}
                likedIds={likedIds}
                cartItems={cartItems}
                onAddToCart={addItem}
                onToggleLike={toggleLike}
              />
              <ProductSection
                theme={theme}
                subtitle="Top trading opportunities calculated for you"
                titleMain="Recommended "
                titleItalic="For You"
                italicColor={Theme.accentRed}
                products={scProducts.others.slice(0, 10)}
                badge={{ text: 'POPULAR', variant: 'deal' }}
                likedIds={likedIds}
                cartItems={cartItems}
                onAddToCart={addItem}
                onToggleLike={toggleLike}
              />
            </>
          ) : (
            <>
              <ProductSection
                theme={theme}
                titleMain="Handpicked for "
                titleItalic="You"
                italicColor={Theme.primary}
                products={featuredProducts}
                badge={{ text: 'NEW', variant: 'new' }}
                likedIds={likedIds}
                cartItems={cartItems}
                onAddToCart={addItem}
                onToggleLike={toggleLike}
              />
              <ProductSection
                theme={theme}
                titleMain="Most "
                titleItalic="Selling"
                italicColor="#F59E0B"
                products={bestSelling}
                badge={{ text: 'HOT', variant: 'hot' }}
                likedIds={likedIds}
                cartItems={cartItems}
                onAddToCart={addItem}
                onToggleLike={toggleLike}
              />
              <ProductSection
                theme={theme}
                titleMain="Best Deals "
                titleItalic="In Town"
                italicColor={Theme.accentRed}
                products={bestDeals}
                badge={{ text: 'OFFER', variant: 'deal' }}
                likedIds={likedIds}
                cartItems={cartItems}
                onAddToCart={addItem}
                onToggleLike={toggleLike}
              />
            </>
          )}

          {/* Benefits Strip */}
          <BenefitsStrip theme={theme} />

          {/* Trending Categories - Circular Icons Grid */}
          <CategoryGrid theme={theme} categories={categories} />

          {/* Engineered for Trust */}
          <TrustSection theme={theme} />

          {/* Ecosystem Partners */}
          <PartnersSection />

          {/* Seller CTA */}
          <SellerCta />

        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 40 },
});
