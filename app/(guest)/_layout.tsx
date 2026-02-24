import { Stack } from 'expo-router';

export default function GuestLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="home" />
      <Stack.Screen name="track" />
      <Stack.Screen name="track/verify" />
      <Stack.Screen name="track/status" />
      <Stack.Screen name="track/complaint" />
      <Stack.Screen name="shop" />
      <Stack.Screen name="product/[id]" />
      <Stack.Screen name="shop-detail/[id]" />
    </Stack>
  );
}
