import { NextRequest, NextResponse } from "next/server";
import { fetchAndUpdateCardMetadata, getCard } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[API] Fetch metadata request received');
    const user = await getCurrentUser();
    if (!user) {
      console.log('[API] Unauthorized request');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    console.log('[API] Card ID:', id);

    // Verify card belongs to user
    const existingCard = await getCard(user.id, id);
    if (!existingCard) {
      console.log('[API] Card not found for user');
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { url, previewServiceUrl } = body;
    console.log('[API] Fetching metadata for URL:', url);

    if (!url) {
      console.log('[API] No URL provided');
      return NextResponse.json({ message: "URL is required" }, { status: 400 });
    }

    console.log('[API] Calling fetchAndUpdateCardMetadata...');
    const card = await fetchAndUpdateCardMetadata(id, url, previewServiceUrl);
    console.log('[API] Metadata fetch completed, returning card');
    return NextResponse.json(card);
  } catch (error) {
    console.error('[API] Fetch metadata error:', error);
    return handleApiError(error);
  }
}
