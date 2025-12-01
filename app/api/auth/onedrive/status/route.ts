/**
 * OneDrive Connection Status Route
 *
 * Checks if the user is connected to OneDrive and returns their email.
 * Auto-refreshes expired tokens.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { refreshAccessToken, getUserInfo } from "@/lib/services/onedrive/oauth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("onedrive_tokens");

    if (!tokenCookie?.value) {
      return NextResponse.json({ connected: false });
    }

    const tokenData = JSON.parse(tokenCookie.value);

    // Check if token is expired or about to expire (within 5 minutes)
    const isExpired = Date.now() > tokenData.expiresAt - 5 * 60 * 1000;

    if (isExpired && tokenData.refreshToken) {
      try {
        // Refresh the token
        const newTokens = await refreshAccessToken(tokenData.refreshToken);

        // Get user info with new token
        const userInfo = await getUserInfo(newTokens.accessToken);

        // Update cookie with new tokens
        const newTokenData = {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresAt: Date.now() + newTokens.expiresIn * 1000,
          email: userInfo.email,
        };

        cookieStore.set("onedrive_tokens", JSON.stringify(newTokenData), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30,
          path: "/",
        });

        return NextResponse.json({
          connected: true,
          email: userInfo.email,
        });
      } catch (refreshError) {
        console.error("[OneDrive Status] Token refresh failed:", refreshError);
        // Clear invalid tokens
        cookieStore.delete("onedrive_tokens");
        return NextResponse.json({ connected: false });
      }
    }

    // Token is still valid
    return NextResponse.json({
      connected: true,
      email: tokenData.email,
    });
  } catch (error) {
    console.error("[OneDrive Status] Error:", error);
    return NextResponse.json({ connected: false });
  }
}
