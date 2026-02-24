import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';

/**
 * Placeholder Profile screen. Use GET /api/profile and PUT /api/profile for full implementation.
 */
export default function ProfileScreen() {
  const { session, logout } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {session?.user ? (
        <>
          <Text style={styles.text}>{session.user.full_name ?? session.user.email}</Text>
          <Pressable style={styles.button} onPress={logout}>
            <Text style={styles.buttonText}>Sign out</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.text}>Not signed in</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, marginBottom: 16 },
  text: { marginBottom: 16 },
  button: { backgroundColor: '#007AFF', padding: 14, borderRadius: 8, alignSelf: 'flex-start' },
  buttonText: { color: '#fff' },
});
