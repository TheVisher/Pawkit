import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/utils/crypto";

// Note: api.filen.io doesn't exist (NXDOMAIN), use gateway.filen.io instead
const FILEN_API_URL = "https://gateway.filen.io";
const FILEN_COOKIE_NAME = "filen_session";

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
 * POST /api/filen/delete - Direct delete (trash) a file from Filen
 *
 * Bypasses the Filen SDK to avoid folder navigation issues.
 * Uses the same pattern as upload-done for CORS proxy.
 */
export async function POST(request: Request) {
  try {
    // 1. Verify Pawkit authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { status: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    // 2. Get Filen session from cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(FILEN_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { status: false, message: "Filen not connected" },
        { status: 401 }
      );
    }

    // 3. Decrypt session
    let session: FilenSession;
    try {
      session = JSON.parse(decrypt(sessionCookie.value)) as FilenSession;
    } catch (decryptError) {
      console.error("[Filen Delete] Failed to decrypt session:", decryptError);
      return NextResponse.json(
        { status: false, message: "Invalid Filen session" },
        { status: 401 }
      );
    }

    if (!session.apiKey) {
      return NextResponse.json(
        { status: false, message: "Missing API key" },
        { status: 401 }
      );
    }

    // 4. Get the file UUID from request body
    const body = await request.json();
    const { uuid } = body;

    if (!uuid) {
      return NextResponse.json(
        { status: false, message: "Missing file UUID" },
        { status: 400 }
      );
    }

    console.log("[Filen Delete] Trashing file:", uuid);

    // 5. Call Filen's trash endpoint directly
    const response = await fetch(`${FILEN_API_URL}/v3/file/trash`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.apiKey}`,
        "User-Agent": "Pawkit/1.0",
        "Accept": "application/json",
      },
      body: JSON.stringify({ uuid }),
      signal: AbortSignal.timeout(30000),
    });

    // Log response
    console.log("[Filen Delete] Filen response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Filen Delete] Filen API error:", response.status, errorText);

      // 404 might mean file already deleted - treat as success
      if (response.status === 404) {
        console.log("[Filen Delete] File not found (may already be deleted)");
        return NextResponse.json({ status: true, message: "File not found (may already be deleted)" });
      }

      return NextResponse.json(
        { status: false, message: `Filen API error: ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log("[Filen Delete] Filen response:", result);

    // Check if Filen returned an error in the response body
    if (result.status === false) {
      // "file_not_found" or similar errors - treat as success (already deleted)
      if (result.message?.toLowerCase().includes("not found") ||
          result.code === "file_not_found") {
        console.log("[Filen Delete] File not found in Filen (may already be deleted)");
        return NextResponse.json({ status: true, message: "File already deleted" });
      }

      console.error("[Filen Delete] Filen returned error:", result);
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({ status: true, message: "File trashed successfully" });
  } catch (error) {
    console.error("[Filen Delete] Unexpected error:", error);
    return NextResponse.json(
      { status: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
