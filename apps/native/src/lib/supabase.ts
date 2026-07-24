import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

export const supabaseConfigured = Boolean(url && anonKey);

/**
 * Match web `requireEmailConfirmation` / supabase config.toml
 * `[auth.email] enable_confirmations` (default true in this starter).
 */
export const requireEmailConfirmation =
  (process.env.EXPO_PUBLIC_SUPABASE_REQUIRE_EMAIL_CONFIRMATION ?? 'true')
    .trim()
    .toLowerCase() !== 'false';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured) {
    return null;
  }
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

export function supabaseConfigErrorMessage(): string {
  return 'Sign-in is not configured on this build. See apps/native/README.md.';
}
