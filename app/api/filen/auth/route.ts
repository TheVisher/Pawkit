import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import FilenSDK from "@filen/sdk";
import { encrypt, decrypt } from "@/lib/utils/crypto";
import {
  getAllFolderPaths,
  getFoldersWithUuids,
  PawkitFolderKey,
} from "@/lib/services/cloud-storage/folder-config";

const COOKIE_NAME = "filen_session";
const FOLDERS_COOKIE_NAME = "filen_folders";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Folder UUIDs mapped by folder key
 */
export type PawkitFolderUUIDs = Partial<Record<PawkitFolderKey, string>>;

/**
 * Session data - essential fields for file operations.
 * Includes privateKey (needed for HMAC key generation during upload).
 * Excludes publicKey (only needed for sharing with others).
 *
 * NOTE: pawkitFolderUUIDs are NOT stored in session cookie (too large).
 * They are returned in the response body and stored in client localStorage.
 */
interface FilenSession {
  email: string;
  apiKey: string;
  masterKeys: string[]; // Only first key
  userId: number;
  baseFolderUUID: string;
  authVersion: 1 | 2 | 3;
  privateKey: string; // Required for file encryption
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
    // Uses shared folder config for consistency across all cloud providers
    const fs = filen.fs();
    const allFolderPaths = getAllFolderPaths();
    const foldersToResolve = getFoldersWithUuids();
    const pawkitFolderUUIDs: PawkitFolderUUIDs = {};

    // Create folders and collect UUIDs in a single pass
    // This avoids timing issues where newly created folders don't have UUIDs yet
    for (const folderPath of allFolderPaths) {
      try {
        // Try to stat the folder first
        let stat;
        try {
          stat = await fs.stat({ path: folderPath });
        } catch {
          // Folder doesn't exist, create it
          await fs.mkdir({ path: folderPath });
          console.log("[Filen] Created folder:", folderPath);
          // Get the stat after creation
          stat = await fs.stat({ path: folderPath });
        }

        // Check if this folder needs its UUID stored
        const folderConfig = foldersToResolve.find((f) => f.path === folderPath);
        if (folderConfig && stat?.uuid) {
          pawkitFolderUUIDs[folderConfig.key] = stat.uuid;
          console.log(`[Filen] ${folderConfig.key} folder UUID:`, stat.uuid);
        }
      } catch (error) {
        console.error(`[Filen] Error processing folder ${folderPath}:`, error);
      }
    }

    console.log("[Filen] Collected folder UUIDs:", Object.keys(pawkitFolderUUIDs));

    // Extract session data (includes privateKey for HMAC, excludes publicKey)
    // NOTE: pawkitFolderUUIDs NOT included - stored in client localStorage instead
    const config = filen.config;
    const session: FilenSession = {
      email: config.email || email,
      apiKey: config.apiKey || "",
      // Only first master key - most operations only need one
      masterKeys: config.masterKeys?.slice(0, 1) || [],
      userId: config.userId || 0,
      baseFolderUUID: config.baseFolderUUID || "",
      authVersion: (config.authVersion as 1 | 2 | 3) || 2,
      privateKey: config.privateKey || "", // Required for file encryption
    };

    // Debug: Log individual field sizes
    console.log("[Filen] Session field sizes:");
    console.log("  email:", session.email?.length || 0, "bytes");
    console.log("  apiKey:", session.apiKey?.length || 0, "bytes");
    console.log("  masterKeys[0]:", (session.masterKeys[0] || "").length, "bytes");
    console.log("  privateKey:", session.privateKey?.length || 0, "bytes");
    console.log("  userId:", String(session.userId).length, "bytes");
    console.log("  baseFolderUUID:", (session.baseFolderUUID || "").length, "bytes");

    const sessionJson = JSON.stringify(session);
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
    // folderUUIDs returned in body (stored in client localStorage, not cookie)
    const response = NextResponse.json({
      success: true,
      email,
      folderUUIDs: Object.keys(pawkitFolderUUIDs).length > 0 ? pawkitFolderUUIDs : undefined,
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: encryptedSession,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    // Set separate cookie for folder UUIDs (small enough to not need encryption)
    if (Object.keys(pawkitFolderUUIDs).length > 0) {
      const foldersJson = JSON.stringify(pawkitFolderUUIDs);
      response.cookies.set({
        name: FOLDERS_COOKIE_NAME,
        value: foldersJson,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
      });
      console.log("[Filen] Folders cookie set, size:", foldersJson.length, "bytes");
    }

    console.log("[Filen] Session cookie set, size:", encryptedSession.length, "bytes");

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
  response.cookies.delete(FOLDERS_COOKIE_NAME);
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

    const session = JSON.parse(decrypt(sessionCookie.value)) as FilenSession;

    return NextResponse.json({
      authenticated: true,
      email: session.email,
    });
  } catch (error) {
    console.error("[Filen] Auth check error:", error);
    return NextResponse.json({ authenticated: false, email: null });
  }
}
