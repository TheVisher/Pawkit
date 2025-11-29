import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/utils/crypto";

const FILEN_API_URL = "https://api.filen.io";
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
 * POST /api/filen/upload-done - Proxy for Filen's /v3/upload/done endpoint
 *
 * Required because api.filen.io doesn't support CORS from third-party origins,
 * while ingest.filen.io (used for chunk uploads) does.
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
      console.error("[Filen Upload Done] Failed to decrypt session:", decryptError);
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

    // 4. Get the request body
    const body = await request.json();

    console.log("[Filen Upload Done] Forwarding request to Filen API");

    // 5. Forward to Filen API
    const response = await fetch(`${FILEN_API_URL}/v3/upload/done`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    console.log("[Filen Upload Done] Filen response:", result);

    // 6. Return Filen's response
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Filen Upload Done] Error:", error);
    return NextResponse.json(
      { status: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
