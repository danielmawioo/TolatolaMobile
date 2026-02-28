import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Image } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';
import { useCart } from '@/src/contexts/CartContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Skeleton } from '@/components/Skeleton';
import { OptimizedImage } from '@/components/OptimizedImage';

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
      <View style={[styles.container, { paddingTop: insets.top + 16, paddingHorizontal: 20 }]}>
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
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Cart</Text>
        </View>
        <View style={styles.empty}>
          <FontAwesome name="shopping-basket" size={64} color={Theme.textMuted} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>Add some quality items to get started!</Text>
          <Pressable style={styles.btn} onPress={() => router.push('/(tabs)')}>
            <Text style={styles.btnText}>Continue shopping</Text>
          </Pressable>
        </View>
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
        <Pressable style={styles.checkoutBtn} onPress={() => router.push('/payment-success')}>
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
    paddingHorizontal: 20,
    marginBottom: 16,
    backgroundColor: Theme.background,
    paddingBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '700', color: Theme.text },
  clearText: { color: Theme.error, fontSize: 14 },
  listContent: { paddingHorizontal: 20 },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: Theme.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
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
    paddingHorizontal: 20,
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
    borderRadius: 12, 
    alignItems: 'center' 
  },
  checkoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  empty: { 
    backgroundColor: Theme.background, 
    borderRadius: 16, 
    padding: 40, 
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 40,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Theme.text, marginBottom: 8 },
  emptyText: { color: Theme.textSecondary, marginBottom: 24, textAlign: 'center', lineHeight: 22 },
  btn: { backgroundColor: Theme.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  skeletonItem: {
    flexDirection: 'row',
    backgroundColor: Theme.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
});
