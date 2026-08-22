import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AppThemeProvider } from '@/src/contexts/ThemeContext';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { CartProvider } from '@/src/contexts/CartContext';
import { NotificationProvider } from '@/src/contexts/NotificationContext';
import { FloatingSupportFab } from '@/src/components/FloatingSupportFab';
import { OfflineBanner } from '@/src/components/OfflineBanner';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppThemeProvider>
      <RootLayoutNav />
    </AppThemeProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <OfflineBanner />
      <AuthProvider>
        <NotificationProvider>
          <CartProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(guest)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(vendor)" />
              <Stack.Screen name="(transporter)" />
              <Stack.Screen name="(agent)" />
              <Stack.Screen name="(admin)" />
              <Stack.Screen name="payment-success" />
              <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
              </Stack>
              <FloatingSupportFab />
            </ThemeProvider>
          </CartProvider>
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
