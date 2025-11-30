/**
 * Google Drive OAuth - Callback
 * GET /api/auth/gdrive/callback
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { exchangeCodeForTokens, getUserInfo } from "@/lib/services/google-drive/oauth";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const GDRIVE_TOKEN_COOKIE = "gdrive_tokens";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(`${baseUrl}/settings?gdrive=error&message=Authorization denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/settings?gdrive=error&message=Missing parameters`);
    }

    // Verify state
    const storedState = cookieStore.get("gdrive_oauth_state")?.value;
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${baseUrl}/settings?gdrive=error&message=Invalid state`);
    }
    cookieStore.delete("gdrive_oauth_state");

    // Verify user
    const user = await getCurrentUser();
    let stateData: { userId: string; ts: number };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      return NextResponse.redirect(`${baseUrl}/settings?gdrive=error&message=Invalid state format`);
    }

    if (!user || user.id !== stateData.userId) {
      return NextResponse.redirect(`${baseUrl}/settings?gdrive=error&message=User mismatch`);
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    const userInfo = await getUserInfo(tokens.accessToken);

    // Store tokens in cookie
    cookieStore.set(GDRIVE_TOKEN_COOKIE, JSON.stringify({
      ...tokens,
      email: userInfo.email,
      name: userInfo.name,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return NextResponse.redirect(
      `${baseUrl}/settings?gdrive=connected&email=${encodeURIComponent(userInfo.email)}`
    );
  } catch (error) {
    console.error("[GDrive OAuth] Callback error:", error);
    return NextResponse.redirect(`${baseUrl}/settings?gdrive=error&message=Connection failed`);
  }
}
