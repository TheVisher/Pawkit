/**
 * Filen Server Utilities - Server-side helpers for Filen SDK operations.
 * This file is separate from the API routes to avoid Next.js route export restrictions.
 */

import { cookies } from "next/headers";
import FilenSDK from "@filen/sdk";
import { decrypt } from "@/lib/utils/crypto";

const COOKIE_NAME = "filen_session";

/**
 * Session data - matches what's stored in the cookie.
 */
interface FilenSession {
  email: string;
  apiKey: string;
  masterKeys: string[];
  userId: number;
  baseFolderUUID: string;
  authVersion: 1 | 2 | 3;
  privateKey: string; // Required for file encryption
}

/**
 * Get an authenticated Filen SDK instance from the session cookie.
 * Includes privateKey for HMAC key generation (required for uploads).
 */
export async function getFilenClient(): Promise<FilenSDK | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    if (!sessionCookie?.value) {
      console.log("[Filen] No session cookie found");
      return null;
    }

    // Decrypt and parse session
    const session = JSON.parse(decrypt(sessionCookie.value)) as FilenSession;

    if (!session.apiKey || !session.masterKeys?.length) {
      console.log("[Filen] Invalid session - missing apiKey or masterKeys");
      return null;
    }

    console.log("[Filen] Restoring session for:", session.email);

    // Create SDK instance with session config
    const filen = new FilenSDK({
      metadataCache: true,
      connectToSocket: false,
      tmpPath: "/tmp",
      // Pass auth config directly to constructor
      apiKey: session.apiKey,
      masterKeys: session.masterKeys,
      userId: session.userId,
      baseFolderUUID: session.baseFolderUUID,
      authVersion: session.authVersion,
      privateKey: session.privateKey, // Required for HMAC key generation
    });

    // Also set email for identification
    filen.config.email = session.email;

    console.log("[Filen] Session restored successfully");
    return filen;
  } catch (error) {
    console.error("[Filen] Failed to restore session:", error);
    return null;
  }
}

/**
 * Get the email from the session cookie without creating SDK instance.
 */
export async function getFilenSessionEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    if (!sessionCookie?.value) {
      return null;
    }

    const session = JSON.parse(decrypt(sessionCookie.value)) as FilenSession;
    return session.email || null;
  } catch (error) {
    console.error("[Filen] Failed to get session email:", error);
    return null;
  }
}
