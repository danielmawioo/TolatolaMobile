import React from 'react';
import { View, Text, Pressable, Image, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Theme } from '@/constants/Theme';
import { apiDelete, apiPost } from '@/src/services/api';
import type { VendorProduct, VendorShop } from '@/src/hooks/useVendorDashboardData';

interface Props {
  shop: VendorShop | null;
  products: VendorProduct[];
  accessToken: string;
  onProductsChange: (products: VendorProduct[]) => void;
}

function hasShopLocation(shopData: VendorShop | null | undefined) {
  return !!(shopData?.region && shopData?.district);
}

export function VendorProductsTab({ shop, products, accessToken, onProductsChange }: Props) {
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

  const deleteProduct = async (id: string) => {
    Alert.alert('Delete Product', 'Are you sure you want to delete this product? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!accessToken) return;
          try {
            await apiDelete(`/products/${id}`, accessToken);
            onProductsChange(products.filter(p => p.id !== id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete product');
          }
        }
      }
    ]);
  };

  const handleToggleOutOfStock = async (product: VendorProduct) => {
    if (!accessToken) return;
    try {
      const newStockQuantity = (product.stock_quantity || 0) > 0 ? 0 : 1;
      await apiPost('/products/update-stock', { productId: product.id, quantity: newStockQuantity }, accessToken);
      onProductsChange(products.map(p => p.id === product.id ? { ...p, stock_quantity: newStockQuantity } : p));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update stock');
    }
  };

  return (
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
            const hasImages = !!(product.images && product.images.length > 0);
            const imageUrl = hasImages ? product.images![0] : (product.image_url || null);

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
                      <FontAwesome name={(product.stock_quantity || 0) > 0 ? "times-circle" : "check-circle"} size={14} color={Theme.text} />
                      <Text style={styles.actionBtnText}>{(product.stock_quantity || 0) > 0 ? "Out" : "In"}</Text>
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
}

const styles = StyleSheet.create({
  tabContent: { flex: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Theme.text },

  addBtn: { backgroundColor: Theme.text, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, gap: 8 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

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
});
