import { NextRequest, NextResponse } from "next/server";
import {
  getEvents,
  getEventsByDateRange,
  createEvent,
  bulkUpsertEvents,
} from "@/lib/server/events";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";
import { rateLimit, getRateLimitHeaders } from "@/lib/utils/rate-limit";
import { unauthorized, rateLimited, success, created } from "@/lib/utils/api-responses";

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs';

/**
 * GET /api/events
 * Fetch all events for the authenticated user
 *
 * Query params:
 * - includeDeleted: boolean - Include soft-deleted events
 * - startDate: string (YYYY-MM-DD) - Filter by date range start
 * - endDate: string (YYYY-MM-DD) - Filter by date range end
 */
export async function GET(request: NextRequest) {
  let user;

  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let events;
    if (startDate && endDate) {
      // Fetch by date range (more efficient for calendar views)
      events = await getEventsByDateRange(user.id, startDate, endDate, { includeDeleted });
    } else {
      // Fetch all events
      events = await getEvents(user.id, { includeDeleted });
    }

    return success({ items: events });
  } catch (error) {
    return handleApiError(error, { route: '/api/events', userId: user?.id });
  }
}

/**
 * POST /api/events
 * Create a new event or bulk upsert events
 *
 * Body can be:
 * - Single event object: { title, date, ... }
 * - Bulk operation: { bulk: true, events: [...] }
 */
export async function POST(request: NextRequest) {
  let user;

  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    // Rate limiting: 120 event operations per minute per user
    const rateLimitResult = rateLimit({
      identifier: `event-create:${user.id}`,
      limit: 120,
      windowMs: 60000, // 1 minute
    });

    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.allowed) {
      return rateLimited('Too many event operations. Please try again later.');
    }

    const body = await request.json();

    // Handle bulk upsert for sync operations
    if (body.bulk && Array.isArray(body.events)) {
      const events = await bulkUpsertEvents(user.id, body.events);
      return NextResponse.json(
        { items: events, synced: events.length },
        { status: 200, headers: rateLimitHeaders }
      );
    }

    // Single event creation
    const event = await createEvent(user.id, body);
    return created(event);
  } catch (error) {
    return handleApiError(error, { route: '/api/events', userId: user?.id });
  }
}
