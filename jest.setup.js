jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// src/config/env.ts throws if SUPABASE_URL/SUPABASE_ANON_KEY are missing (by
// design — no hardcoded fallback). Under Jest there's no real
// Constants.expoConfig.extra, so provide harmless dummy values here instead
// of depending on a real .env being present.
process.env.EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';
