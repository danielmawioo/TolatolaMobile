import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { apiPost } from '@/src/services/api';
import { logger } from '@/src/lib/logger';
import { pickImageSafe, requestImagePermissions } from '@/src/lib/imagePicker';
import type { Product } from '@/src/types';

/**
 * Owns the "search by image" flow for the guest shop screen: uploading a
 * photo (camera or gallery), sending it for AI analysis, and holding the
 * resulting matched products/analysis/keywords.
 *
 * If `autoSearchImageBase64` is provided (e.g. the screen was deep-linked
 * to with an image already picked), the search runs automatically once.
 */
export function useImageProductSearch(autoSearchImageBase64?: string, autoSearchMimeType?: string) {
  const [isImageSearching, setIsImageSearching] = useState<boolean>(false);
  const [imageSearchResults, setImageSearchResults] = useState<Product[] | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<string>('');
  const [imageKeywords, setImageKeywords] = useState<string[]>([]);

  const handleImageSearch = useCallback(async (base64Data: string, mimeType?: string) => {
    setIsImageSearching(true);
    setImageSearchResults(null);
    setImageAnalysis('');
    setImageKeywords([]);

    try {
      const formattedBase64 = base64Data.startsWith('data:')
        ? base64Data
        : `data:${mimeType || 'image/jpeg'};base64,${base64Data}`;

      const res = await apiPost<{
        data?: Product[];
        analysis?: string;
        keywords?: string[];
        total?: number;
      }>('/products/search-by-image', { image: formattedBase64 });

      setImageSearchResults(res.data || []);
      if (res.analysis) setImageAnalysis(res.analysis);
      if (res.keywords) setImageKeywords(res.keywords);
    } catch (err) {
      logger.error('[Image Search Error]', err);
      setImageSearchResults([]);
      Alert.alert('Image search failed', 'Could not analyze your image. Please try again.');
    } finally {
      setIsImageSearching(false);
    }
  }, []);

  // Run image search if the screen was opened with an image already picked
  useEffect(() => {
    if (autoSearchImageBase64) {
      handleImageSearch(autoSearchImageBase64, autoSearchMimeType);
    }
  }, [autoSearchImageBase64, autoSearchMimeType, handleImageSearch]);

  const triggerImagePicker = useCallback(() => {
    Alert.alert(
      'Search by Image',
      'Upload a photo to find matching products using TOLATOLA AI',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const ok = await requestImagePermissions();
            if (!ok) return;
            const picked = await pickImageSafe(true);
            if (picked?.base64) {
              handleImageSearch(picked.base64, picked.mimeType);
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const ok = await requestImagePermissions();
            if (!ok) return;
            const picked = await pickImageSafe(false);
            if (picked?.base64) {
              handleImageSearch(picked.base64, picked.mimeType);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, [handleImageSearch]);

  const handleClearImageSearch = useCallback(() => {
    setImageSearchResults(null);
    setImageAnalysis('');
    setImageKeywords([]);
    setIsImageSearching(false);
  }, []);

  const isImageSearchMode = isImageSearching || imageSearchResults !== null;

  return {
    isImageSearching,
    imageSearchResults,
    imageAnalysis,
    imageKeywords,
    isImageSearchMode,
    triggerImagePicker,
    handleClearImageSearch,
  };
}
