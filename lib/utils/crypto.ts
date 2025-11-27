/**
 * Server-side encryption utilities for secure credential storage.
 * Uses AES-GCM encryption with a secret key from environment variables.
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Get the encryption key from environment variable.
 * In production, this should be a securely generated 32-byte key.
 */
function getSecretKey(): string {
  const key = process.env.FILEN_ENCRYPTION_KEY;
  if (!key) {
    // Fallback for development - in production this should be set
    console.warn(
      "[Crypto] FILEN_ENCRYPTION_KEY not set, using fallback. Set this in production!"
    );
    return "pawkit-dev-encryption-key-32ch!"; // Exactly 32 chars
  }
  return key;
}

/**
 * Import the secret key for use with Web Crypto API
 */
async function importKey(): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(getSecretKey().padEnd(32, "0").slice(0, 32));
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a string value
 * Returns base64-encoded string containing IV + ciphertext
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encodedData = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encodedData
  );

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Return as base64
  return Buffer.from(combined).toString("base64");
}

/**
 * Decrypt a base64-encoded encrypted string
 */
export async function decrypt(encrypted: string): Promise<string> {
  const key = await importKey();
  const combined = Buffer.from(encrypted, "base64");

  // Extract IV and ciphertext
  const iv = combined.subarray(0, IV_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Encrypt credentials object
 */
export async function encryptCredentials(credentials: {
  email: string;
  password: string;
}): Promise<string> {
  return encrypt(JSON.stringify(credentials));
}

/**
 * Decrypt credentials object
 */
export async function decryptCredentials(
  encrypted: string
): Promise<{ email: string; password: string } | null> {
  try {
    const decrypted = await decrypt(encrypted);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("[Crypto] Failed to decrypt credentials:", error);
    return null;
  }
}
