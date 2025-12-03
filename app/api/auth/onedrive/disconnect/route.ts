/**
 * OneDrive Disconnect Route
 *
 * Disconnects from OneDrive by clearing the stored tokens.
 * Microsoft doesn't have a token revocation endpoint, so we just clear locally.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logger } from "@/lib/utils/logger";

export async function POST() {
  try {
    const cookieStore = await cookies();

    // Clear the tokens cookie
    cookieStore.delete("onedrive_tokens");

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[OneDrive Disconnect] Error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
