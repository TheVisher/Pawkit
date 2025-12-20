/**
 * CalendarEvent API Routes
 *
 * GET  /api/events - List events for a workspace (with optional filters)
 * POST /api/events - Create a new event
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma';
import {
  createEventSchema,
  listEventsQuerySchema,
} from '@/lib/validations/event';

/**
 * GET /api/events
 *
 * List events for a workspace with optional filtering.
 *
 * Query params:
 * - workspaceId (required): Filter by workspace
 * - since (optional): Return events updated after this timestamp (ISO 8601)
 * - deleted (optional): Include soft-deleted events (default: false)
 * - startDate (optional): Filter events on or after this date (YYYY-MM-DD)
 * - endDate (optional): Filter events on or before this date (YYYY-MM-DD)
 * - limit (optional): Max results (default: 100, max: 500)
 * - offset (optional): Pagination offset (default: 0)
 */
export async function GET(request: Request) {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse and validate query params
    const { searchParams } = new URL(request.url);
    const queryResult = listEventsQuerySchema.safeParse({
      workspaceId: searchParams.get('workspaceId'),
      since: searchParams.get('since'),
      deleted: searchParams.get('deleted'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: queryResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { workspaceId, since, deleted, startDate, endDate, limit = 100, offset = 0 } = queryResult.data;

    // 3. Verify workspace belongs to user
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        userId: user.id,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // 4. Build query
    const events = await prisma.calendarEvent.findMany({
      where: {
        workspaceId,
        // Only include deleted if explicitly requested
        ...(deleted !== true && { deleted: false }),
        // Filter by updatedAt for delta sync
        ...(since && {
          updatedAt: { gt: new Date(since) },
        }),
        // Date range filtering for calendar views
        ...(startDate && {
          date: { gte: startDate },
        }),
        ...(endDate && {
          date: { lte: endDate },
        }),
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
      take: limit,
      skip: offset,
    });

    // 5. Return events
    return NextResponse.json({
      events,
      meta: {
        count: events.length,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('GET /api/events error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events
 *
 * Create a new calendar event in a workspace.
 * Client can provide their own ID for offline-first sync.
 */
export async function POST(request: Request) {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const validationResult = createEventSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const eventData = validationResult.data;

    // 3. Verify workspace belongs to user
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: eventData.workspaceId,
        userId: user.id,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // 4. Check if event with this ID already exists (for sync idempotency)
    if (eventData.id) {
      const existing = await prisma.calendarEvent.findFirst({
        where: {
          id: eventData.id,
          workspaceId: eventData.workspaceId,
        },
      });

      if (existing) {
        // Return existing event (idempotent create)
        return NextResponse.json({ event: existing }, { status: 200 });
      }
    }

    // 5. Verify recurrence parent exists if specified
    if (eventData.recurrenceParentId) {
      const parentExists = await prisma.calendarEvent.findFirst({
        where: {
          id: eventData.recurrenceParentId,
          workspaceId: eventData.workspaceId,
        },
      });

      if (!parentExists) {
        return NextResponse.json(
          { error: 'Recurrence parent event not found' },
          { status: 400 }
        );
      }
    }

    // 6. Create the event
    const event = await prisma.calendarEvent.create({
      data: {
        // Use client ID if provided, otherwise Prisma generates one
        ...(eventData.id && { id: eventData.id }),
        workspaceId: eventData.workspaceId,
        title: eventData.title,
        date: eventData.date,
        endDate: eventData.endDate,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        isAllDay: eventData.isAllDay,
        description: eventData.description,
        location: eventData.location,
        url: eventData.url,
        color: eventData.color,
        recurrence: eventData.recurrence as Prisma.InputJsonValue | undefined,
        recurrenceParentId: eventData.recurrenceParentId,
        excludedDates: eventData.excludedDates,
        isException: eventData.isException,
        source: eventData.source as Prisma.InputJsonValue | undefined,
      },
    });

    // 7. Return created event
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('POST /api/events error:', error);

    // Handle unique constraint violations
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { error: 'Event with this ID already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
