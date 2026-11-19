/**
 * Public runtime configuration. Only EXPO_PUBLIC_* values may be read here: they are
 * bundled into the app, so they must never be secrets. The Supabase anon/publishable key
 * is safe to ship because every table is protected by Row Level Security.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

export const config = {
  supabaseUrl: url,
  supabaseAnonKey: anonKey,
  /** False until a Supabase project is configured; the app then runs fully on-device. */
  isCloudConfigured: url.startsWith('https://') && anonKey.length > 20,
} as const;
