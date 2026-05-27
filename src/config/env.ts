import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as {
  APP_API_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  APP_URL?: string;
  GOOGLE_WEB_CLIENT_ID?: string;
} | undefined;

/**
 * Tolatola backend API base URL (no trailing slash).
 * Production: https://api.tolatola.co
 * Local dev: http://localhost:8080 or http://YOUR_IP:8080
 */
const rawApiUrl = extra?.APP_API_URL ?? process.env.EXPO_PUBLIC_APP_API_URL;

export const APP_API_URL =
  (rawApiUrl && rawApiUrl !== 'https://api.tolatola.co')
    ? rawApiUrl
    : (typeof __DEV__ !== 'undefined' && __DEV__ ? 'http://localhost:4000' : 'https://api.tolatola.co');

/**
 * Supabase project URL (same project as the backend).
 */
export const SUPABASE_URL =
  extra?.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

/**
 * Supabase anon/public key (same as backend).
 */
export const SUPABASE_ANON_KEY =
  extra?.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * App URL scheme for deep links (e.g. tolatolamobile://).
 */
export const APP_URL =
  extra?.APP_URL ?? process.env.EXPO_PUBLIC_APP_URL ?? 'tolatolamobile://';

/**
 * Google Web Client ID for Google Sign-in.
 */
export const GOOGLE_WEB_CLIENT_ID =
  extra?.GOOGLE_WEB_CLIENT_ID ?? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
