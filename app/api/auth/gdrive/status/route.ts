/**
 * Google Drive OAuth - Check Status
 * GET /api/auth/gdrive/status
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getUserInfo, refreshAccessToken, isGoogleOAuthConfigured } from "@/lib/services/google-drive/oauth";
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
      return NextResponse.json({
        configured: false,
        connected: false,
      });
    }

    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(GDRIVE_TOKEN_COOKIE);

    if (!tokenCookie?.value) {
      return NextResponse.json({
        configured: true,
        connected: false,
      });
    }

    try {
      let tokens = JSON.parse(tokenCookie.value);

      // Refresh if expired
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

      // Verify tokens still work
      const userInfo = await getUserInfo(tokens.accessToken);

      return NextResponse.json({
        configured: true,
        connected: true,
        email: userInfo.email,
        name: userInfo.name,
      });
    } catch {
      // Tokens invalid, clear them
      cookieStore.delete(GDRIVE_TOKEN_COOKIE);
      return NextResponse.json({
        configured: true,
        connected: false,
      });
    }
  } catch (error) {
    logger.error("[GDrive] Status error:", error);
    return NextResponse.json({ error: "Status check failed" }, { status: 500 });
  }
}
