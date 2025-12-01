/**
 * OneDrive OAuth Start Route
 *
 * Initiates the OAuth flow by redirecting to Microsoft's authorization page.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isOneDriveOAuthConfigured, getAuthorizationUrl } from "@/lib/services/onedrive/oauth";

export async function GET() {
  // Check if OAuth is configured
  if (!isOneDriveOAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/home?onedrive=error&message=OneDrive+not+configured", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    );
  }

  // Generate state for CSRF protection
  const state = crypto.randomUUID();

  // Store state in cookie for verification
  const cookieStore = await cookies();
  cookieStore.set("onedrive_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  // Get the redirect URI
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/onedrive/callback`;

  // Get authorization URL and redirect
  const authUrl = getAuthorizationUrl(state, redirectUri);

  return NextResponse.redirect(authUrl);
}
