import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';

/**
 * Placeholder Home screen. Replace with dashboard, products, or feed.
 */
export default function HomeScreen() {
  const { session } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      {session?.user?.full_name ? (
        <Text style={styles.subtitle}>Hello, {session.user.full_name}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666' },
});
