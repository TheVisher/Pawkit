import { NextRequest, NextResponse } from "next/server";
import FilenSDK from "@filen/sdk";

// Server-side Filen SDK instance (credentials stored only in memory during session)
let filenInstance: FilenSDK | null = null;
let sessionEmail: string | null = null;

/**
 * POST /api/filen/auth - Authenticate with Filen
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, twoFactorCode } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Create new SDK instance
    filenInstance = new FilenSDK({
      metadataCache: true,
      connectToSocket: false,
    });

    // Attempt login
    await filenInstance.login({
      email,
      password,
      twoFactorCode: twoFactorCode || undefined,
    });

    sessionEmail = email;

    // Create Pawkit folder if it doesn't exist
    const fs = filenInstance.fs();
    const pawkitPath = "/Pawkit";

    try {
      await fs.stat({ path: pawkitPath });
    } catch {
      await fs.mkdir({ path: pawkitPath });
    }

    return NextResponse.json({ success: true, email });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to connect to Filen";

    // Handle common errors - check for 2FA requirement (case-insensitive)
    const lowerError = errorMessage.toLowerCase();
    if (
      lowerError.includes("2fa") ||
      lowerError.includes("two-factor") ||
      lowerError.includes("two factor") ||
      lowerError.includes("authentication code")
    ) {
      return NextResponse.json(
        { success: false, error: "Two-factor authentication code required", needs2FA: true },
        { status: 200 }
      );
    }
    if (errorMessage.includes("credentials") || errorMessage.includes("password") || errorMessage.includes("Invalid")) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/filen/auth - Logout from Filen
 */
export async function DELETE() {
  filenInstance = null;
  sessionEmail = null;
  return NextResponse.json({ success: true });
}

/**
 * GET /api/filen/auth - Check authentication status
 */
export async function GET() {
  return NextResponse.json({
    authenticated: filenInstance !== null,
    email: sessionEmail,
  });
}
