import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Storage adapter for the auth session.
 * Native: Keychain / Keystore via expo-secure-store. Values are chunked because a
 * session (two JWTs) can exceed the ~2KB per-item limit on some devices.
 * Web: localStorage (there is no stronger primitive available to a web page).
 */
const CHUNK = 1800;
const countKey = (key: string) => `${key}.n`;
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

async function nativeRemove(key: string) {
  const n = Number((await SecureStore.getItemAsync(countKey(key))) ?? 0);
  for (let i = 0; i < n; i += 1) await SecureStore.deleteItemAsync(`${key}.${i}`);
  await SecureStore.deleteItemAsync(countKey(key));
}

export const secureStorage = {
  async getItem(rawKey: string): Promise<string | null> {
    if (Platform.OS === 'web') return typeof localStorage === 'undefined' ? null : localStorage.getItem(rawKey);
    const key = safeKey(rawKey);
    const n = Number((await SecureStore.getItemAsync(countKey(key))) ?? 0);
    if (!n) return null;
    const parts: string[] = [];
    for (let i = 0; i < n; i += 1) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`);
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join('');
  },
  async setItem(rawKey: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(rawKey, value);
      return;
    }
    const key = safeKey(rawKey);
    await nativeRemove(key);
    const n = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < n; i += 1) await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    await SecureStore.setItemAsync(countKey(key), String(n));
  },
  async removeItem(rawKey: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(rawKey);
      return;
    }
    await nativeRemove(safeKey(rawKey));
  },
};
