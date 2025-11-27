import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import FilenSDK from "@filen/sdk";
import { encrypt, decrypt } from "@/lib/utils/crypto";

const COOKIE_NAME = "filen_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Minimal session data - only essential fields for file operations.
 * Excludes privateKey/publicKey (needed only for sharing).
 */
interface FilenMinimalSession {
  email: string;
  apiKey: string;
  masterKeys: string[]; // Only first key
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

    // Extract MINIMAL session data (skip privateKey/publicKey to save space)
    const config = filen.config;
    const minimalSession: FilenMinimalSession = {
      email: config.email || email,
      apiKey: config.apiKey || "",
      // Only first master key - most operations only need one
      masterKeys: config.masterKeys?.slice(0, 1) || [],
      userId: config.userId || 0,
      baseFolderUUID: config.baseFolderUUID || "",
      authVersion: (config.authVersion as 1 | 2 | 3) || 2,
    };

    // Debug: Log individual field sizes
    console.log("[Filen] Minimal session field sizes:");
    console.log("  email:", minimalSession.email?.length || 0, "bytes");
    console.log("  apiKey:", minimalSession.apiKey?.length || 0, "bytes");
    console.log("  masterKeys[0]:", (minimalSession.masterKeys[0] || "").length, "bytes");
    console.log("  userId:", String(minimalSession.userId).length, "bytes");
    console.log("  baseFolderUUID:", (minimalSession.baseFolderUUID || "").length, "bytes");

    const sessionJson = JSON.stringify(minimalSession);
    console.log("[Filen] Total minimal session:", sessionJson.length, "bytes");

    const encryptedSession = encrypt(sessionJson);
    console.log("[Filen] Compressed+encrypted size:", encryptedSession.length, "bytes");

    if (encryptedSession.length > 4096) {
      console.error("[Filen] ERROR: Still too large after compression!");
      return NextResponse.json(
        { success: false, error: "Session data too large. Please contact support." },
        { status: 500 }
      );
    }

    console.log("[Filen] Login successful for:", email);

    // Use NextResponse to set cookie
    const response = NextResponse.json({ success: true, email });

    response.cookies.set({
      name: COOKIE_NAME,
      value: encryptedSession,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    console.log("[Filen] Cookie set, size:", encryptedSession.length, "bytes");

    return response;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to connect to Filen";

    console.error("[Filen] Login error:", errorMessage);

    // Handle common errors
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

    if (!sessionCookie?.value) {
      return NextResponse.json({ authenticated: false, email: null });
    }

    const session = JSON.parse(decrypt(sessionCookie.value)) as FilenMinimalSession;

    return NextResponse.json({
      authenticated: true,
      email: session.email,
    });
  } catch (error) {
    console.error("[Filen] Auth check error:", error);
    return NextResponse.json({ authenticated: false, email: null });
  }
}
