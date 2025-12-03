/**
 * Google Drive OAuth - Get Access Token
 * GET /api/auth/gdrive/token
 *
 * Returns the access token for client-side API calls.
 * Automatically refreshes if expired.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { refreshAccessToken, isGoogleOAuthConfigured } from "@/lib/services/google-drive/oauth";
import { cookies } from "next/headers";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";

const GDRIVE_TOKEN_COOKIE = "gdrive_tokens";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json({ error: "Google Drive not configured" }, { status: 503 });
    }

    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(GDRIVE_TOKEN_COOKIE);

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
        cookieStore.set(GDRIVE_TOKEN_COOKIE, JSON.stringify(tokens), {
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
      cookieStore.delete(GDRIVE_TOKEN_COOKIE);
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
  } catch (error) {
    logger.error("[GDrive] Token error:", error);
    return NextResponse.json({ error: "Failed to get token" }, { status: 500 });
  }
}
