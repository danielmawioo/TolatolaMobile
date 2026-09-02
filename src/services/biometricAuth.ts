import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const CREDENTIALS_KEY = 'tolatola_biometric_credentials';
const BIOMETRIC_ENABLED_KEY = 'tolatola_biometric_enabled';

export type BiometricType = 'Fingerprint' | 'Face ID' | 'Iris' | 'Biometrics';

/**
 * Check whether the device has biometric hardware and at least one
 * biometric identity enrolled (fingerprint, face, etc.).
 */
export async function isBiometricsAvailable(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch {
    return false;
  }
}

/**
 * Return a human-readable label for the strongest biometric type the device
 * supports (e.g. "Fingerprint", "Face ID").
 */
export async function getBiometricType(): Promise<BiometricType> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    }
  } catch {
    // fall through
  }
  return 'Biometrics';
}

/**
 * Save login credentials to the hardware-encrypted secure store.
 * Called after the user opts in to biometric login.
 */
export async function saveCredentials(email: string, password: string): Promise<void> {
  const payload = JSON.stringify({ email, password });
  await SecureStore.setItemAsync(CREDENTIALS_KEY, payload);
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
}

/**
 * Retrieve stored credentials (without triggering biometric prompt).
 * Returns null if nothing is stored.
 */
export async function getCredentials(): Promise<{ email: string; password: string } | null> {
  try {
    const raw = await SecureStore.getItemAsync(CREDENTIALS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Remove all stored biometric credentials.
 */
export async function clearCredentials(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  } catch {
    // Ignore — keys may not exist
  }
}

/**
 * Check whether the user has previously opted in to biometric login
 * (i.e. credentials are stored).
 */
export async function isBiometricLoginEnabled(): Promise<boolean> {
  try {
    const flag = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return flag === 'true';
  } catch {
    return false;
  }
}

/**
 * Trigger the native biometric prompt. On success, return stored credentials.
 * On failure / cancellation, return null.
 */
export async function authenticateWithBiometrics(): Promise<{ email: string; password: string } | null> {
  const biometricType = await getBiometricType();

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: `Sign in to TOLA with ${biometricType}`,
    fallbackLabel: 'Use password',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });

  if (!result.success) return null;

  return getCredentials();
}
