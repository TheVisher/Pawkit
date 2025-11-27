/**
 * Server-side encryption utilities for secure credential storage.
 * Uses AES-256-GCM encryption with Node.js crypto module.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Get the encryption key from environment variable.
 * Must be exactly 32 characters for AES-256.
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
  // Ensure exactly 32 characters
  return key.padEnd(32, "0").slice(0, 32);
}

/**
 * Encrypt a string value
 * Returns format: iv:authTag:encrypted (hex encoded)
 */
export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(getSecretKey()), iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt an encrypted string
 * Expects format: iv:authTag:encrypted (hex encoded)
 */
export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(getSecretKey()), iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
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
