import React, { useRef } from 'react';
import {
  Animated,
  PanResponder,
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const MOUREEN_AVATAR = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80';
const FAB_SIZE = 60;

export function FloatingSupportFab() {
  const pan = useRef(new Animated.ValueXY()).current;
  // Track whether the gesture was a drag vs. a tap
  const isDragging = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only claim the gesture if the finger has moved > 5px (avoids stealing taps)
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        isDragging.current = false;
        // Flatten offset into the current value so the next drag starts from here
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
          isDragging.current = true;
        }
        Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        })(_, gestureState);
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();

        // Snap to the nearest horizontal edge for easy reach
        const { width: screenWidth } = Dimensions.get('window');
        const currentX = (pan.x as any)._value;
        // Positive X moves the FAB left (since it's anchored right: 20)
        // We calculate the actual left position of the FAB
        const rightEdge = 20; // original right offset
        const fabLeftPos = screenWidth - rightEdge - FAB_SIZE + currentX;
        const snapToRight = fabLeftPos > screenWidth / 2;

        Animated.spring(pan.x, {
          toValue: snapToRight ? 0 : -(screenWidth - rightEdge * 2 - FAB_SIZE),
          useNativeDriver: false,
          friction: 7,
          tension: 40,
        }).start();

        // If it was a tap (not a drag), navigate to support
        if (!isDragging.current) {
          handleOpenSupport();
        }
      },
    })
  ).current;

  const handleOpenSupport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/support' as any);
  };

  return (
    <Animated.View
      style={[
        styles.fabContainer,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.avatarWrapper}>
        <Image source={{ uri: MOUREEN_AVATAR }} style={styles.avatarImage} />
        {/* Red notification badge matching reference Image 1 */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>1</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 90,
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
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#ffffff',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: FAB_SIZE / 2 - 2,
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
