import { NextRequest, NextResponse } from "next/server";
import { deleteCard, getCard, updateCard, softDeleteCard } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: NextRequest, segmentData: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await segmentData.params;
    const card = await getCard(user.id, params.id);
    if (!card) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    return NextResponse.json(card);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, segmentData: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check serverSync setting for write operations
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { serverSync: true },
      });

      if (dbUser && !dbUser.serverSync) {
        return NextResponse.json(
          {
            error: 'Local-Only Mode Active',
            message: 'Server sync is disabled. This operation cannot be performed in local-only mode. Please enable server sync in settings to sync your data to the cloud.',
            localOnly: true,
          },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error('[API] Failed to check serverSync setting:', error);
      // On error, allow the operation to proceed (fail open for availability)
    }

    const params = await segmentData.params;

    // Conflict detection: Check if client has stale version
    // Skip conflict detection for metadata updates (server-side operations)
    const body = await request.json();
    const isMetadataUpdate = body.metadata || body.title || body.description || body.image;
    
    const ifUnmodifiedSince = request.headers.get('If-Unmodified-Since');
    if (ifUnmodifiedSince && !isMetadataUpdate) {
      const currentCard = await getCard(user.id, params.id);
      if (currentCard) {
        const clientTimestamp = new Date(ifUnmodifiedSince).getTime();
        const serverTimestamp = new Date(currentCard.updatedAt).getTime();

        // If server version is newer, reject the update (conflict detected)
        if (serverTimestamp > clientTimestamp) {
          return NextResponse.json(
            {
              error: "Conflict",
              message: "Card was modified by another device. Please refresh and try again.",
              serverCard: currentCard
            },
            { status: 409 } // 409 Conflict
          );
        }
      }
    }

    const card = await updateCard(user.id, params.id, body);
    return NextResponse.json(card);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, segmentData: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await segmentData.params;
    // Soft delete - move to trash
    await softDeleteCard(user.id, params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
