/**
 * Filen Server Utilities - Server-side helpers for Filen SDK operations.
 * This file is separate from the API routes to avoid Next.js route export restrictions.
 */

import { cookies } from "next/headers";
import FilenSDK from "@filen/sdk";
import { decryptCredentials } from "@/lib/utils/crypto";

const COOKIE_NAME = "filen_session";

/**
 * Get an authenticated Filen SDK instance from the session cookie.
 * Use this in API routes to get an authenticated client.
 */
export async function getFilenClient(): Promise<FilenSDK | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  const credentials = await decryptCredentials(sessionCookie.value);
  if (!credentials) {
    return null;
  }

  try {
    const filen = new FilenSDK({
      metadataCache: true,
      connectToSocket: false,
    });

    await filen.login({
      email: credentials.email,
      password: credentials.password,
    });

    return filen;
  } catch (error) {
    console.error("[Filen] Failed to authenticate from session:", error);
    return null;
  }
}

/**
 * Get the email from the session cookie without full authentication.
 * Useful for quick status checks.
 */
export async function getFilenSessionEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  const credentials = await decryptCredentials(sessionCookie.value);
  return credentials?.email || null;
}
