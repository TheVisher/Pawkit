/**
 * Server-side encryption utilities for secure credential storage.
 * Uses AES-256-GCM encryption with gzip compression.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { gzipSync, gunzipSync } from "zlib";

const ALGORITHM = "aes-256-gcm";

/**
 * Get the encryption key from environment variable.
 * Must be exactly 32 characters for AES-256.
 */
function getSecretKey(): Buffer {
  const key = process.env.FILEN_ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FILEN_ENCRYPTION_KEY is required in production');
    }
    console.warn("[Crypto] FILEN_ENCRYPTION_KEY not set, using dev fallback");
    return Buffer.from("pawkit-dev-encryption-key-32ch!"); // Exactly 32 chars
  }
  // Ensure exactly 32 bytes
  const keyBuffer = Buffer.from(key.padEnd(32, "0").slice(0, 32));
  return keyBuffer;
}

/**
 * Encrypt a string value with gzip compression.
 * Returns format: iv:authTag:encrypted (base64 encoded for smaller size)
 */
export function encrypt(text: string): string {
  // Compress first for smaller output
  const compressed = gzipSync(Buffer.from(text, "utf8"));

  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, getSecretKey(), iv);

  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Use base64 instead of hex (33% smaller)
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypt and decompress an encrypted string.
 * Expects format: iv:authTag:encrypted (base64 encoded)
 */
export function decrypt(encryptedText: string): string {
  const [ivB64, authTagB64, encryptedB64] = encryptedText.split(":");

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, getSecretKey(), iv);
  decipher.setAuthTag(authTag);

  const compressed = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  // Decompress
  const decompressed = gunzipSync(compressed);
  return decompressed.toString("utf8");
}

/**
 * Encrypt credentials object
 */
export function encryptCredentials(credentials: {
  email: string;
  password: string;
}): string {
  return encrypt(JSON.stringify(credentials));
}

/**
 * Decrypt credentials object
 */
export function decryptCredentials(
  encrypted: string
): { email: string; password: string } | null {
  try {
    const decrypted = decrypt(encrypted);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("[Crypto] Failed to decrypt credentials:", error);
    return null;
  }
}
