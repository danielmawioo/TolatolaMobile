import { Link, Stack } from 'expo-router';
import { StyleSheet, Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Theme } from '@/constants/Theme';
import { gap } from '@/constants/layout';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>
        <Text style={styles.subtitle}>The page you're looking for could not be found.</Text>
        <Link href="/" asChild>
          <Pressable style={({ pressed }) => [styles.linkWrap, pressed && { opacity: 0.9 }]}>
            <Text style={styles.linkText}>Go to home</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: gap.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Theme.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Theme.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  linkWrap: {
    backgroundColor: Theme.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: Theme.radiusMd,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
