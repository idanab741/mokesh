import * as ExpoCrypto from 'expo-crypto';

/** RFC 4122 v4 UUID. Uses the platform CSPRNG (Web Crypto on web/Node, expo-crypto on native). */
export function newId(): string {
  const webCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (webCrypto?.randomUUID) return webCrypto.randomUUID();
  return ExpoCrypto.randomUUID();
}
