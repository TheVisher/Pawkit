import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import FilenSDK from "@filen/sdk";
import { encrypt } from "@/lib/utils/crypto";

const COOKIE_NAME = "filen_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Session data structure - stores SDK config after successful login.
 * This allows restoring the session without re-authenticating.
 */
interface FilenSessionData {
  email: string;
  apiKey: string;
  masterKeys: string[];
  publicKey: string;
  privateKey: string;
  userId: number;
  baseFolderUUID: string;
  authVersion: 1 | 2 | 3;
}

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
      tmpPath: "/tmp",
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

    // Extract session data from SDK config after successful login
    const config = filen.config;
    const sessionData: FilenSessionData = {
      email: config.email || email,
      apiKey: config.apiKey || "",
      masterKeys: config.masterKeys || [],
      publicKey: config.publicKey || "",
      privateKey: config.privateKey || "",
      userId: config.userId || 0,
      baseFolderUUID: config.baseFolderUUID || "",
      authVersion: (config.authVersion as 1 | 2 | 3) || 2,
    };

    console.log("[Filen] Login successful, storing session config for:", email);

    // Store encrypted session data in cookie (not credentials!)
    const encryptedSession = encrypt(JSON.stringify(sessionData));
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, encryptedSession, {
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

    console.error("[Filen] Login error:", errorMessage);

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
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    if (!sessionCookie?.value) {
      return NextResponse.json({ authenticated: false, email: null });
    }

    // Import decrypt here to avoid issues
    const { decrypt } = await import("@/lib/utils/crypto");
    const sessionData = JSON.parse(decrypt(sessionCookie.value)) as FilenSessionData;

    return NextResponse.json({
      authenticated: true,
      email: sessionData.email,
    });
  } catch (error) {
    console.error("[Filen] Auth check error:", error);
    return NextResponse.json({ authenticated: false, email: null });
  }
}
