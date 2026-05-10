import { View, Text, ScrollView, Pressable, StyleSheet, FlatList, RefreshControl, Alert, ActivityIndicator, TextInput } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';
import { apiGet, apiPatch, apiDelete } from '@/src/services/api';
import { Skeleton } from '@/components/Skeleton';
import { OptimizedImage } from '@/components/OptimizedImage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VendorOrdersTab } from '@/src/components/vendor/VendorOrdersTab';
import { VendorWalletTab } from '@/src/components/vendor/VendorWalletTab';
import { VendorSubscriptionTab } from '@/src/components/vendor/VendorSubscriptionTab';

const TABS = ['Overview', 'Orders', 'Wallet', 'Subscription', 'Shop'] as const;

export default function VendorDashboardScreen() {
  const { session, logout, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);

  const fetchVendorData = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      // Fetch shop details first
      const shopData = await apiGet<any>('/vendor/shop', session.access_token);
      setShop(shopData);

      if (shopData?.id) {
        // Fetch products and orders in parallel
        const [productsData, ordersData] = await Promise.all([
          apiGet<any[]>(`/shops/${shopData.id}/products`, session.access_token),
          apiGet<any[]>(`/shops/${shopData.id}/orders`, session.access_token),
        ]);
        setProducts(Array.isArray(productsData) ? productsData : []);
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      }
    } catch (error) {
      console.error('Vendor Dashboard Fetch Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchVendorData();
  }, [fetchVendorData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVendorData();
  };

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logout();
    router.replace('/(tabs)');
  };

  const deleteProduct = async (id: string) => {
    Alert.alert('Delete Product', 'Are you sure you want to delete this product?', [
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

  // Compute overview stats from orders
  const totalSales = orders
    .filter(o => ['delivered', 'completed', 'shipped'].includes(o.status))
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const newOrdersCount = orders.filter(o => ['pending', 'confirmed', 'paid'].includes(o.status)).length;
  const processingCount = orders.filter(o => ['processing', 'preparing'].includes(o.status)).length;

  const renderOverview = () => (
    <View style={styles.tabContent}>
      {/* Enhanced Stats */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: Theme.primary, borderLeftWidth: 3 }]}>
          <FontAwesome name="line-chart" size={16} color={Theme.primary} />
          <Text style={styles.statLabel}>Total Sales</Text>
          <Text style={styles.statValue}>TSh {totalSales.toLocaleString()}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Theme.success, borderLeftWidth: 3 }]}>
          <FontAwesome name="shopping-cart" size={16} color={Theme.success} />
          <Text style={styles.statLabel}>All Orders</Text>
          <Text style={styles.statValue}>{orders.length}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#eab308', borderLeftWidth: 3 }]}>
          <FontAwesome name="bell" size={16} color="#eab308" />
          <Text style={styles.statLabel}>New Orders</Text>
          <Text style={styles.statValue}>{newOrdersCount}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#7c3aed', borderLeftWidth: 3 }]}>
          <FontAwesome name="cube" size={16} color="#7c3aed" />
          <Text style={styles.statLabel}>Processing</Text>
          <Text style={styles.statValue}>{processingCount}</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Products</Text>
        <Pressable 
          style={styles.addBtn} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/product/create');
          }}
        >
          <FontAwesome name="plus" size={12} color="#fff" />
          <Text style={styles.addBtnText}>Add New</Text>
        </Pressable>
      </View>

      {products.length === 0 ? (
        <View style={styles.empty}>
          <FontAwesome name="cube" size={48} color={Theme.textMuted} />
          <Text style={styles.emptyText}>No products found. Start by adding your first product!</Text>
        </View>
      ) : (
        products.map(product => (
          <View key={product.id} style={styles.productCard}>
            <OptimizedImage source={product.image_url} width={60} height={60} style={styles.productThumb} />
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>TSh {product.price?.toLocaleString()}</Text>
            </View>
            <View style={styles.productActions}>
              <Pressable onPress={() => router.push({ pathname: '/product/edit', params: { id: product.id } })}>
                <FontAwesome name="edit" size={20} color={Theme.link} />
              </Pressable>
              <Pressable onPress={() => deleteProduct(product.id)}>
                <FontAwesome name="trash" size={20} color={Theme.error} />
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );

  if (!isAuthenticated) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>TOLA Vendor</Text>
        <Pressable onPress={handleLogout}>
          <Text style={styles.logout}>Logout</Text>
        </Pressable>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            {t === 'Orders' && newOrdersCount > 0 && (
              <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{newOrdersCount}</Text></View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Theme.primary} />
          <Text style={styles.loadingText}>Fetching shop data...</Text>
        </View>
      ) : (
        <>
          {!shop && !loading ? (
            <ScrollView 
              style={styles.body}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />}
            >
               <View style={styles.noShop}>
                 <FontAwesome name="bank" size={64} color={Theme.textMuted} />
                 <Text style={styles.noShopTitle}>No Shop Yet</Text>
                 <Text style={styles.noShopText}>Create your shop to start selling on TOLA!</Text>
                 <Pressable style={styles.createShopBtn} onPress={() => router.push('/shop/create')}>
                   <Text style={styles.createShopBtnText}>Create My Shop</Text>
                 </Pressable>
               </View>
            </ScrollView>
          ) : (
            <>
              {tab === 'Overview' && (
                <ScrollView 
                  style={styles.body} 
                  contentContainerStyle={styles.bodyContent}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />}
                >
                  {renderOverview()}
                </ScrollView>
              )}
              {tab === 'Orders' && shop?.id && (
                <VendorOrdersTab
                  shopId={shop.id}
                  accessToken={session?.access_token || ''}
                  onOrdersLoaded={(o) => setOrders(o)}
                />
              )}
              {tab === 'Wallet' && shop?.id && (
                <VendorWalletTab
                  vendorId={shop.id}
                  accessToken={session?.access_token || ''}
                />
              )}
              {tab === 'Subscription' && shop?.id && (
                <VendorSubscriptionTab
                  vendorId={shop.id}
                  accessToken={session?.access_token || ''}
                />
              )}
              {tab === 'Shop' && (
                <ScrollView 
                  style={styles.body} 
                  contentContainerStyle={styles.bodyContent}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />}
                >
                  <View style={styles.tabContent}>
                    <Text style={styles.sectionTitle}>Shop Settings</Text>
                    <View style={styles.card}>
                      <Text style={styles.label}>Shop Name</Text>
                      <Text style={styles.value}>{shop?.name}</Text>
                      <Text style={[styles.label, { marginTop: 16 }]}>Description</Text>
                      <Text style={styles.value}>{shop?.description || 'No description provided'}</Text>
                      <Pressable style={styles.editShopBtn} onPress={() => router.push('/shop/edit')}>
                        <Text style={styles.editShopBtnText}>Edit Shop Info</Text>
                      </Pressable>
                    </View>
                  </View>
                </ScrollView>
              )}
            </>
          )}
        </>
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
  title: { fontSize: 18, fontWeight: '700', color: Theme.text },
  logout: { fontSize: 15, color: Theme.link },
  tabScroll: { backgroundColor: Theme.background, maxHeight: 48 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: Theme.primary },
  tabText: { fontSize: 14, color: Theme.text },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  tabBadge: { backgroundColor: Theme.error, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 48 },
  tabContent: { flex: 1 },
  // Enhanced stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { 
    width: '48%',
    backgroundColor: Theme.background, 
    padding: 14, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: Theme.inputBorder,
    gap: 4,
  },
  statLabel: { fontSize: 11, color: Theme.textSecondary, fontWeight: '600' },
  statValue: { fontSize: 18, fontWeight: '700', color: Theme.text },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Theme.text },
  addBtn: { 
    backgroundColor: Theme.primary, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 8, 
    gap: 6 
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  productCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Theme.background, 
    padding: 12, 
    borderRadius: 12, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Theme.inputBorder
  },
  productThumb: { borderRadius: 6 },
  productInfo: { flex: 1, marginLeft: 12 },
  productName: { fontSize: 15, fontWeight: '600', color: Theme.text },
  productPrice: { fontSize: 14, color: Theme.primary, fontWeight: '600' },
  productActions: { flexDirection: 'row', gap: 16, paddingRight: 4 },
  empty: { padding: 40, alignItems: 'center', backgroundColor: Theme.background, borderRadius: 12 },
  emptyText: { textAlign: 'center', color: Theme.textMuted, marginTop: 12, lineHeight: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: Theme.textMuted },
  noShop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
  noShopTitle: { fontSize: 20, fontWeight: '700', color: Theme.text, marginTop: 16 },
  noShopText: { textAlign: 'center', color: Theme.textSecondary, marginTop: 8, marginBottom: 24 },
  createShopBtn: { backgroundColor: Theme.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  createShopBtnText: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: Theme.background, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: Theme.inputBorder },
  label: { fontSize: 12, color: Theme.textSecondary, marginBottom: 4 },
  value: { fontSize: 16, color: Theme.text, fontWeight: '500' },
  editShopBtn: { marginTop: 20, alignItems: 'center' },
  editShopBtnText: { color: Theme.link, fontWeight: '600' },
});
