/**
 * Robust image picker utility that handles native module errors gracefully.
 *
 * The `expo-image-picker` native module can throw `NoSuchMethodError` on Android
 * when the installed APK has a stale `expo-modules-core` build (version mismatch).
 * This module catches that error and falls back to `expo-document-picker`, which
 * uses a different native API path and avoids the crash.
 *
 * After a fresh `eas build`, the fallback should no longer be needed.
 */

import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { uriToBase64 } from './imageUpload';

export type PickedImage = {
  uri: string;
  base64: string;
  mimeType: string;
  fileName: string;
};

/** Returns true if both camera and library permissions are granted. */
export async function requestImagePermissions(): Promise<boolean> {
  const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
  const { status: libStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (camStatus !== 'granted' || libStatus !== 'granted') {
    Alert.alert(
      'Permissions Required',
      'Camera and photo library access are needed. Please enable them in your device settings.',
    );
    return false;
  }
  return true;
}

/**
 * Detects the common native-module error that occurs with stale Expo builds.
 * The error message contains "NoSuchMethodError" or "has been rejected" patterns.
 */
function isNativeModuleError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('NoSuchMethodError') ||
    msg.includes('has been rejected') ||
    msg.includes('getServices') ||
    msg.includes('ExponentImagePicker')
  );
}

/**
 * Pick an image using expo-image-picker. If the native module fails,
 * automatically falls back to expo-document-picker.
 */
export async function pickImageSafe(
  useCamera: boolean,
): Promise<PickedImage | null> {
  // ── Try expo-image-picker first ──
  try {
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          base64: true,
          allowsEditing: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          base64: true,
          allowsEditing: true,
        });

    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];
    const base64 = asset.base64;

    if (!base64) {
      // If base64 wasn't returned, read it from the URI
      const fallbackBase64 = await uriToBase64(asset.uri);
      if (!fallbackBase64) {
        Alert.alert('Error', 'Failed to read image data. Please try again.');
        return null;
      }
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      return {
        uri: asset.uri,
        base64: fallbackBase64,
        mimeType: ext === 'png' ? 'image/png' : 'image/jpeg',
        fileName: asset.fileName || `image_${Date.now()}.${ext}`,
      };
    }

    const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
    return {
      uri: asset.uri,
      base64,
      mimeType: ext === 'png' ? 'image/png' : 'image/jpeg',
      fileName: asset.fileName || `image_${Date.now()}.${ext}`,
    };
  } catch (error: unknown) {
    if (!isNativeModuleError(error)) {
      // If it's not a native module error, rethrow to let the caller handle it
      throw error;
    }

    console.warn(
      '[imagePicker] expo-image-picker native module failed, falling back to expo-document-picker:',
      error instanceof Error ? error.message : error,
    );

    // Camera is not available via DocumentPicker — inform the user
    if (useCamera) {
      Alert.alert(
        'Camera Unavailable',
        'The camera cannot be used due to a compatibility issue. Please choose a photo from your gallery instead, or update the app for full camera support.',
      );
      return null;
    }

    // ── Fallback: expo-document-picker ──
    return pickImageViaDocumentPicker();
  }
}

/**
 * Fallback image picker using expo-document-picker.
 * This avoids the ExponentImagePicker native module entirely.
 */
async function pickImageViaDocumentPicker(): Promise<PickedImage | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];
    const base64 = await uriToBase64(asset.uri);

    if (!base64) {
      Alert.alert('Error', 'Failed to read the selected image. Please try again.');
      return null;
    }

    const ext = asset.name?.split('.').pop()?.toLowerCase() || 'jpg';
    return {
      uri: asset.uri,
      base64,
      mimeType: asset.mimeType || (ext === 'png' ? 'image/png' : 'image/jpeg'),
      fileName: asset.name || `image_${Date.now()}.${ext}`,
    };
  } catch (docError: unknown) {
    console.error('[imagePicker] Document picker also failed:', docError);
    Alert.alert(
      'Upload Error',
      'Unable to select an image. Please make sure the app has storage permissions and try again.',
    );
    return null;
  }
}
