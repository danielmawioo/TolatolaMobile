import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/src/config/env';

/**
 * Supabase client (same project as Tolatola backend).
 * Use for auth helpers or direct Supabase calls; for API use src/services/api.ts with Bearer token.
 *
 * Configured with AsyncStorage for persistent session handling and
 * autoRefreshToken to keep sessions alive across app restarts.
 */
export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;
