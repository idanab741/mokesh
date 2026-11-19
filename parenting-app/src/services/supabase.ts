import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import { config } from './config';
import { secureStorage } from './secureStorage';

let client: SupabaseClient | null = null;

/** Returns null when no Supabase project is configured (on-device mode). */
export function getSupabase(): SupabaseClient | null {
  if (!config.isCloudConfigured) return null;
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        storage: secureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
