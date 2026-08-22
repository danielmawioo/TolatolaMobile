import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';

interface AddToCartBarProps {
  adding: boolean;
  isSoldOut: boolean;
  isInCart: boolean;
  bottomInset: number;
  onPress: () => void;
}

/**
 * Floating bottom bar with the single add-to-cart action, reflecting
 * adding/in-cart/sold-out state.
 */
export function AddToCartBar({ adding, isSoldOut, isInCart, bottomInset, onPress }: AddToCartBarProps) {
  return (
    <View style={[styles.bottomBar, { paddingBottom: Math.max(bottomInset, 16) }]}>
      <Pressable
        style={[
          styles.addBtn,
          (adding || isSoldOut) && { opacity: 0.7 },
          isInCart && { backgroundColor: '#f5f5f4', borderColor: '#e7e5e4', borderWidth: 1 },
        ]}
        onPress={onPress}
        disabled={adding || isSoldOut}
      >
        {isSoldOut ? (
          <Text style={styles.addBtnText}>SOLD OUT</Text>
        ) : isInCart ? (
          <View style={styles.btnContent}>
            <FontAwesome name="check" size={16} color="#16a34a" />
            <Text style={[styles.addBtnText, { color: '#57534e' }]}>IN YOUR CART</Text>
          </View>
        ) : (
          <View style={styles.btnContent}>
            <FontAwesome name="shopping-cart" size={16} color={Theme.primary} />
            <Text style={styles.addBtnText}>{adding ? 'ADDING...' : 'ADD TO CART'}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  addBtn: { backgroundColor: '#0B5ED7', height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#0B5ED7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
});
