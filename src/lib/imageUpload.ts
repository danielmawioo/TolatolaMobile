/**
 * Image upload helpers for faster uploads and smaller payloads.
 * Use before POST /profile/avatar or POST /tracking/complaint (photo).
 *
 * Optional: install expo-image-manipulator for resize/compress:
 *   npx expo install expo-image-manipulator
 * Then use manipulateAsync to resize to max width 800 and compress to 0.8.
 */

const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const COMPRESS_QUALITY = 0.8;

export type ImageUploadResult = {
  uri: string;
  base64?: string;
  width: number;
  height: number;
};

/**
 * Optionally compress and resize image for upload.
 * Returns data URL or base64 string suitable for API (e.g. profile/avatar).
 * Without expo-image-manipulator, returns the original uri (caller should still
 * prefer uploading smaller images when possible).
 */
export async function prepareImageForUpload(uri: string): Promise<string> {
  try {
    const ImageManipulator = require('expo-image-manipulator');
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_WIDTH, height: MAX_HEIGHT } }],
      { compress: COMPRESS_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch {
    return uri;
  }
}

/**
 * Convert file URI to base64 for API that expects base64 image.
 */
export async function uriToBase64(uri: string): Promise<string> {
  const prepared = await prepareImageForUpload(uri);
  const response = await fetch(prepared);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string)?.split(',')[1];
      resolve(base64 ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
