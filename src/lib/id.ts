/**
 * `expo-crypto` is a native module and can't load outside the Expo/RN runtime
 * (e.g. under Vitest), so we prefer the Web Crypto global when it's already
 * available there and only reach for `expo-crypto` on device.
 */
export function generateId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const Crypto = require('expo-crypto');
  return Crypto.randomUUID();
}
