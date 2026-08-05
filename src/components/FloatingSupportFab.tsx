import React from 'react';
import { Pressable, View, Text, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const MOUREEN_AVATAR = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80';

export function FloatingSupportFab() {
  const handleOpenSupport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/support' as any);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.fabContainer, pressed && { transform: [{ scale: 0.95 }] }]}
      onPress={handleOpenSupport}
      hitSlop={10}
    >
      <View style={styles.avatarWrapper}>
        <Image source={{ uri: MOUREEN_AVATAR }} style={styles.avatarImage} />
        {/* Red notification badge matching reference Image 1 */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>1</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarWrapper: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#ffffff',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  badge: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#dc2626',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
});
