import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Theme } from '@/constants/Theme';

type OptimizedImageProps = {
  /** Image URI (remote or local). When null/undefined, shows placeholder. */
  source?: string | null;
  width: number | string;
  height?: number | string;
  /** Aspect ratio (e.g. 1 for square). Used when height not provided. */
  aspectRatio?: number;
  style?: object;
  /** Resize mode when using Image: cover | contain | stretch */
  resizeMode?: 'cover' | 'contain' | 'stretch';
};

/**
 * Product/card image with placeholder and high-performance loading using expo-image.
 */
export function OptimizedImage({
  source,
  width,
  height,
  aspectRatio = 1,
  style,
  resizeMode = 'cover',
}: OptimizedImageProps) {
  const hasUri = typeof source === 'string' && source.length > 0;

  const imageStyles = [
    styles.image,
    { width },
    height !== undefined 
      ? { height } 
      : (typeof width === 'number' ? { height: width / aspectRatio } : { aspectRatio }),
    style,
  ];

  if (hasUri) {
    return (
      <Image
        source={{ uri: source }}
        style={imageStyles}
        contentFit={resizeMode === 'stretch' ? 'fill' : resizeMode}
        transition={200}
        cachePolicy="disk"
      />
    );
  }

  return (
    <View style={[styles.placeholder, ...imageStyles]}>
      <FontAwesome name="image" size={32} color={Theme.inputBorder} />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: Theme.inputBg,
    borderRadius: 8,
  },
  placeholder: {
    backgroundColor: Theme.inputBg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
