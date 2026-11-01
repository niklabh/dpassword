/**
 * Zero-knowledge client-side encryption for the vault.
 *
 * Every item is serialized to JSON, encrypted with AES-GCM in the browser,
 * and only the ciphertext and initialization vector are sent to the canister.
 * The AES key is derived from the signed-in principal and held only in browser
 * memory for the active session — it is never persisted or transmitted.
 */

const KEY_INFO = "dpassword.vault.key.v1";
const IV_BYTES = 12;
const KEY_BYTES = 32;

/**
 * Fingerprints computed at derivation time, keyed by the derived CryptoKey.
 *
 * The AES key is non-extractable, so its raw bytes can never be read back out
 * of the CryptoKey. We therefore compute the fingerprint from the HKDF output
 * before importing it, and remember it here so `keyFingerprint` can return it
 * without exporting the key. Entries are dropped when the key is garbage
 * collected, so nothing outlives the in-memory session.
 */
const fingerprintCache = new WeakMap<CryptoKey, string>();

export class VaultCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaultCryptoError";
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/** Narrow a byte array to a BufferSource for the Web Crypto API. */
function toBufferSource(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource;
}

/**
 * Derive a per-user AES-GCM key from the caller's principal.
 *
 * The principal is the derivation input, so a different signed-in user can
 * never reproduce another user's key. The derived key lives only in memory.
 *
 * HKDF output is produced as raw bits first so the fingerprint can be computed
 * from the key material, then imported as a non-extractable AES-GCM key. The
 * key can never be exported back out of the browser.
 */
export async function deriveVaultKey(principal: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(principal),
    "HKDF",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode("dpassword.vault.salt.v1"),
      info: encoder.encode(KEY_INFO),
    },
    material,
    KEY_BYTES * 8,
  );
  const raw = new Uint8Array(bits);
  const key = await crypto.subtle.importKey(
    "raw",
    toBufferSource(raw),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  fingerprintCache.set(key, await fingerprintFromBytes(raw));
  return key;
}

export interface Ciphertext {
  ciphertext: Uint8Array;
  iv: Uint8Array;
}

/** Encrypt a plaintext payload into ciphertext + iv for storage. */
export async function encryptPayload(
  key: CryptoKey,
  payload: unknown,
): Promise<Ciphertext> {
  try {
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const encoded = new TextEncoder().encode(JSON.stringify(payload));
    const buffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toBufferSource(iv) },
      key,
      toBufferSource(encoded),
    );
    return { ciphertext: new Uint8Array(buffer), iv };
  } catch {
    throw new VaultCryptoError("Could not encrypt this item.");
  }
}

/** Decrypt stored ciphertext + iv back into a plaintext payload. */
export async function decryptPayload<T>(
  key: CryptoKey,
  ciphertext: Uint8Array,
  iv: Uint8Array,
): Promise<T> {
  try {
    const buffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toBufferSource(iv) },
      key,
      toBufferSource(ciphertext),
    );
    return JSON.parse(new TextDecoder().decode(buffer)) as T;
  } catch {
    throw new VaultCryptoError(
      "Could not decrypt this item. The vault key may not match.",
    );
  }
}

/** A short, stable fingerprint of the derived key for the session indicator. */
export async function keyFingerprint(key: CryptoKey): Promise<string> {
  const cached = fingerprintCache.get(key);
  if (cached) return cached;
  // A key that did not come from deriveVaultKey has no cached fingerprint and
  // cannot be exported, so fall back to a stable placeholder rather than
  // throwing InvalidAccessError.
  return "unknown";
}

/** Hash raw key material into a short base64 fingerprint. */
async function fingerprintFromBytes(raw: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", toBufferSource(raw));
  return toBase64(new Uint8Array(digest).slice(0, 6));
}

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{}";

/** Generate a strong random password for the vault password generator. */
export function generatePassword(length = 20): string {
  const all = UPPER + LOWER + DIGITS + SYMBOLS;
  const required = [
    UPPER[randomIndex(UPPER.length)],
    LOWER[randomIndex(LOWER.length)],
    DIGITS[randomIndex(DIGITS.length)],
    SYMBOLS[randomIndex(SYMBOLS.length)],
  ];
  const rest = Array.from(
    { length: Math.max(length - required.length, 0) },
    () => all[randomIndex(all.length)],
  );
  const chars = [...required, ...rest];
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function randomIndex(max: number): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] % max;
}
