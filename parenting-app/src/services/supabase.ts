import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import { config } from './config';
import { secureStorage } from './secureStorage';

let client: SupabaseClient | null = null;

/** A request on a dead or captive network can hang forever; a sync must fail and retry instead. */
const REQUEST_TIMEOUT_MS = 12_000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  init?.signal?.addEventListener('abort', () => controller.abort());
  return fetch(input, { ...init, signal: controller.signal })
    .catch((err) => {
      if (controller.signal.aborted) throw new Error('Network request timeout');
      throw err;
    })
    .finally(() => clearTimeout(timer));
}

/** Returns null when no Supabase project is configured (on-device mode). */
export function getSupabase(): SupabaseClient | null {
  if (!config.isCloudConfigured) return null;
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      global: { fetch: fetchWithTimeout },
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
