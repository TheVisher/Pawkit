/**
 * Dropbox OAuth - Disconnect
 * POST /api/auth/dropbox/disconnect
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { revokeToken } from "@/lib/services/dropbox/oauth";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const DROPBOX_TOKEN_COOKIE = "dropbox_tokens";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(DROPBOX_TOKEN_COOKIE);

    if (tokenCookie?.value) {
      try {
        const tokens = JSON.parse(tokenCookie.value);
        if (tokens.accessToken) {
          await revokeToken(tokens.accessToken);
        }
      } catch {
        // Continue even if revoke fails
      }
    }

    cookieStore.delete(DROPBOX_TOKEN_COOKIE);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Dropbox] Disconnect error:", error);
    return NextResponse.json({ error: "Disconnect failed" }, { status: 500 });
  }
}
