import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/utils/crypto";

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

interface FolderContent {
  uploads: Array<{ uuid: string; name: string }>;
  folders: Array<{ uuid: string; name: string }>;
}

/**
 * POST /api/filen/folder - Get or create a folder by path
 *
 * Body: { path: "/Pawkit/_Library" }
 * Returns: { uuid: "folder-uuid" }
 */
export async function POST(request: Request) {
  try {
    // 1. Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2. Get Filen session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(FILEN_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Filen not connected" }, { status: 401 });
    }

    let session: FilenSession;
    try {
      session = JSON.parse(decrypt(sessionCookie.value)) as FilenSession;
    } catch {
      return NextResponse.json({ error: "Invalid Filen session" }, { status: 401 });
    }

    // 3. Get requested path
    const { path } = await request.json();
    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "Path required" }, { status: 400 });
    }

    // 4. Split path into segments (e.g., "/Pawkit/_Library" -> ["Pawkit", "_Library"])
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) {
      return NextResponse.json({ uuid: session.baseFolderUUID });
    }

    // 5. Navigate/create folders
    let currentUUID = session.baseFolderUUID;

    for (const folderName of segments) {
      // List current folder contents
      const listResponse = await fetch(`${FILEN_API_URL}/v3/dir/content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.apiKey}`,
        },
        body: JSON.stringify({ uuid: currentUUID }),
      });

      if (!listResponse.ok) {
        console.error("[Filen Folder] Failed to list folder:", listResponse.status);
        return NextResponse.json({ error: "Failed to list folder" }, { status: 500 });
      }

      const listResult = await listResponse.json();
      if (!listResult.status) {
        console.error("[Filen Folder] API error:", listResult.message);
        return NextResponse.json({ error: listResult.message }, { status: 500 });
      }

      const content: FolderContent = listResult.data;

      // Look for existing folder
      const existingFolder = content.folders.find(
        (f) => f.name.toLowerCase() === folderName.toLowerCase()
      );

      if (existingFolder) {
        currentUUID = existingFolder.uuid;
      } else {
        // Create the folder
        const newUUID = crypto.randomUUID();

        // Encrypt folder name
        const nameEncrypted = await encryptMetadata(folderName, session.masterKeys[0]);

        const createResponse = await fetch(`${FILEN_API_URL}/v3/dir/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.apiKey}`,
          },
          body: JSON.stringify({
            uuid: newUUID,
            name: nameEncrypted,
            nameHashed: await hashFolderName(folderName),
            parent: currentUUID,
          }),
        });

        if (!createResponse.ok) {
          console.error("[Filen Folder] Failed to create folder:", createResponse.status);
          return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
        }

        const createResult = await createResponse.json();
        if (!createResult.status) {
          console.error("[Filen Folder] Create error:", createResult.message);
          return NextResponse.json({ error: createResult.message }, { status: 500 });
        }

        currentUUID = newUUID;
        console.log(`[Filen Folder] Created folder: ${folderName} (${newUUID})`);
      }
    }

    return NextResponse.json({ uuid: currentUUID });
  } catch (error) {
    console.error("[Filen Folder] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * Encrypt metadata (version 2 format)
 */
async function encryptMetadata(text: string, masterKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  // Generate 12-character alphanumeric IV
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let ivString = "";
  const randomValues = new Uint8Array(12);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 12; i++) {
    ivString += chars[randomValues[i] % chars.length];
  }
  const ivBytes = encoder.encode(ivString);

  // Derive key using PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(masterKey),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(masterKey),
      iterations: 1,
      hash: "SHA-512",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    data
  );

  const encryptedBase64 = Buffer.from(encrypted).toString("base64");
  return "002" + ivString + encryptedBase64;
}

/**
 * Hash folder name (SHA1 of SHA512 of lowercase name)
 */
async function hashFolderName(name: string): Promise<string> {
  const encoder = new TextEncoder();
  const lowerName = name.toLowerCase();

  // SHA512 first
  const sha512 = await crypto.subtle.digest("SHA-512", encoder.encode(lowerName));
  const sha512Hex = Buffer.from(sha512).toString("hex");

  // Then SHA1
  const sha1 = await crypto.subtle.digest("SHA-1", encoder.encode(sha512Hex));
  return Buffer.from(sha1).toString("hex");
}
