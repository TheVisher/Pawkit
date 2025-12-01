/**
 * Dropbox OAuth - Initiate
 * GET /api/auth/dropbox
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getAuthorizationUrl, isDropboxOAuthConfigured } from "@/lib/services/dropbox/oauth";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isDropboxOAuthConfigured()) {
      return NextResponse.json(
        { error: "Dropbox not configured. Set DROPBOX_CLIENT_ID and DROPBOX_CLIENT_SECRET." },
        { status: 503 }
      );
    }

    // Create state for CSRF protection
    const state = Buffer.from(
      JSON.stringify({ userId: user.id, ts: Date.now() })
    ).toString("base64");

    const cookieStore = await cookies();
    cookieStore.set("dropbox_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    return NextResponse.redirect(getAuthorizationUrl(state));
  } catch (error) {
    console.error("[Dropbox OAuth] Error:", error);
    return NextResponse.json({ error: "OAuth failed" }, { status: 500 });
  }
}
