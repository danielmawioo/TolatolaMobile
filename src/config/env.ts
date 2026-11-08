import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as {
  APP_API_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  APP_URL?: string;
  GOOGLE_WEB_CLIENT_ID?: string;
  MAPBOX_ACCESS_TOKEN?: string;
  MAPBOX_STYLE_URL?: string;
  GOOGLE_PLACES_API_KEY?: string;
  FACEBOOK_APP_ID?: string;
  GOOGLE_ANDROID_CLIENT_ID?: string;
  GOOGLE_IOS_CLIENT_ID?: string;
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
 * Supabase project credentials.
 * Includes safe production defaults so clean cloud builds and fresh app installs
 * never crash at top-level module evaluation time when .env is omitted from git.
 */
const DEFAULT_SUPABASE_URL = 'https://eyvumcctadmjetvjujcn.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5dnVtY2N0YWRtamV0dmp1amNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODg0NzYsImV4cCI6MjA3NDk2NDQ3Nn0.RuFpE0tm1xGRHDZzreE1zpgWfNeGrsqxaXPRqvNXavs';

export const SUPABASE_URL =
  extra?.SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  DEFAULT_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  extra?.SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_ANON_KEY;

/**
 * App URL scheme for deep links (e.g. tolatolamobile:// or tola://).
 */
export const APP_URL =
  extra?.APP_URL ?? process.env.EXPO_PUBLIC_APP_URL ?? 'tola://';

/**
 * Google Web Client ID for Google Sign-in.
 */
export const GOOGLE_WEB_CLIENT_ID =
  extra?.GOOGLE_WEB_CLIENT_ID ?? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

/**
 * Public Mapbox token (pk.*) for the in-app navigation map.
 */
export const MAPBOX_ACCESS_TOKEN =
  extra?.MAPBOX_ACCESS_TOKEN ??
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ??
  '';

/**
 * Mapbox style URI used by the navigation map. `navigation-day-v1` is the
 * Uber/Bolt-style road-focused style with clear labels and junctions.
 */
export const MAPBOX_STYLE_URL =
  extra?.MAPBOX_STYLE_URL ??
  process.env.EXPO_PUBLIC_MAPBOX_STYLE_URL ??
  'mapbox://styles/mapbox/navigation-day-v1';

/**
 * Google Places API Key and configuration helper.
 */
export const GOOGLE_PLACES_API_KEY =
  extra?.GOOGLE_PLACES_API_KEY ??
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ??
  '';

export function isGooglePlacesConfigured(): boolean {
  return Boolean(GOOGLE_PLACES_API_KEY);
}

/**
 * Auth OTP & Verification Paths
 */
export const AUTH_OTP_REQUEST_PATH = '/auth/otp/request';
export const AUTH_OTP_VERIFY_PATH = '/auth/otp/verify';
export const AUTH_EMAIL_VERIFY_RESEND_PATH = '/auth/verify-email/resend';
export const AUTH_EMAIL_VERIFY_SUBMIT_PATH = '/auth/verify-email/submit';

/**
 * Social Auth Configuration
 */
export const FACEBOOK_APP_ID =
  extra?.FACEBOOK_APP_ID ??
  process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ??
  '';

export const GOOGLE_ANDROID_CLIENT_ID =
  extra?.GOOGLE_ANDROID_CLIENT_ID ??
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ??
  '';

export const GOOGLE_IOS_CLIENT_ID =
  extra?.GOOGLE_IOS_CLIENT_ID ??
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ??
  '';

export function isFacebookLoginConfigured(): boolean {
  return Boolean(FACEBOOK_APP_ID);
}

export function isGoogleLoginConfigured(): boolean {
  return Boolean(
    GOOGLE_WEB_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID || GOOGLE_IOS_CLIENT_ID
  );
}
