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

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Sales</Text>
          <Text style={styles.statValue}>TSh 0</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Orders</Text>
          <Text style={styles.statValue}>{orders.length}</Text>
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

  const renderOrders = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Shop Orders</Text>
      {orders.length === 0 ? (
        <View style={styles.empty}>
          <FontAwesome name="shopping-basket" size={48} color={Theme.textMuted} />
          <Text style={styles.emptyText}>No orders received yet. They will appear here once customers buy your items.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>#{item.id.slice(0, 8)}</Text>
                <Text style={styles.orderStatus}>{item.status}</Text>
              </View>
              <Text style={styles.orderAmount}>TSh {item.total_amount?.toLocaleString()}</Text>
              <Text style={styles.orderDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          )}
        />
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
          </Pressable>
        ))}
      </ScrollView>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Theme.primary} />
          <Text style={styles.loadingText}>Fetching shop data...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.body} 
          contentContainerStyle={styles.bodyContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} />}
        >
          {!shop && !loading ? (
             <View style={styles.noShop}>
               <FontAwesome name="bank" size={64} color={Theme.textMuted} />
               <Text style={styles.noShopTitle}>No Shop Yet</Text>
               <Text style={styles.noShopText}>Create your shop to start selling on TOLA!</Text>
               <Pressable style={styles.createShopBtn} onPress={() => router.push('/shop/create')}>
                 <Text style={styles.createShopBtnText}>Create My Shop</Text>
               </Pressable>
             </View>
          ) : (
            <>
              {tab === 'Overview' && renderOverview()}
              {tab === 'Orders' && renderOrders()}
              {tab === 'Wallet' && (
                <View style={styles.tabContent}>
                  <Text style={styles.sectionTitle}>Wallet & Payouts</Text>
                  <View style={styles.statCardLarge}>
                    <Text style={styles.statLabelLarge}>Available Balance</Text>
                    <Text style={styles.statValueLarge}>TSh 0</Text>
                    <Pressable style={styles.payoutBtn} disabled>
                      <Text style={styles.payoutBtnText}>Request Payout</Text>
                    </Pressable>
                  </View>
                </View>
              )}
              {tab === 'Subscription' && (
                <View style={styles.tabContent}>
                  <Text style={styles.sectionTitle}>Membership Plan</Text>
                  <View style={styles.card}>
                    <Text style={styles.planName}>Basic Plan</Text>
                    <Text style={styles.planStatus}>Active until Next Month</Text>
                    <Pressable style={styles.upgradeBtn}>
                      <Text style={styles.upgradeBtnText}>Upgrade Plan</Text>
                    </Pressable>
                  </View>
                </View>
              )}
              {tab === 'Shop' && (
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
              )}
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
  title: { fontSize: 18, fontWeight: '700', color: Theme.text },
  logout: { fontSize: 15, color: Theme.link },
  tabScroll: { backgroundColor: Theme.background, maxHeight: 48 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: Theme.primary },
  tabText: { fontSize: 14, color: Theme.text },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 48 },
  tabContent: { flex: 1 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { 
    flex: 1, 
    backgroundColor: Theme.background, 
    padding: 16, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: Theme.inputBorder 
  },
  statCardLarge: { 
    backgroundColor: Theme.background, 
    padding: 24, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: Theme.inputBorder,
    alignItems: 'center'
  },
  statLabel: { fontSize: 13, color: Theme.textSecondary, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: Theme.text },
  statLabelLarge: { fontSize: 15, color: Theme.textSecondary, marginBottom: 8 },
  statValueLarge: { fontSize: 32, fontWeight: '800', color: Theme.primary, marginBottom: 20 },
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
  payoutBtn: { backgroundColor: Theme.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, opacity: 0.5 },
  payoutBtnText: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: Theme.background, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: Theme.inputBorder },
  planName: { fontSize: 18, fontWeight: '700', color: Theme.text },
  planStatus: { fontSize: 14, color: Theme.success, marginVertical: 8 },
  upgradeBtn: { marginTop: 16, backgroundColor: Theme.backgroundSecondary, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  upgradeBtnText: { color: Theme.primary, fontWeight: '600' },
  label: { fontSize: 12, color: Theme.textSecondary, marginBottom: 4 },
  value: { fontSize: 16, color: Theme.text, fontWeight: '500' },
  editShopBtn: { marginTop: 20, alignItems: 'center' },
  editShopBtnText: { color: Theme.link, fontWeight: '600' },
  orderCard: { backgroundColor: Theme.background, padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: Theme.inputBorder },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderId: { fontWeight: '600', color: Theme.text },
  orderStatus: { color: Theme.primary, fontWeight: '600', fontSize: 12 },
  orderAmount: { fontSize: 16, fontWeight: '700', color: Theme.text },
  orderDate: { fontSize: 12, color: Theme.textMuted, marginTop: 4 },
});
