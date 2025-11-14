import { NextRequest, NextResponse } from "next/server";
import { deleteCard, getCard, updateCard, softDeleteCard } from "@/lib/server/cards";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { unauthorized, notFound, conflict, success, ErrorCodes } from "@/lib/utils/api-responses";
import { ensureToCategorizePawkit, getToCategorizeSlug } from "@/lib/utils/system-pawkits";

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: NextRequest, segmentData: RouteParams) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const params = await segmentData.params;
    const card = await getCard(user.id, params.id);
    if (!card) {
      return notFound('Card');
    }
    return success(card);
  } catch (error) {
    return handleApiError(error, { route: '/api/cards/[id]', userId: user?.id });
  }
}

export async function PATCH(request: NextRequest, segmentData: RouteParams) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
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
            code: 'LOCAL_ONLY_MODE',
            localOnly: true,
          },
          { status: 403 }
        );
      }
    } catch (error) {
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
          return conflict(
            'Card was modified by another device. Please refresh and try again.',
            { serverCard: currentCard }
          );
        }
      }
    }

    // Ensure "To Categorize" system Pawkit exists if card is being added to it
    if (body.collections && Array.isArray(body.collections)) {
      const toCategorizeSlug = getToCategorizeSlug();
      if (body.collections.includes(toCategorizeSlug)) {
        await ensureToCategorizePawkit(user.id);
      }
    }

    const card = await updateCard(user.id, params.id, body);
    return success(card);
  } catch (error) {
    return handleApiError(error, { route: '/api/cards/[id]', userId: user?.id });
  }
}

export async function DELETE(_request: NextRequest, segmentData: RouteParams) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
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
            code: 'LOCAL_ONLY_MODE',
            localOnly: true,
          },
          { status: 403 }
        );
      }
    } catch (error) {
      // On error, allow the operation to proceed (fail open for availability)
    }

    const params = await segmentData.params;

    // Soft delete - move to trash
    const result = await softDeleteCard(user.id, params.id);

    return success({ ok: true, cardId: params.id, deleted: result.deleted });
  } catch (error) {
    return handleApiError(error, { route: '/api/cards/[id]', userId: user?.id });
  }
}
