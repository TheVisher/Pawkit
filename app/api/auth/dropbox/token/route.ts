/**
 * Dropbox OAuth - Get Access Token
 * GET /api/auth/dropbox/token
 *
 * Returns the access token for client-side API calls.
 * Automatically refreshes if expired.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { refreshAccessToken, isDropboxOAuthConfigured } from "@/lib/services/dropbox/oauth";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const DROPBOX_TOKEN_COOKIE = "dropbox_tokens";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isDropboxOAuthConfigured()) {
      return NextResponse.json({ error: "Dropbox not configured" }, { status: 503 });
    }

    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(DROPBOX_TOKEN_COOKIE);

    if (!tokenCookie?.value) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }

    try {
      let tokens = JSON.parse(tokenCookie.value);

      // Refresh if expired (with 60 second buffer)
      if (Date.now() > tokens.expiresAt - 60000) {
        const refreshed = await refreshAccessToken(tokens.refreshToken);
        tokens = { ...tokens, ...refreshed };

        // Update cookie with new tokens
        cookieStore.set(DROPBOX_TOKEN_COOKIE, JSON.stringify(tokens), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30,
          path: "/",
        });
      }

      return NextResponse.json({
        accessToken: tokens.accessToken,
        expiresAt: tokens.expiresAt,
      });
    } catch {
      // Token invalid, clear it
      cookieStore.delete(DROPBOX_TOKEN_COOKIE);
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
  } catch (error) {
    console.error("[Dropbox] Token error:", error);
    return NextResponse.json({ error: "Failed to get token" }, { status: 500 });
  }
}
