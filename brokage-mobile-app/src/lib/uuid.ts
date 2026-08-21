/**
 * Tiny RFC-4122 v4 UUID generator. We can't rely on `crypto.randomUUID()`
 * across all RN runtimes (Hermes lacks `globalThis.crypto` on some Android
 * builds), so we use `Math.random` — the value only has to be unique per
 * client device, not cryptographically random. The backend uses it as an
 * idempotency key, scoped per author.
 */
export function uuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
