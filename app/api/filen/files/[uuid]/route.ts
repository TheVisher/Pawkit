import { NextRequest, NextResponse } from "next/server";
import { getFilenClient } from "@/lib/services/filen-server";
import { logger } from "@/lib/utils/logger";

type RouteParams = {
  params: Promise<{ uuid: string }>;
};

/**
 * GET /api/filen/files/[uuid] - Download a file from Filen
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { uuid } = await params;

    const filen = await getFilenClient();
    if (!filen) {
      return NextResponse.json(
        { error: "Not authenticated with Filen" },
        { status: 401 }
      );
    }

    const cloud = filen.cloud();

    // Get file info first
    const fileInfo = await cloud.fileUUIDToPath({ uuid });
    if (!fileInfo) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Download file content
    const fs = filen.fs();
    const content = await fs.readFile({ path: fileInfo });

    // Get file stats for mime type
    const stat = await fs.stat({ path: fileInfo });
    const mimeType = stat.type === "file" ? (stat.mime || "application/octet-stream") : "application/octet-stream";
    const filename = stat.name;

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Content = new Uint8Array(content);

    return new NextResponse(uint8Content, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": uint8Content.length.toString(),
      },
    });
  } catch (error) {
    logger.error("[Filen] Download error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/filen/files/[uuid] - Delete a file from Filen
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { uuid } = await params;

    const filen = await getFilenClient();
    if (!filen) {
      return NextResponse.json(
        { error: "Not authenticated with Filen" },
        { status: 401 }
      );
    }

    const cloud = filen.cloud();

    // Get file path first
    const filePath = await cloud.fileUUIDToPath({ uuid });
    if (!filePath) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Delete file
    const fs = filen.fs();
    await fs.rm({ path: filePath });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[Filen] Delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
