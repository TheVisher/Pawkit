import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/utils/crypto";
import type { PawkitFolderKey } from "@/lib/services/cloud-storage/folder-config";

const FILEN_COOKIE_NAME = "filen_session";
const FILEN_FOLDERS_COOKIE_NAME = "filen_folders";

type PawkitFolderUUIDs = Partial<Record<PawkitFolderKey, string>>;

/**
 * Session data stored in the Filen cookie.
 * Folder UUIDs are stored in a separate cookie (filen_folders).
 */
interface FilenSession {
  email: string;
  apiKey: string;
  masterKeys: string[];
  userId: number;
  baseFolderUUID: string;
  authVersion: 1 | 2 | 3;
  privateKey: string;
  publicKey?: string;
}

/**
 * GET /api/filen/session - Get Filen credentials for client-side SDK
 *
 * Security measures:
 * 1. Requires authenticated Pawkit session
 * 2. Only returns credentials if Filen is connected
 * 3. Credentials are fetched from HTTP-only cookie (not stored client-side persistently)
 * 4. Response is only sent over HTTPS in production
 */
export async function GET() {
  try {
    // 1. Verify Pawkit authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // 2. Check for Filen session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(FILEN_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { success: false, error: "Filen not connected" },
        { status: 401 }
      );
    }

    // 3. Decrypt and parse session
    let session: FilenSession;
    try {
      session = JSON.parse(decrypt(sessionCookie.value)) as FilenSession;
    } catch (decryptError) {
      console.error("[Filen Session] Failed to decrypt session:", decryptError);
      return NextResponse.json(
        { success: false, error: "Invalid Filen session" },
        { status: 401 }
      );
    }

    // 4. Validate session has required fields
    if (!session.apiKey || !session.masterKeys?.length) {
      console.error("[Filen Session] Session missing required fields");
      return NextResponse.json(
        { success: false, error: "Incomplete Filen session" },
        { status: 401 }
      );
    }

    // 5. Get folder UUIDs from separate cookie
    let folderUUIDs: PawkitFolderUUIDs | undefined;
    const foldersCookie = cookieStore.get(FILEN_FOLDERS_COOKIE_NAME);
    if (foldersCookie?.value) {
      try {
        folderUUIDs = JSON.parse(foldersCookie.value) as PawkitFolderUUIDs;
        console.log("[Filen Session] Folder UUIDs from cookie:", Object.keys(folderUUIDs));
      } catch (e) {
        console.error("[Filen Session] Failed to parse folders cookie:", e);
      }
    }

    // 6. Return credentials for client-side SDK initialization
    return NextResponse.json({
      success: true,
      credentials: {
        email: session.email,
        apiKey: session.apiKey,
        masterKeys: session.masterKeys,
        privateKey: session.privateKey || "",
        publicKey: session.publicKey || "",
        userId: session.userId,
        baseFolderUUID: session.baseFolderUUID,
        authVersion: session.authVersion,
        pawkitFolderUUIDs: folderUUIDs,
      },
    });
  } catch (error) {
    console.error("[Filen Session] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get session" },
      { status: 500 }
    );
  }
}
