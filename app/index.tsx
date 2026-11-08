import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Theme } from '@/constants/Theme';

export default function IndexScreen() {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    router.replace('/(tabs)');
  }, [isLoading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Theme.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.background,
  },
});
