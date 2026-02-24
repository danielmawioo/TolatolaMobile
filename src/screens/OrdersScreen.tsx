import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Placeholder Orders screen. Implement with GET /api/orders and order detail/status flows.
 */
export default function OrdersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Orders</Text>
      <Text style={styles.placeholder}>Orders list — use GET /api/orders with Bearer token</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, marginBottom: 16 },
  placeholder: { color: '#666' },
});
