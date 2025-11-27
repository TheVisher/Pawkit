/**
 * Filen Server Utilities - Server-side helpers for Filen SDK operations.
 * This file is separate from the API routes to avoid Next.js route export restrictions.
 */

import { cookies } from "next/headers";
import FilenSDK from "@filen/sdk";
import { decrypt } from "@/lib/utils/crypto";

const COOKIE_NAME = "filen_session";

/**
 * Session data structure - matches what's stored in the cookie.
 */
interface FilenSessionData {
  email: string;
  apiKey: string;
  masterKeys: string[];
  publicKey: string;
  privateKey: string;
  userId: number;
  baseFolderUUID: string;
  authVersion: 1 | 2 | 3;
}

/**
 * Get an authenticated Filen SDK instance from the session cookie.
 * Restores the session from saved config - no login() call needed!
 */
export async function getFilenClient(): Promise<FilenSDK | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    if (!sessionCookie?.value) {
      console.log("[Filen] No session cookie found");
      return null;
    }

    // Decrypt and parse session data
    const sessionData = JSON.parse(decrypt(sessionCookie.value)) as FilenSessionData;

    if (!sessionData.apiKey || !sessionData.masterKeys?.length) {
      console.log("[Filen] Invalid session data - missing apiKey or masterKeys");
      return null;
    }

    console.log("[Filen] Restoring session for:", sessionData.email);

    // Create SDK instance with saved session config - no login required!
    const filen = new FilenSDK({
      // Auth config from saved session
      apiKey: sessionData.apiKey,
      masterKeys: sessionData.masterKeys,
      publicKey: sessionData.publicKey,
      privateKey: sessionData.privateKey,
      userId: sessionData.userId,
      baseFolderUUID: sessionData.baseFolderUUID,
      authVersion: sessionData.authVersion,
      // SDK options
      metadataCache: true,
      connectToSocket: false,
      tmpPath: "/tmp",
    });

    console.log("[Filen] Session restored successfully");
    return filen;
  } catch (error) {
    console.error("[Filen] Failed to restore session:", error);
    return null;
  }
}

/**
 * Get the email from the session cookie without creating SDK instance.
 * Useful for quick status checks.
 */
export async function getFilenSessionEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    if (!sessionCookie?.value) {
      return null;
    }

    const sessionData = JSON.parse(decrypt(sessionCookie.value)) as FilenSessionData;
    return sessionData.email || null;
  } catch (error) {
    console.error("[Filen] Failed to get session email:", error);
    return null;
  }
}
