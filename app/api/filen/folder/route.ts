import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/utils/crypto";
import { logger } from "@/lib/utils/logger";

const FILEN_API_URL = "https://gateway.filen.io";
const FILEN_COOKIE_NAME = "filen_session";

export interface FilenFolderItem {
  uuid: string;
  name: string;
  path: string;
  size: number;
  mime: string;
  modified: number;
  isFolder: boolean;
}

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
    logger.debug(`[Filen Folder] Path: "${path}", segments:`, segments);
    logger.debug(`[Filen Folder] Base folder UUID: ${session.baseFolderUUID}`);

    if (segments.length === 0) {
      return NextResponse.json({ uuid: session.baseFolderUUID });
    }

    // 5. Navigate/create folders
    let currentUUID = session.baseFolderUUID;

    for (const folderName of segments) {
      // List current folder contents
      logger.debug(`[Filen Folder] Listing folder UUID: ${currentUUID}`);
      const requestBody = { uuid: currentUUID };
      logger.debug(`[Filen Folder] Request body:`, JSON.stringify(requestBody));

      const listResponse = await fetch(`${FILEN_API_URL}/v3/dir/content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      logger.debug(`[Filen Folder] Response status: ${listResponse.status}`);

      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        logger.error("[Filen Folder] Failed to list folder:", listResponse.status, errorText);
        return NextResponse.json({ error: "Failed to list folder" }, { status: 500 });
      }

      const listResult = await listResponse.json();
      logger.debug("[Filen Folder] List response:", JSON.stringify(listResult).substring(0, 1000));

      if (!listResult.status) {
        logger.error("[Filen Folder] API error:", listResult.message);
        return NextResponse.json({ error: listResult.message }, { status: 500 });
      }

      const content: FolderContent = listResult.data;
      logger.debug(`[Filen Folder] Listing ${currentUUID}, found ${content?.folders?.length || 0} folders`);

      if (!content) {
        logger.error("[Filen Folder] No data in response");
        return NextResponse.json({ error: "No folder data returned" }, { status: 500 });
      }

      // Look for existing folder by nameHashed (more reliable than decrypting)
      const targetHash = await hashFolderName(folderName);
      const folders = content.folders || [];
      logger.debug(`[Filen Folder] Looking for "${folderName}" (hash: ${targetHash.substring(0, 12)}...) among ${folders.length} folders`);

      // Filen returns folders with a 'name' field that's encrypted, but may also have 'nameHashed'
      // If nameHashed isn't available, we need to check by trying to create and handling conflicts
      interface FolderWithHash { uuid: string; name: string; nameHashed?: string }
      const foldersWithHash = folders as FolderWithHash[];

      const existingFolder = foldersWithHash.find(f => f.nameHashed === targetHash);

      if (existingFolder) {
        logger.debug(`[Filen Folder] Found existing folder by hash: ${existingFolder.uuid}`);
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
          logger.error("[Filen Folder] Failed to create folder:", createResponse.status);
          return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
        }

        const createResult = await createResponse.json();
        if (!createResult.status) {
          logger.error("[Filen Folder] Create error:", createResult.message);
          return NextResponse.json({ error: createResult.message }, { status: 500 });
        }

        currentUUID = newUUID;
        logger.debug(`[Filen Folder] Created folder: ${folderName} (${newUUID})`);
      }
    }

    logger.debug(`[Filen Folder] Success! Final UUID: ${currentUUID}`);
    return NextResponse.json({ uuid: currentUUID });
  } catch (error) {
    logger.error("[Filen Folder] Caught error:", error);
    logger.error("[Filen Folder] Error stack:", error instanceof Error ? error.stack : "no stack");
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

/**
 * Decrypt metadata - handles multiple Filen encryption versions
 */
async function decryptMetadata(encrypted: string, masterKeys: string[]): Promise<string | null> {
  const version = encrypted.substring(0, 3);
  logger.debug(`[Filen Decrypt] Version: ${version}, encrypted length: ${encrypted.length}`);

  // Try each master key
  for (let keyIndex = 0; keyIndex < masterKeys.length; keyIndex++) {
    const masterKey = masterKeys[keyIndex];
    try {
      const encoder = new TextEncoder();

      if (version === "002") {
        // Version 2 format: "002" + 12-char IV string + base64 ciphertext
        const ivString = encrypted.substring(3, 15);
        const ciphertextBase64 = encrypted.substring(15);
        const ivBytes = encoder.encode(ivString);
        const ciphertext = Buffer.from(ciphertextBase64, "base64");

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
          ["decrypt"]
        );

        const decrypted = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: ivBytes },
          key,
          ciphertext
        );

        return new TextDecoder().decode(decrypted);
      } else if (version === "001") {
        // Version 1 format: "001" + base64(IV + ciphertext)
        // IV is 12 bytes, rest is ciphertext with auth tag
        const combined = Buffer.from(encrypted.substring(3), "base64");
        const ivBytes = combined.slice(0, 12);
        const ciphertext = combined.slice(12);

        // Import raw key (master key is used directly, not derived)
        // Filen v1 uses first 32 chars of master key as raw key
        const rawKey = encoder.encode(masterKey.substring(0, 32));

        const key = await crypto.subtle.importKey(
          "raw",
          rawKey,
          { name: "AES-GCM", length: 256 },
          false,
          ["decrypt"]
        );

        const decrypted = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: ivBytes },
          key,
          ciphertext
        );

        return new TextDecoder().decode(decrypted);
      } else if (version === "003") {
        // Version 3: Similar to v2 but uses different key derivation
        // "003" + 12-char IV + base64 ciphertext
        const ivString = encrypted.substring(3, 15);
        const ciphertextBase64 = encrypted.substring(15);
        const ivBytes = encoder.encode(ivString);
        const ciphertext = Buffer.from(ciphertextBase64, "base64");

        // v3 uses PBKDF2 with 200000 iterations
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
            iterations: 200000,
            hash: "SHA-512",
          },
          keyMaterial,
          { name: "AES-GCM", length: 256 },
          false,
          ["decrypt"]
        );

        const decrypted = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: ivBytes },
          key,
          ciphertext
        );

        return new TextDecoder().decode(decrypted);
      } else {
        logger.debug(`[Filen Decrypt] Unknown version: ${version}`);
      }
    } catch (err) {
      // Try next key
      logger.debug(`[Filen Decrypt] Key ${keyIndex} failed for version ${version}:`, err instanceof Error ? err.message : err);
      continue;
    }
  }
  logger.debug(`[Filen Decrypt] All keys failed`);
  return null;
}

/**
 * GET /api/filen/folder?path=/Pawkit/_Notes
 *
 * List contents of a folder (files AND subfolders, non-recursive).
 * Uses the Filen SDK which handles decryption internally.
 */
export async function GET(request: NextRequest) {
  // Import here to avoid circular dependency issues
  const { getFilenClient } = await import("@/lib/services/filen-server");

  try {
    // 1. Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2. Get Filen SDK client (handles session and decryption)
    const filen = await getFilenClient();
    if (!filen) {
      return NextResponse.json({ error: "Filen not connected" }, { status: 401 });
    }

    // 3. Get requested path
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get("path") || "/Pawkit";

    logger.debug(`[Filen Folder GET] Listing path: ${path}`);

    // 4. Use SDK's fs.readdir to list folder contents
    const fs = filen.fs();
    const items: FilenFolderItem[] = [];

    try {
      const entries = await fs.readdir({ path });
      logger.debug(`[Filen Folder GET] Found ${entries.length} entries in ${path}`);

      for (const entry of entries) {
        const entryPath = `${path}/${entry}`;

        try {
          const stat = await fs.stat({ path: entryPath });

          if (stat.type === "directory") {
            items.push({
              uuid: stat.uuid,
              name: stat.name,
              path: entryPath,
              size: 0,
              mime: "folder",
              modified: stat.mtimeMs || Date.now(),
              isFolder: true,
            });
          } else if (stat.type === "file") {
            items.push({
              uuid: stat.uuid,
              name: stat.name,
              path: entryPath,
              size: stat.size || 0,
              mime: stat.mime || "application/octet-stream",
              modified: stat.mtimeMs || Date.now(),
              isFolder: false,
            });
          }
        } catch (statErr) {
          logger.error(`[Filen Folder GET] Error stat'ing ${entryPath}:`, statErr);
        }
      }
    } catch (readdirErr) {
      // Folder doesn't exist or other error
      logger.debug(`[Filen Folder GET] Folder not found or error: ${path}`, readdirErr);
      return NextResponse.json({ items: [], path, error: `Folder not found: ${path}` });
    }

    logger.debug(`[Filen Folder GET] Returning ${items.length} items`);
    return NextResponse.json({ items, path });
  } catch (error) {
    logger.error("[Filen Folder GET] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list folder" },
      { status: 500 }
    );
  }
}
