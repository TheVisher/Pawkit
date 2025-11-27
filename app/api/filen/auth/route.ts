import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import FilenSDK from "@filen/sdk";
import { encryptCredentials } from "@/lib/utils/crypto";
import { getFilenSessionEmail } from "@/lib/services/filen-server";

const COOKIE_NAME = "filen_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

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

    // Create SDK instance and attempt login
    const filen = new FilenSDK({
      metadataCache: true,
      connectToSocket: false,
    });

    await filen.login({
      email,
      password,
      twoFactorCode: twoFactorCode || undefined,
    });

    // Create Pawkit folder structure if it doesn't exist
    const fs = filen.fs();
    const folders = ["/Pawkit", "/Pawkit/_Library", "/Pawkit/_Attachments"];

    for (const folderPath of folders) {
      try {
        await fs.stat({ path: folderPath });
      } catch {
        await fs.mkdir({ path: folderPath });
      }
    }

    // Store encrypted credentials in cookie
    const encryptedCreds = await encryptCredentials({ email, password });
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, encryptedCreds, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

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
    if (
      errorMessage.includes("credentials") ||
      errorMessage.includes("password") ||
      errorMessage.includes("Invalid")
    ) {
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
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return NextResponse.json({ success: true });
}

/**
 * GET /api/filen/auth - Check authentication status
 */
export async function GET() {
  const email = await getFilenSessionEmail();
  return NextResponse.json({
    authenticated: email !== null,
    email,
  });
}
