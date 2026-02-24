import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { getRoleRedirectPath } from '@/src/lib/roleRedirect';

export default function IndexScreen() {
  const { isAuthenticated, isLoading, session } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      const userType = session?.user?.user_type as string | undefined;
      router.replace(getRoleRedirectPath(userType) as any);
    } else {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, session?.user?.user_type]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0d9488" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
