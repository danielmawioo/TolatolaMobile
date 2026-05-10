import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';
import { useCart } from '@/src/contexts/CartContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Skeleton } from '@/components/Skeleton';
import { OptimizedImage } from '@/components/OptimizedImage';
import { EmptyState } from '@/components/EmptyState';
import { COPY } from '@/constants/copy';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { items, isLoading, removeItem, updateQuantity, totalAmount, clearCart } = useCart();

  const handleRemove = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    removeItem(id);
  };

  const handleUpdateQty = (id: string, newQty: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateQuantity(id, newQty);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16, paddingHorizontal: gap.md }]}>
        <Text style={styles.title}>Cart</Text>
        {[1, 2, 3].map(i => (
          <View key={i} style={styles.skeletonItem}>
            <Skeleton width={80} height={80} borderRadius={8} />
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Skeleton width="60%" height={16} style={{ marginBottom: 8 }} />
              <Skeleton width="40%" height={20} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16, paddingHorizontal: gap.md }]}>
        <Text style={styles.title}>Cart</Text>
        <EmptyState
          icon="shopping-basket"
          title={COPY.empty.cartTitle}
          message={COPY.empty.cartMessage}
          actionLabel={COPY.empty.cartAction}
          onAction={() => router.push('/(tabs)')}
          style={styles.emptyState}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Cart ({items.length})</Text>
        <Pressable onPress={() => clearCart()}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 120 + insets.bottom }]}
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            <OptimizedImage source={item.image_url} width={80} height={80} style={styles.itemImage} />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.itemPrice}>TSh {item.price.toLocaleString()}</Text>
              
              <View style={styles.qtyRow}>
                <View style={styles.qtyControls}>
                  <Pressable style={styles.qtyBtn} onPress={() => handleUpdateQty(item.id, item.quantity - 1)}>
                    <FontAwesome name="minus" size={12} color={Theme.text} />
                  </Pressable>
                  <Text style={styles.qtyValue}>{item.quantity}</Text>
                  <Pressable style={styles.qtyBtn} onPress={() => handleUpdateQty(item.id, item.quantity + 1)}>
                    <FontAwesome name="plus" size={12} color={Theme.text} />
                  </Pressable>
                </View>
                <Pressable style={styles.removeBtn} onPress={() => handleRemove(item.id)}>
                  <FontAwesome name="trash" size={18} color={Theme.error} />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: 20 + insets.bottom }]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>TSh {totalAmount.toLocaleString()}</Text>
        </View>
        <Pressable style={styles.checkoutBtn} onPress={() => router.push('/checkout')}>
          <Text style={styles.checkoutText}>Proceed to Checkout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.backgroundSecondary },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: gap.md,
    marginBottom: 16,
    backgroundColor: Theme.background,
    paddingBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '700', color: Theme.text },
  clearText: { color: Theme.error, fontSize: 14 },
  listContent: { paddingHorizontal: gap.md },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: Theme.background,
    borderRadius: Theme.radiusMd,
    padding: 12,
    marginBottom: 12,
    ...Theme.shadowSm,
  },
  itemImage: { borderRadius: 8 },
  itemInfo: { flex: 1, marginLeft: 16 },
  itemName: { fontSize: 16, fontWeight: '600', color: Theme.text, marginBottom: 4 },
  itemPrice: { fontSize: 15, color: Theme.primary, fontWeight: '700', marginBottom: 12 },
  qtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qtyControls: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Theme.backgroundSecondary,
    borderRadius: 8,
    padding: 4,
  },
  qtyBtn: { 
    width: 28, 
    height: 28, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: Theme.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  qtyValue: { marginHorizontal: 12, fontSize: 14, fontWeight: '600', color: Theme.text },
  removeBtn: { padding: 8 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Theme.background,
    paddingHorizontal: gap.md,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Theme.inputBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  totalLabel: { fontSize: 16, color: Theme.textSecondary },
  totalValue: { fontSize: 20, fontWeight: '700', color: Theme.text },
  checkoutBtn: { 
    backgroundColor: Theme.primary, 
    paddingVertical: 16, 
    borderRadius: Theme.radiusMd, 
    alignItems: 'center',
    ...Theme.shadowSm,
  },
  checkoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  emptyState: { marginTop: 40 },
  skeletonItem: {
    flexDirection: 'row',
    backgroundColor: Theme.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
});
