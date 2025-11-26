import { NextRequest, NextResponse } from "next/server";
import { getEvent, updateEvent, deleteEvent } from "@/lib/server/events";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { unauthorized, notFound, conflict, success } from "@/lib/utils/api-responses";

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/events/[id]
 * Fetch a single event by ID
 */
export async function GET(_request: NextRequest, segmentData: RouteParams) {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const params = await segmentData.params;
    const event = await getEvent(params.id, user.id);
    if (!event) {
      return notFound('Event');
    }
    return success(event);
  } catch (error) {
    return handleApiError(error, { route: '/api/events/[id]', userId: user?.id });
  }
}

/**
 * PATCH /api/events/[id]
 * Update an existing event
 */
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
    const body = await request.json();

    // Conflict detection: Check if client has stale version
    const ifUnmodifiedSince = request.headers.get('If-Unmodified-Since');
    if (ifUnmodifiedSince) {
      const currentEvent = await getEvent(params.id, user.id);
      if (currentEvent) {
        const clientTimestamp = new Date(ifUnmodifiedSince).getTime();
        const serverTimestamp = new Date(currentEvent.updatedAt).getTime();

        // If server version is newer, reject the update (conflict detected)
        if (serverTimestamp > clientTimestamp) {
          return conflict(
            'Event was modified by another device. Please refresh and try again.',
            { serverEvent: currentEvent }
          );
        }
      }
    }

    const event = await updateEvent(params.id, user.id, body);
    return success(event);
  } catch (error) {
    return handleApiError(error, { route: '/api/events/[id]', userId: user?.id });
  }
}

/**
 * DELETE /api/events/[id]
 * Soft delete an event (moves to trash)
 */
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

    // Soft delete - marks as deleted
    const result = await deleteEvent(params.id, user.id);

    return success({ ok: true, eventId: params.id, deleted: result.deleted });
  } catch (error) {
    return handleApiError(error, { route: '/api/events/[id]', userId: user?.id });
  }
}
