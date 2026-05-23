const KEY_LENGTH_BITS = 256;
const IV_LENGTH_BYTES = 12;
const PBKDF2_ITERATIONS = 600_000;
const PASSPHRASE_FLAG = ".p";

export type EncryptedPayload = {
  iv: string;
  ciphertext: string;
};

export type FragmentInfo = {
  keyB64: string;
  hasPassphrase: boolean;
};

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: KEY_LENGTH_BITS },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function exportKeyB64(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bytesToB64Url(new Uint8Array(raw));
}

export async function importKeyB64(b64: string): Promise<CryptoKey> {
  const raw = b64UrlToBytes(b64);
  // Must be extractable: deriveKeyWithPassphrase re-exports it as PBKDF2 salt.
  return crypto.subtle.importKey(
    "raw",
    raw as BufferSource,
    { name: "AES-GCM", length: KEY_LENGTH_BITS },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function deriveKeyWithPassphrase(
  urlKey: CryptoKey,
  passphrase: string,
): Promise<CryptoKey> {
  const salt = await crypto.subtle.exportKey("raw", urlKey);
  const pwKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase) as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    pwKey,
    { name: "AES-GCM", length: KEY_LENGTH_BITS },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptText(
  plaintext: string,
  key: CryptoKey,
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext) as BufferSource,
  );
  return {
    iv: bytesToB64Url(iv),
    ciphertext: bytesToB64Url(new Uint8Array(ciphertext)),
  };
}

export async function decryptText(
  payload: EncryptedPayload,
  key: CryptoKey,
): Promise<string> {
  const iv = b64UrlToBytes(payload.iv);
  const ciphertext = b64UrlToBytes(payload.ciphertext);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  );
  return new TextDecoder().decode(plaintext);
}

export function buildFragment(keyB64: string, hasPassphrase: boolean): string {
  return hasPassphrase ? `${keyB64}${PASSPHRASE_FLAG}` : keyB64;
}

export function parseFragment(hash: string): FragmentInfo | null {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!value) return null;
  if (value.endsWith(PASSPHRASE_FLAG)) {
    return {
      keyB64: value.slice(0, -PASSPHRASE_FLAG.length),
      hasPassphrase: true,
    };
  }
  return { keyB64: value, hasPassphrase: false };
}

function bytesToB64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64UrlToBytes(b64: string): Uint8Array {
  const padded =
    b64.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((b64.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}
