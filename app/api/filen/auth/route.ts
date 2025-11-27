import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import FilenSDK from "@filen/sdk";
import { encrypt, decrypt } from "@/lib/utils/crypto";

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

    // Debug: Log session data sizes
    const sessionJson = JSON.stringify(sessionData);
    console.log("[Filen] Session data size:", sessionJson.length, "bytes");

    const encryptedSession = encrypt(sessionJson);
    console.log("[Filen] Encrypted session size:", encryptedSession.length, "bytes");

    if (encryptedSession.length > 4000) {
      console.warn("[Filen] Warning: Cookie size exceeds 4KB limit!");
    }

    console.log("[Filen] Login successful for:", email);

    // Use NextResponse to set cookie (more reliable than cookies() helper)
    const response = NextResponse.json({ success: true, email });

    response.cookies.set({
      name: COOKIE_NAME,
      value: encryptedSession,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // 'lax' is more permissive than 'strict'
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    console.log("[Filen] Cookie set on response, size:", encryptedSession.length);

    return response;
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
  const response = NextResponse.json({ success: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}

/**
 * GET /api/filen/auth - Check authentication status
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    console.log("[Filen] Auth check - cookie exists:", !!sessionCookie?.value);

    if (!sessionCookie?.value) {
      return NextResponse.json({ authenticated: false, email: null });
    }

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
