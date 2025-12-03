import { NextRequest, NextResponse } from "next/server";
import FilenSDK from "@filen/sdk";
import { fileTypeFromBuffer } from "file-type";
import { getFilenClient } from "@/lib/services/filen-server";

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed MIME type patterns
const ALLOWED_MIME_PATTERNS = [
  /^image\//,
  /^audio\//,
  /^video\//,
  /^text\/plain$/,
  /^text\/markdown$/,
  /^application\/pdf$/,
  /^application\/msword$/,
  /^application\/vnd\.openxmlformats-/,
  /^application\/vnd\.ms-/,
];

// Safe text extensions (file-type returns undefined for these)
const SAFE_TEXT_EXTENSIONS = ['.txt', '.md', '.csv'];

/**
 * Validate file type using magic bytes
 */
async function validateFileType(buffer: Buffer, filename: string): Promise<{ valid: boolean; detectedType?: string }> {
  const detected = await fileTypeFromBuffer(buffer);

  // If file-type can detect it, check against allowed patterns
  if (detected) {
    const isAllowed = ALLOWED_MIME_PATTERNS.some(pattern => pattern.test(detected.mime));
    return { valid: isAllowed, detectedType: detected.mime };
  }

  // For files where file-type returns undefined (text files), allow if extension is safe
  const dotIndex = filename.lastIndexOf('.');
  const ext = dotIndex !== -1 ? filename.toLowerCase().slice(dotIndex) : '';
  if (ext && SAFE_TEXT_EXTENSIONS.includes(ext)) {
    return { valid: true, detectedType: 'text/plain' };
  }

  // Unknown file type - reject for safety
  return { valid: false, detectedType: 'unknown' };
}

/**
 * Sanitize filename to prevent path traversal and dangerous characters
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\.\.+/g, '_')           // Remove path traversal
    .replace(/[/\\:*?"<>|]/g, '_')    // Remove dangerous characters
    .slice(0, 255);                    // Limit length
}

export interface FilenFileInfo {
  uuid: string;
  name: string;
  path: string;
  size: number;
  mime: string;
  modified: number;
  pawkit: string | null;
  isAttachment: boolean;
}

/**
 * Ensure a folder path exists in Filen, creating intermediate folders as needed.
 */
async function ensureFolderExists(filen: FilenSDK, path: string): Promise<void> {
  const fs = filen.fs();
  const parts = path.split("/").filter(Boolean);
  let currentPath = "";

  for (const part of parts) {
    currentPath += "/" + part;
    try {
      await fs.stat({ path: currentPath });
    } catch {
      // Folder doesn't exist, create it
      await fs.mkdir({ path: currentPath });
    }
  }
}

/**
 * List files recursively in a Filen directory.
 */
async function listFilesRecursive(
  filen: FilenSDK,
  basePath: string,
  currentPath: string = basePath
): Promise<FilenFileInfo[]> {
  const fs = filen.fs();
  const results: FilenFileInfo[] = [];

  try {
    const entries = await fs.readdir({ path: currentPath });

    for (const entry of entries) {
      const entryPath = `${currentPath}/${entry}`;

      try {
        const stat = await fs.stat({ path: entryPath });

        if (stat.type === "directory") {
          // Recurse into subdirectory
          const subFiles = await listFilesRecursive(filen, basePath, entryPath);
          results.push(...subFiles);
        } else if (stat.type === "file") {
          // Parse which pawkit this belongs to
          const relativePath = currentPath.replace("/Pawkit/", "").replace("/Pawkit", "");
          let pawkit: string | null = null;
          let isAttachment = false;

          if (relativePath.startsWith("_Attachments")) {
            isAttachment = true;
          } else if (relativePath.startsWith("_Library") || relativePath === "") {
            pawkit = null;
          } else if (relativePath) {
            // First part of the path is the pawkit name
            pawkit = relativePath.split("/")[0];
          }

          results.push({
            uuid: stat.uuid,
            name: stat.name,
            path: entryPath,
            size: stat.size,
            mime: stat.mime || "application/octet-stream",
            modified: stat.mtimeMs,
            pawkit,
            isAttachment,
          });
        }
      } catch (error) {
        console.error(`[Filen] Error stat'ing ${entryPath}:`, error);
      }
    }
  } catch (error) {
    console.error(`[Filen] Error reading directory ${currentPath}:`, error);
  }

  return results;
}

/**
 * POST /api/filen/files - Upload a file to Filen
 */
export async function POST(request: NextRequest) {
  try {
    const filen = await getFilenClient();
    if (!filen) {
      return NextResponse.json(
        { error: "Not authenticated with Filen" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const pawkitName = formData.get("pawkit") as string | null;
    const isAttachment = formData.get("isAttachment") === "true";
    const fileId = formData.get("fileId") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Server-side size limit
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413 }
      );
    }

    // Get buffer for validation
    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic byte validation
    const typeValidation = await validateFileType(buffer, file.name);
    if (!typeValidation.valid) {
      console.warn(`[Filen] Rejected file upload: ${file.name} (detected: ${typeValidation.detectedType})`);
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      );
    }

    // Sanitize filename
    const safeFilename = sanitizeFilename(file.name);

    // Determine target folder based on file type
    let targetFolder = "/Pawkit/_Library";
    if (isAttachment) {
      targetFolder = "/Pawkit/_Attachments";
    } else if (pawkitName) {
      // Sanitize pawkit name for folder path
      const safePawkitName = pawkitName.replace(/[/\\:*?"<>|]/g, "_");
      targetFolder = `/Pawkit/${safePawkitName}`;
    }

    // Ensure folder exists
    await ensureFolderExists(filen, targetFolder);

    // Upload file with sanitized name
    const fs = filen.fs();
    const filePath = `${targetFolder}/${safeFilename}`;

    await fs.writeFile({
      path: filePath,
      content: buffer,
    });

    // Get file info after upload
    const stat = await fs.stat({ path: filePath });

    if (stat.type !== "file") {
      throw new Error("Expected file but got directory");
    }

    return NextResponse.json({
      success: true,
      filenUuid: stat.uuid,
      path: filePath,
      fileId,
    });
  } catch (error) {
    console.error("[Filen] Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/filen/files - List all files in the Pawkit folder
 */
export async function GET() {
  try {
    const filen = await getFilenClient();
    if (!filen) {
      return NextResponse.json(
        { error: "Not authenticated with Filen" },
        { status: 401 }
      );
    }

    const files = await listFilesRecursive(filen, "/Pawkit");

    return NextResponse.json({ files });
  } catch (error) {
    console.error("[Filen] List error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "List failed" },
      { status: 500 }
    );
  }
}
