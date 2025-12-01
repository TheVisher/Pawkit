/**
 * OneDrive OAuth Callback Route
 *
 * Handles the OAuth callback from Microsoft, exchanges the code for tokens,
 * and stores them in an HTTP-only cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, getUserInfo } from "@/lib/services/onedrive/oauth";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Handle OAuth errors
  if (error) {
    console.error("[OneDrive OAuth] Error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/home?onedrive=error&message=${encodeURIComponent(errorDescription || error)}`, baseUrl)
    );
  }

  // Validate code and state
  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/home?onedrive=error&message=Missing+code+or+state", baseUrl)
    );
  }

  // Verify state matches
  const cookieStore = await cookies();
  const storedState = cookieStore.get("onedrive_oauth_state")?.value;

  if (state !== storedState) {
    return NextResponse.redirect(
      new URL("/home?onedrive=error&message=Invalid+state", baseUrl)
    );
  }

  // Clear the state cookie
  cookieStore.delete("onedrive_oauth_state");

  try {
    // Exchange code for tokens
    const redirectUri = `${baseUrl}/api/auth/onedrive/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Get user info
    const userInfo = await getUserInfo(tokens.accessToken);

    // Store tokens in HTTP-only cookie
    const tokenData = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
      email: userInfo.email,
    };

    cookieStore.set("onedrive_tokens", JSON.stringify(tokenData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days (refresh token validity)
      path: "/",
    });

    // Redirect back to app with success
    return NextResponse.redirect(
      new URL(`/home?onedrive=connected&email=${encodeURIComponent(userInfo.email)}`, baseUrl)
    );
  } catch (error) {
    console.error("[OneDrive OAuth] Token exchange failed:", error);
    const message = error instanceof Error ? error.message : "Token exchange failed";
    return NextResponse.redirect(
      new URL(`/home?onedrive=error&message=${encodeURIComponent(message)}`, baseUrl)
    );
  }
}
