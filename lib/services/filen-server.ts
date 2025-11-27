/**
 * Filen Server Utilities - Server-side helpers for Filen SDK operations.
 * This file is separate from the API routes to avoid Next.js route export restrictions.
 */

import { cookies } from "next/headers";
import FilenSDK from "@filen/sdk";
import { decrypt } from "@/lib/utils/crypto";

const COOKIE_NAME = "filen_session";

/**
 * Minimal session data - matches what's stored in the cookie.
 */
interface FilenMinimalSession {
  email: string;
  apiKey: string;
  masterKeys: string[];
  userId: number;
  baseFolderUUID: string;
  authVersion: 1 | 2 | 3;
}

/**
 * Get an authenticated Filen SDK instance from the session cookie.
 * Uses minimal session data (no privateKey/publicKey).
 */
export async function getFilenClient(): Promise<FilenSDK | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    if (!sessionCookie?.value) {
      console.log("[Filen] No session cookie found");
      return null;
    }

    // Decrypt and parse minimal session
    const session = JSON.parse(decrypt(sessionCookie.value)) as FilenMinimalSession;

    if (!session.apiKey || !session.masterKeys?.length) {
      console.log("[Filen] Invalid session - missing apiKey or masterKeys");
      return null;
    }

    console.log("[Filen] Restoring minimal session for:", session.email);

    // Create SDK instance with minimal config
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
    });

    // Also set email for identification
    filen.config.email = session.email;

    console.log("[Filen] Session restored successfully (minimal config)");
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

    const session = JSON.parse(decrypt(sessionCookie.value)) as FilenMinimalSession;
    return session.email || null;
  } catch (error) {
    console.error("[Filen] Failed to get session email:", error);
    return null;
  }
}
