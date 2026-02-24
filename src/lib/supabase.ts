import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/src/config/env';

/**
 * Supabase client (same project as Tolatola backend).
 * Use for auth helpers or direct Supabase calls; for API use src/services/api.ts with Bearer token.
 */
export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
