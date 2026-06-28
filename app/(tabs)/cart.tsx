import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
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

  const subtotal = totalAmount;
  const total = subtotal;

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16, paddingHorizontal: gap.md }]}>
        <Text style={styles.title}>Shopping Cart</Text>
        {[1, 2, 3].map(i => (
          <View key={i} style={styles.skeletonItem}>
            <Skeleton width={80} height={80} borderRadius={12} />
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
        <Text style={styles.title}>Shopping Cart</Text>
        <EmptyState
          icon="shopping-basket"
          title={COPY.empty.cartTitle}
          message={COPY.empty.cartMessage}
          actionLabel={COPY.empty.cartAction}
          onAction={() => router.push('/(tabs)/shop')}
          style={styles.emptyState}
        />
      </View>
    );
  }

  const renderCartItem = ({ item }: { item: any }) => (
    <View style={styles.cartItem}>
      <OptimizedImage source={item.image_url || (item.images && item.images[0])} width={88} height={88} style={styles.itemImage} />
      <View style={styles.itemInfo}>
        <View style={styles.itemHeaderRow}>
          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
          <Pressable
            style={styles.removeBtn}
            onPress={() => handleRemove(item.id)}
            hitSlop={8}
          >
            <FontAwesome name="trash" size={16} color={Theme.error} />
          </Pressable>
        </View>
        <Text style={styles.vendorLabel}>by TOLA Verified Vendor</Text>

        {(item.selected_color || item.selected_size) && (
          <View style={styles.badgeRow}>
            {item.selected_color && (
              <View style={styles.itemBadge}>
                <View 
                  style={[
                    styles.colorDot, 
                    { backgroundColor: item.selected_color.name.toLowerCase() }
                  ]} 
                />
                <Text style={styles.badgeText}>{item.selected_color.name}</Text>
              </View>
            )}
            {item.selected_size && (
              <View style={styles.itemBadge}>
                <Text style={styles.badgeText}>{item.selected_size}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.qtyPriceRow}>
          <View style={styles.qtyControls}>
            <Pressable
              style={[styles.qtyBtn, item.quantity <= 1 && styles.qtyBtnDisabled]}
              onPress={() => handleUpdateQty(item.id, item.quantity - 1)}
              disabled={item.quantity <= 1}
            >
              <FontAwesome name="minus" size={10} color={item.quantity <= 1 ? Theme.textMuted : Theme.text} />
            </Pressable>
            <Text style={styles.qtyValue}>{item.quantity}</Text>
            <Pressable
              style={styles.qtyBtn}
              onPress={() => handleUpdateQty(item.id, item.quantity + 1)}
            >
              <FontAwesome name="plus" size={10} color={Theme.text} />
            </Pressable>
          </View>
          <Text style={styles.lineTotal}>
            TZS {(item.price * item.quantity).toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.summarySection}>
      {/* Order Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Order Summary</Text>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>TZS {subtotal.toLocaleString()}</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.deliveryLabelRow}>
            <FontAwesome name="truck" size={12} color={Theme.textMuted} />
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
          </View>
          <Text style={[styles.summaryValue, { color: Theme.textMuted, fontWeight: '500' }]}>
            Calculated at checkout
          </Text>
        </View>

        <View style={styles.deliveryNote}>
          <Text style={styles.deliveryNoteText}>
            Delivery fee will be calculated based on your location at checkout
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>TZS {total.toLocaleString()}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.title}>Shopping Cart</Text>
          <Text style={styles.subtitle}>{items.length} item{items.length !== 1 ? 's' : ''} in your cart</Text>
        </View>
        <Pressable onPress={() => clearCart()} hitSlop={8}>
          <Text style={styles.clearText}>Clear All</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 200 + insets.bottom }]}
        renderItem={renderCartItem}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: 16 + insets.bottom }]}>
        <Pressable
          style={styles.checkoutBtn}
          onPress={() => router.push('/checkout')}
        >
          <Text style={styles.checkoutText}>Proceed to Checkout</Text>
        </Pressable>
        <Pressable
          style={styles.continueShoppingBtn}
          onPress={() => router.push('/(tabs)')}
        >
          <Text style={styles.continueShoppingText}>Continue Shopping</Text>
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
    alignItems: 'flex-end',
    paddingHorizontal: gap.md,
    paddingBottom: 16,
    backgroundColor: Theme.background,
    borderBottomWidth: 1,
    borderBottomColor: Theme.inputBorder,
  },
  title: { fontSize: 22, fontWeight: '800', color: Theme.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: Theme.textMuted, fontWeight: '500', marginTop: 2 },
  clearText: { color: Theme.error, fontSize: 13, fontWeight: '600' },
  listContent: { paddingHorizontal: gap.md, paddingTop: 16 },

  // Cart Item Card
  cartItem: {
    flexDirection: 'row',
    backgroundColor: Theme.background,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    gap: 12,
    ...Theme.shadowMd,
  },
  itemImage: { borderRadius: 12, backgroundColor: Theme.backgroundSecondary },
  itemInfo: { flex: 1, justifyContent: 'space-between' },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.text,
    flex: 1,
    marginRight: 8,
    lineHeight: 19,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorLabel: {
    fontSize: 11,
    color: Theme.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  qtyPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.backgroundSecondary,
    borderRadius: 8,
    padding: 3,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Theme.inputBorder,
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qtyValue: {
    marginHorizontal: 14,
    fontSize: 14,
    fontWeight: '700',
    color: Theme.text,
  },
  lineTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.primary,
  },

  // Order Summary
  summarySection: { marginTop: 8 },
  summaryCard: {
    backgroundColor: Theme.background,
    borderRadius: 16,
    padding: 18,
    ...Theme.shadowMd,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Theme.text,
    marginBottom: 4,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Theme.inputBorder,
    marginVertical: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  deliveryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: Theme.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: Theme.text,
    fontWeight: '600',
  },
  deliveryNote: {
    backgroundColor: Theme.backgroundSecondary,
    borderRadius: 8,
    padding: 10,
    marginBottom: 4,
  },
  deliveryNoteText: {
    fontSize: 11,
    color: Theme.textMuted,
    lineHeight: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.text,
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Theme.background,
    paddingHorizontal: gap.md,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Theme.inputBorder,
    gap: 10,
    ...Theme.shadowLg,
  },
  checkoutBtn: {
    backgroundColor: Theme.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...Theme.shadowMd,
  },
  checkoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  continueShoppingBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Theme.inputBorder,
    backgroundColor: 'transparent',
  },
  continueShoppingText: {
    color: Theme.text,
    fontSize: 15,
    fontWeight: '600',
  },

  // Empty / Loading
  emptyState: { marginTop: 40 },
  skeletonItem: {
    flexDirection: 'row',
    backgroundColor: Theme.background,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  itemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafaf9',
    borderColor: '#e7e5e4',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderColor: '#d6d3d1',
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#57534e',
  },
});
