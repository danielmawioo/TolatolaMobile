import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Edges = 'top' | 'bottom' | 'left' | 'right';

type ScreenSafeLayoutProps = {
  children: React.ReactNode;
  /** Which edges to apply safe area insets only (no extra side margins). */
  edges?: Edges[];
  /** Optional style for the wrapper. */
  style?: ViewStyle;
};

/**
 * Wraps screen content with safe area insets only (top/bottom/left/right).
 * Does not add extra horizontal padding — use normal content padding for side margins.
 */
export function ScreenSafeLayout({
  children,
  edges = ['top', 'bottom'],
  style,
}: ScreenSafeLayoutProps) {
  const insets = useSafeAreaInsets();

  const paddingTop = edges.includes('top') ? insets.top : 0;
  const paddingBottom = edges.includes('bottom') ? insets.bottom : 0;
  const paddingLeft = edges.includes('left') ? insets.left : 0;
  const paddingRight = edges.includes('right') ? insets.right : 0;

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop,
          paddingBottom,
          paddingLeft,
          paddingRight,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, width: '100%', alignSelf: 'stretch' },
});
