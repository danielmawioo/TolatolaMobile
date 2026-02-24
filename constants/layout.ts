import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** Base width for scale (e.g. 375 = iPhone 8). */
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Scale a value by screen width so layouts look consistent across phone sizes.
 */
export function scaleByWidth(value: number): number {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(PixelRatio.roundToNearestPixel(value * Math.min(scale, 1.4)));
}

/**
 * Scale a value by screen height (for vertical spacing when needed).
 */
export function scaleByHeight(value: number): number {
  const scale = SCREEN_HEIGHT / BASE_HEIGHT;
  return Math.round(PixelRatio.roundToNearestPixel(value * Math.min(scale, 1.3)));
}

/**
 * Horizontal padding that shares screen space well (responsive).
 */
export const horizontalPadding = scaleByWidth(20);

/**
 * Vertical section spacing.
 */
export const sectionGap = scaleByHeight(20);

/**
 * Consistent gaps for grids and rows.
 */
export const gap = {
  xs: scaleByWidth(6),
  sm: scaleByWidth(10),
  md: scaleByWidth(12),
  lg: scaleByWidth(16),
};

/**
 * Safe horizontal margin (same as horizontalPadding for content).
 */
export const contentMargin = horizontalPadding;

/**
 * Get product card width for 2-column grid (with gap between).
 */
export function getGridCardWidth(gapBetween: number = gap.md): number {
  return (SCREEN_WIDTH - horizontalPadding * 2 - gapBetween) / 2;
}

/**
 * Get width for horizontal scroll card (e.g. flash sale) – ~38% of screen.
 */
export function getScrollCardWidth(): number {
  return SCREEN_WIDTH * 0.38;
}

/**
 * Banner/carousel width (full width minus horizontal padding).
 */
export function getBannerWidth(): number {
  return SCREEN_WIDTH - horizontalPadding * 2;
}

export const layout = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  horizontalPadding,
  sectionGap,
  gap,
  contentMargin,
  scaleByWidth,
  scaleByHeight,
};
