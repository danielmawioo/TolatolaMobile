import { View, Text, ScrollView, Pressable, StyleSheet, Alert, ActivityIndicator, Image, RefreshControl, TextInput } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';
import { apiGet, apiPost, apiDelete, apiPut } from '@/src/services/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VendorOrdersTab } from '@/src/components/vendor/VendorOrdersTab';
import { VendorWalletTab } from '@/src/components/vendor/VendorWalletTab';
import { VendorSubscriptionTab } from '@/src/components/vendor/VendorSubscriptionTab';
import { logger } from '@/src/lib/logger';

const TABS = ['Products', 'Orders', 'Wallet', 'Subscription', 'Shop', 'Profile'] as const;

export default function VendorDashboardScreen() {
  const { session, logout, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Products');

  useEffect(() => {
    if (params.tab && TABS.includes(params.tab as any)) {
      setTab(params.tab as any);
    }
  }, [params.tab]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [vendor, setVendor] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    business_name: '',
    phone: '',
    description: '',
  });
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const fetchVendorData = useCallback(async (silent = false) => {
    if (!session?.access_token) return;
    if (!silent) setLoading(true);
    try {
      // Fetch vendor profile
      const vendorRes = await apiGet<{ data: any[] }>('/vendors', session.access_token);
      const vendorData = vendorRes?.data?.[0];
      setVendor(vendorData || null);

      // Fetch shop details
      const shopRes = await apiGet<any>('/vendor/shop', session.access_token);
      const actualShop = shopRes?.shops?.[0] || shopRes?.data?.[0] || null;
      setShop(actualShop);

      if (actualShop?.id) {
        // Fetch products and orders in parallel
        const [productsData, ordersData] = await Promise.all([
          apiGet<any>(`/shops/${actualShop.id}/products`, session.access_token).catch(() => ({ data: [] })),
          apiGet<any>(`/shops/${actualShop.id}/orders`, session.access_token).catch(() => ({ orders: [] })),
        ]);
        setProducts(Array.isArray(productsData?.data) ? productsData.data : (Array.isArray(productsData) ? productsData : []));
        setOrders(ordersData?.orders || (Array.isArray(ordersData) ? ordersData : []));
      }

      // Fetch notification count
      try {
        const notifRes = await apiGet<any>('/notifications/unread-count', session.access_token);
        setUnreadNotifs(notifRes?.unread_count || 0);
      } catch { /* silent */ }
    } catch (error) {
      logger.error('Vendor Dashboard Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchVendorData();
  }, [fetchVendorData]);

  // Refresh data when screen gains focus (e.g. after editing product/shop)
  useFocusEffect(
    useCallback(() => {
      fetchVendorData(true);
    }, [fetchVendorData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchVendorData(true);
    setRefreshing(false);
  }, [fetchVendorData]);

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logout();
    router.replace('/(tabs)');
  };

  const deleteProduct = async (id: string) => {
    Alert.alert('Delete Product', 'Are you sure you want to delete this product? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: async () => {
          if (!session?.access_token) return;
          try {
            await apiDelete(`/products/${id}`, session.access_token);
            setProducts(products.filter(p => p.id !== id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete product');
          }
        } 
      }
    ]);
  };

  const handleToggleOutOfStock = async (product: any) => {
    if (!session?.access_token) return;
    try {
      const newStockQuantity = product.stock_quantity > 0 ? 0 : 1;
      await apiPost('/products/update-stock', { productId: product.id, quantity: newStockQuantity }, session.access_token);
      setProducts(products.map(p => p.id === product.id ? { ...p, stock_quantity: newStockQuantity } : p));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update stock');
    }
  };

  const hasShopLocation = (shopData: any) => {
    return !!(shopData?.region && shopData?.district);
  };

  const handleAddProductClick = () => {
    if (shop && !hasShopLocation(shop)) {
      Alert.alert('Shop Location Required', 'You need to add your shop location before you can add products. The location is required to calculate accurate delivery fees for your customers.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Shop Location', onPress: () => router.push('/(vendor)/shop/edit') }
      ]);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push('/(vendor)/product/create');
    }
  };

  const renderProducts = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Products</Text>
        <Pressable style={styles.addBtn} onPress={handleAddProductClick}>
          <FontAwesome name="plus" size={12} color="#fff" />
          <Text style={styles.addBtnText}>Add Product</Text>
        </Pressable>
      </View>

      {products.length === 0 ? (
        <View style={styles.empty}>
          <FontAwesome name="cube" size={48} color={Theme.textMuted} />
          <Text style={styles.emptyText}>No products yet. Add your first product!</Text>
        </View>
      ) : (
        <View style={styles.productsGrid}>
          {products.map(product => {
            const hasImages = product.images && product.images.length > 0;
            const imageUrl = hasImages ? product.images[0] : (product.image_url || null);
            
            return (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productImageContainer}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.productImage} />
                  ) : (
                    <View style={[styles.productImage, { backgroundColor: Theme.backgroundSecondary, justifyContent: 'center', alignItems: 'center' }]}>
                      <FontAwesome name="cube" size={32} color={Theme.textMuted} />
                    </View>
                  )}
                  {product.stock_quantity === 0 && (
                    <View style={styles.outOfStockBadge}>
                      <Text style={styles.outOfStockText}>Out of Stock</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.productCardBody}>
                  <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.productDesc} numberOfLines={2}>{product.description || 'No description'}</Text>
                  
                  <View style={styles.productRow}>
                    <Text style={styles.productPrice}>TZS {product.price?.toLocaleString()}</Text>
                  </View>
                  
                  <View style={styles.productRow}>
                    <Text style={styles.productLabel}>Stock:</Text>
                    <Text style={styles.productValue}>{product.stock_quantity}</Text>
                  </View>
                  
                  <View style={styles.productRow}>
                    <Text style={styles.productLabel}>Status:</Text>
                    <Text style={[
                      styles.productValue,
                      product.status === 'approved' ? { color: Theme.success } :
                      product.status === 'rejected' ? { color: Theme.error } :
                      { color: '#d97706' }
                    ]}>
                      {product.status || 'pending'}
                    </Text>
                  </View>
                  
                  <View style={styles.productActionsRow}>
                    <Pressable style={styles.actionBtn} onPress={() => router.push({ pathname: '/(vendor)/product/edit', params: { id: product.id } })}>
                      <FontAwesome name="edit" size={14} color={Theme.text} />
                      <Text style={styles.actionBtnText}>Edit</Text>
                    </Pressable>
                    <Pressable style={styles.actionBtn} onPress={() => handleToggleOutOfStock(product)}>
                      <FontAwesome name={product.stock_quantity > 0 ? "times-circle" : "check-circle"} size={14} color={Theme.text} />
                      <Text style={styles.actionBtnText}>{product.stock_quantity > 0 ? "Out" : "In"}</Text>
                    </Pressable>
                    <Pressable style={[styles.actionBtn, { backgroundColor: Theme.error, flex: 0.5 }]} onPress={() => deleteProduct(product.id)}>
                      <FontAwesome name="trash" size={14} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderShopSettings = () => (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Shop Settings</Text>
            <Text style={styles.cardDesc}>Manage your shop information and location</Text>
          </View>
          <View style={styles.cardActions}>
            <Pressable style={styles.outlineBtn} onPress={() => setTab('Profile')}>
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

  const handleStartEditProfile = () => {
    setProfileForm({
      business_name: vendor?.business_name || '',
      phone: vendor?.phone || '',
      description: vendor?.description || '',
    });
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    setIsEditingProfile(false);
  };

  const handleSaveProfile = async () => {
    if (!vendor?.id || !session?.access_token) return;
    if (!profileForm.business_name) {
      Alert.alert('Error', 'Business name is required.');
      return;
    }
    setSavingProfile(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await apiPut(`/vendors/${vendor.id}`, profileForm, session.access_token);
      // Update local state
      setVendor((prev: any) => ({ ...prev, ...profileForm }));
      setIsEditingProfile(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Business profile updated successfully.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update business profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const getKycBadge = () => {
    const status = vendor?.kyc_status;
    if (status === 'approved') return { label: 'Approved', bg: '#dcfce7', color: '#16a34a' };
    if (status === 'rejected') return { label: 'Rejected', bg: '#fee2e2', color: '#dc2626' };
    return { label: 'Pending', bg: '#fef3c7', color: '#d97706' };
  };

  const renderProfile = () => {
    const kyc = getKycBadge();
    return (
      <View style={styles.tabContent}>
        {/* Vendor Business Profile Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Business Profile</Text>
              <Text style={styles.cardDesc}>Your vendor business information visible to customers</Text>
            </View>
            {!isEditingProfile && (
              <Pressable style={styles.outlineBtn} onPress={handleStartEditProfile}>
                <FontAwesome name="edit" size={14} color={Theme.text} />
                <Text style={styles.outlineBtnText}>Edit</Text>
              </Pressable>
            )}
          </View>

          {isEditingProfile ? (
            <View style={styles.profileEditForm}>
              <View style={styles.profileFieldGroup}>
                <Text style={styles.profileFieldLabel}>Business Name *</Text>
                <TextInput
                  style={styles.profileInput}
                  value={profileForm.business_name}
                  onChangeText={(t) => setProfileForm(f => ({ ...f, business_name: t }))}
                  placeholder="Your business name"
                  placeholderTextColor={Theme.textMuted}
                />
              </View>
              <View style={styles.profileFieldGroup}>
                <Text style={styles.profileFieldLabel}>Phone Number</Text>
                <TextInput
                  style={styles.profileInput}
                  value={profileForm.phone}
                  onChangeText={(t) => setProfileForm(f => ({ ...f, phone: t }))}
                  placeholder="+255 XXX XXX XXX"
                  placeholderTextColor={Theme.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.profileFieldGroup}>
                <Text style={styles.profileFieldLabel}>Business Description</Text>
                <TextInput
                  style={[styles.profileInput, { height: 80, textAlignVertical: 'top' }]}
                  value={profileForm.description}
                  onChangeText={(t) => setProfileForm(f => ({ ...f, description: t }))}
                  placeholder="Describe your business..."
                  placeholderTextColor={Theme.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </View>
              <View style={styles.profileEditActions}>
                <Pressable style={styles.profileCancelBtn} onPress={handleCancelEditProfile}>
                  <Text style={styles.profileCancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.profileSaveBtn, savingProfile && { opacity: 0.7 }]}
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.profileSaveBtnText}>Save Changes</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <View>
              <View style={styles.shopInfoSection}>
                <View style={styles.infoRowInline}>
                  <Text style={styles.infoLabelInline}>Business Name:</Text>
                  <Text style={styles.infoValueInline}>{vendor?.business_name || '—'}</Text>
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
                <Text style={styles.sectionSubtitle}>Account Details</Text>
                <View style={styles.infoRowInline}>
                  <Text style={styles.infoLabelInline}>Email:</Text>
                  <Text style={styles.infoValueInline}>{session?.user?.email || '—'}</Text>
                </View>
                <View style={styles.infoRowInline}>
                  <Text style={styles.infoLabelInline}>KYC Status:</Text>
                  <View style={[styles.kycBadge, { backgroundColor: kyc.bg }]}>
                    <Text style={[styles.kycBadgeText, { color: kyc.color }]}>{kyc.label}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* General Profile Link */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Account Settings</Text>
              <Text style={styles.cardDesc}>Manage your personal account, password, and preferences</Text>
            </View>
          </View>
          <Pressable style={[styles.outlineBtn, { alignSelf: 'flex-start', marginTop: 8 }]} onPress={() => router.push('/(tabs)/profile')}>
            <FontAwesome name="user" size={14} color={Theme.text} />
            <Text style={styles.outlineBtnText}>Go to Account Settings</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (!isAuthenticated) return null;

  // KYC GATE
  if (!loading) {
    if (!vendor) {
      return (
        <View style={styles.container}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <View style={styles.headerLeft}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: Theme.primary, letterSpacing: -1 }}>TOLA.</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.headerSubtitle}>Vendor Registration</Text>
              <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                <FontAwesome name="sign-out" size={14} color={Theme.text} />
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            </View>
          </View>
          
          <ScrollView 
            contentContainerStyle={styles.gateContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />}
          >
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
          </ScrollView>
        </View>
      );
    }

    if (vendor.kyc_status === 'pending') {
      return (
        <View style={styles.container}>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <View style={styles.headerLeft}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: Theme.primary, letterSpacing: -1 }}>TOLA.</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.headerSubtitle}>Under Review</Text>
              <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                <FontAwesome name="sign-out" size={14} color={Theme.text} />
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            </View>
          </View>
          
          <ScrollView 
            contentContainerStyle={styles.gateContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />}
          >
            <View style={styles.gateCard}>
              <View style={[styles.gateIconContainer, { backgroundColor: '#fef3c7' }]}>
                <FontAwesome name="clock-o" size={36} color="#d97706" />
              </View>
              <Text style={styles.gateTitle}>KYC Under Review</Text>
              <Text style={styles.gateSubtitle}>Your application for {vendor.business_name} is being reviewed</Text>
              <Text style={styles.gateDesc}>
                Thank you for submitting your vendor application. Our admin team is currently reviewing your documents and business information.
              </Text>
              
              <View style={styles.gateInfoBox}>
                <Text style={styles.gateInfoText}>Typical review time: 24-48 hours</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      );
    }

    if (vendor.kyc_status === 'rejected') {
      return (
        <View style={styles.container}>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <View style={styles.headerLeft}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: Theme.primary, letterSpacing: -1 }}>TOLA.</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.headerSubtitle}>Rejected</Text>
              <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                <FontAwesome name="sign-out" size={14} color={Theme.text} />
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            </View>
          </View>
          
          <ScrollView 
            contentContainerStyle={styles.gateContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />}
          >
            <View style={[styles.gateCard, { borderColor: '#fca5a5' }]}>
              <View style={[styles.gateIconContainer, { backgroundColor: '#fee2e2' }]}>
                <FontAwesome name="times-circle" size={36} color={Theme.error} />
              </View>
              <Text style={[styles.gateTitle, { color: Theme.error }]}>Application Rejected</Text>
              <Text style={styles.gateSubtitle}>Your vendor application for {vendor.business_name} has been rejected</Text>
              
              {vendor.kyc_notes && (
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
          </ScrollView>
        </View>
      );
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: Theme.primary, letterSpacing: -1 }}>TOLA.</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerSubtitle}>Vendor Dashboard</Text>
          <Pressable style={styles.notifBtn} onPress={() => router.push('/(tabs)/notifications' as any)}>
            <FontAwesome name="bell" size={16} color={Theme.text} />
            {unreadNotifs > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadNotifs > 9 ? '9+' : unreadNotifs}</Text>
              </View>
            )}
          </Pressable>
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <FontAwesome name="sign-out" size={14} color={Theme.text} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Theme.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Welcome, {vendor?.business_name || 'Vendor'}</Text>
            <Text style={styles.welcomeSubtitle}>Manage your shop and products</Text>
          </View>

          {/* Overview Stats */}
          {shop && (
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#ede9fe' }]}><FontAwesome name="cube" size={16} color="#7c3aed" /></View>
                <Text style={styles.statValue}>{products.length}</Text>
                <Text style={styles.statLabel}>Products</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}><FontAwesome name="clock-o" size={16} color="#d97706" /></View>
                <Text style={styles.statValue}>{orders.filter(o => ['pending', 'pending_payment', 'confirmed', 'paid', 'payment_received'].includes(o.status)).length}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#dcfce7' }]}><FontAwesome name="line-chart" size={16} color="#16a34a" /></View>
                <Text style={styles.statValue}>{orders.filter(o => ['dispatched', 'in_transit', 'delivered', 'shipped', 'completed'].includes(o.status)).length}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}><FontAwesome name="shopping-bag" size={16} color="#2563eb" /></View>
                <Text style={styles.statValue}>{orders.length}</Text>
                <Text style={styles.statLabel}>Total Orders</Text>
              </View>
            </View>
          )}

          {!shop ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>Create Your Shop</Text>
                  <Text style={styles.cardDesc}>Set up your shop to start selling products</Text>
                </View>
              </View>
              <Pressable style={[styles.addBtn, { alignSelf: 'flex-start', marginTop: 16 }]} onPress={() => router.push('/(vendor)/shop/create')}>
                <FontAwesome name="bank" size={14} color="#fff" />
                <Text style={styles.addBtnText}>Create Shop</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {shop && !hasShopLocation(shop) && (
                <View style={styles.locationWarningCard}>
                  <View style={styles.locationWarningContent}>
                    <FontAwesome name="exclamation-circle" size={24} color="#d97706" />
                    <View style={styles.locationWarningTextContainer}>
                      <Text style={styles.locationWarningTitle}>Shop Location Required</Text>
                      <Text style={styles.locationWarningDesc}>Please add your shop location to enable delivery fee calculations and start adding products.</Text>
                    </View>
                  </View>
                  <Pressable style={styles.locationWarningBtn} onPress={() => router.push('/(vendor)/shop/edit')}>
                    <FontAwesome name="edit" size={14} color="#b45309" />
                    <Text style={styles.locationWarningBtnText}>Add Location</Text>
                  </Pressable>
                </View>
              )}

              {tab === 'Products' && renderProducts()}
              {tab === 'Orders' && shop?.id && (
                <VendorOrdersTab shopId={shop.id} accessToken={session?.access_token || ''} onOrdersLoaded={() => {}} />
              )}
              {tab === 'Wallet' && vendor?.id && (
                <VendorWalletTab vendorId={vendor.id} accessToken={session?.access_token || ''} />
              )}
              {tab === 'Subscription' && vendor?.id && (
                <VendorSubscriptionTab vendorId={vendor.id} accessToken={session?.access_token || ''} />
              )}
              {tab === 'Shop' && renderShopSettings()}
              {tab === 'Profile' && renderProfile()}
            </>
          )}
        </ScrollView>
      )}
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
  notifBtn: { position: 'relative', width: 36, height: 36, borderRadius: 18, backgroundColor: Theme.inputBg, alignItems: 'center', justifyContent: 'center' },
  notifBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Theme.background },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: Theme.background, borderRadius: 12, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Theme.inputBorder },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: Theme.text },
  statLabel: { fontSize: 9, fontWeight: '700', color: Theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, color: Theme.textSecondary },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Theme.inputBorder, borderRadius: 6 },
  logoutText: { fontSize: 13, color: Theme.text, fontWeight: '500' },
  
  tabScroll: { backgroundColor: Theme.background, maxHeight: 48, borderBottomWidth: 1, borderBottomColor: Theme.inputBorder },
  tabRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: Theme.backgroundSecondary },
  tabText: { fontSize: 14, color: Theme.textSecondary, fontWeight: '500' },
  tabTextActive: { color: Theme.text, fontWeight: '700' },
  
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 48 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: Theme.textMuted },
  
  welcomeSection: { marginBottom: 24 },
  welcomeTitle: { fontSize: 24, fontWeight: '700', color: Theme.text, marginBottom: 4 },
  welcomeSubtitle: { fontSize: 14, color: Theme.textSecondary },
  
  locationWarningCard: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#f59e0b', borderRadius: 12, padding: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locationWarningContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1, paddingRight: 16 },
  locationWarningTextContainer: { flex: 1 },
  locationWarningTitle: { fontSize: 15, fontWeight: '600', color: '#92400e', marginBottom: 4 },
  locationWarningDesc: { fontSize: 13, color: '#b45309', lineHeight: 18 },
  locationWarningBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#f59e0b', borderRadius: 6, backgroundColor: '#fef3c7' },
  locationWarningBtnText: { fontSize: 13, fontWeight: '600', color: '#b45309' },
  
  tabContent: { flex: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Theme.text },
  
  addBtn: { backgroundColor: Theme.text, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, gap: 8 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  
  outlineBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, gap: 6, borderWidth: 1, borderColor: Theme.inputBorder },
  outlineBtnText: { color: Theme.text, fontSize: 13, fontWeight: '500' },
  
  card: { backgroundColor: Theme.background, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: Theme.inputBorder, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: Theme.text, marginBottom: 4 },
  cardDesc: { fontSize: 14, color: Theme.textSecondary },
  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  
  empty: { padding: 40, alignItems: 'center', backgroundColor: Theme.background, borderRadius: 12, borderWidth: 1, borderColor: Theme.inputBorder },
  emptyText: { textAlign: 'center', color: Theme.textMuted, marginTop: 12, lineHeight: 20 },
  
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' },
  productCard: { width: '47%', backgroundColor: Theme.background, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Theme.inputBorder, marginBottom: 16 },
  productImageContainer: { width: '100%', aspectRatio: 1, position: 'relative' },
  productImage: { width: '100%', height: '100%' },
  outOfStockBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: Theme.error, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  outOfStockText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  productCardBody: { padding: 12 },
  productName: { fontSize: 15, fontWeight: '600', color: Theme.text, marginBottom: 4 },
  productDesc: { fontSize: 12, color: Theme.textSecondary, marginBottom: 12, minHeight: 32 },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  productPrice: { fontSize: 15, fontWeight: '700', color: Theme.text },
  productLabel: { fontSize: 13, color: Theme.textSecondary },
  productValue: { fontSize: 13, fontWeight: '500', color: Theme.text },
  productActionsRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderWidth: 1, borderColor: Theme.inputBorder, borderRadius: 6, gap: 4 },
  actionBtnText: { fontSize: 11, fontWeight: '500', color: Theme.text },
  
  shopInfoSection: { borderBottomWidth: 1, borderBottomColor: Theme.inputBorder, paddingVertical: 16 },
  sectionSubtitle: { fontSize: 15, fontWeight: '600', color: Theme.text, marginBottom: 12 },
  infoRow: { marginBottom: 12 },
  infoLabel: { fontSize: 13, fontWeight: '500', color: Theme.text, marginBottom: 4 },
  infoValue: { fontSize: 14, color: Theme.textSecondary },
  infoRowInline: { flexDirection: 'row', marginBottom: 8, alignItems: 'center' },
  infoLabelInline: { width: 100, fontSize: 13, fontWeight: '500', color: Theme.text },
  infoValueInline: { flex: 1, fontSize: 13, color: Theme.textSecondary },

  // Profile editing styles
  profileEditForm: { gap: 14 },
  profileFieldGroup: { gap: 4 },
  profileFieldLabel: { fontSize: 13, fontWeight: '600', color: Theme.textSecondary },
  profileInput: { backgroundColor: Theme.backgroundSecondary, borderRadius: 10, padding: 12, fontSize: 15, color: Theme.text, borderWidth: 1, borderColor: Theme.inputBorder },
  profileEditActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  profileCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Theme.inputBorder, alignItems: 'center' },
  profileCancelBtnText: { fontSize: 14, fontWeight: '600', color: Theme.text },
  profileSaveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Theme.primary, alignItems: 'center' },
  profileSaveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  kycBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  kycBadgeText: { fontSize: 12, fontWeight: '700' },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', padding: 12, borderRadius: 8 },
  warningText: { fontSize: 13, color: '#d97706', flex: 1 },

  // KYC Gate Styles
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
