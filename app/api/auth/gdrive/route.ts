/**
 * Google Drive OAuth - Initiate
 * GET /api/auth/gdrive
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getAuthorizationUrl, isGoogleOAuthConfigured } from "@/lib/services/google-drive/oauth";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json(
        { error: "Google Drive not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." },
        { status: 503 }
      );
    }

    // Create state for CSRF protection
    const state = Buffer.from(
      JSON.stringify({ userId: user.id, ts: Date.now() })
    ).toString("base64");

    const cookieStore = await cookies();
    cookieStore.set("gdrive_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    return NextResponse.redirect(getAuthorizationUrl(state));
  } catch (error) {
    console.error("[GDrive OAuth] Error:", error);
    return NextResponse.json({ error: "OAuth failed" }, { status: 500 });
  }
}
