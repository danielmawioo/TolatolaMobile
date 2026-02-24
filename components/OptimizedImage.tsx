import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
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
 * Product/card image with placeholder and optional optimized loading.
 * Use source when you have an image URL; otherwise placeholder is shown.
 * For best load speed with remote URLs, use expo-image when installed:
 *   import { Image } from 'expo-image';
 *   <Image source={{ uri }} contentFit="cover" recyclingKey={id} />
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

  if (hasUri) {
    return (
      <Image
        source={{ uri: source }}
        style={[
          styles.image,
          typeof width === 'number' ? { width, height: height ?? width / aspectRatio } : { width },
          height != null && typeof height === 'number' ? { height } : undefined,
          aspectRatio && height == null ? { aspectRatio } : undefined,
          style,
        ]}
        resizeMode={resizeMode}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        typeof width === 'number' ? { width, height: height ?? width / aspectRatio } : { width },
        height != null && typeof height === 'number' ? { height } : undefined,
        aspectRatio && height == null ? { aspectRatio } : undefined,
        style,
      ]}
    >
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
