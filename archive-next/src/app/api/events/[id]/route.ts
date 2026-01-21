/**
 * CalendarEvent API Routes - Single Event Operations
 *
 * GET    /api/events/[id] - Get a single event
 * PATCH  /api/events/[id] - Update an event
 * DELETE /api/events/[id] - Soft delete an event
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma';
import { updateEventSchema } from '@/lib/validations/event';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Helper to verify event ownership
 * Returns the event if found and owned, null otherwise
 */
async function getOwnedEvent(eventId: string, userId: string) {
  const event = await prisma.calendarEvent.findFirst({
    where: {
      id: eventId,
      workspace: {
        userId: userId,
      },
    },
    include: {
      workspace: {
        select: { userId: true },
      },
    },
  });

  return event;
}

/**
 * GET /api/events/[id]
 *
 * Fetch a single event by ID.
 * Returns 404 if not found or not owned by user.
 */
export async function GET(request: Request, context: RouteContext) {
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

    // 2. Get event ID from params
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // 3. Find event and verify ownership
    const event = await getOwnedEvent(id, user.id);

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // 4. Remove internal fields and return
    const { workspace, ...eventData } = event;
    return NextResponse.json({ event: eventData });
  } catch (error) {
    console.error('GET /api/events/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/events/[id]
 *
 * Update an existing event.
 * Returns 404 if not found or not owned by user.
 */
export async function PATCH(request: Request, context: RouteContext) {
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

    // 2. Get event ID from params
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // 3. Verify ownership BEFORE parsing body
    const existingEvent = await getOwnedEvent(id, user.id);

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // 4. Parse and validate request body
    const body = await request.json();
    const validationResult = updateEventSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const updates = validationResult.data;

    // 5. Verify recurrence parent exists if being updated
    if (updates.recurrenceParentId !== undefined && updates.recurrenceParentId !== null) {
      // Prevent self-reference
      if (updates.recurrenceParentId === id) {
        return NextResponse.json(
          { error: 'Event cannot be its own recurrence parent' },
          { status: 400 }
        );
      }

      const parentExists = await prisma.calendarEvent.findFirst({
        where: {
          id: updates.recurrenceParentId,
          workspaceId: existingEvent.workspaceId,
        },
      });

      if (!parentExists) {
        return NextResponse.json(
          { error: 'Recurrence parent event not found' },
          { status: 400 }
        );
      }
    }

    // 6. Build update data
    const updateData: Record<string, unknown> = {};

    // Event details
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.date !== undefined) updateData.date = updates.date;
    if ('endDate' in updates) updateData.endDate = updates.endDate;
    if ('startTime' in updates) updateData.startTime = updates.startTime;
    if ('endTime' in updates) updateData.endTime = updates.endTime;
    if (updates.isAllDay !== undefined) updateData.isAllDay = updates.isAllDay;

    // Additional info
    if ('description' in updates) updateData.description = updates.description;
    if ('location' in updates) updateData.location = updates.location;
    if ('url' in updates) updateData.url = updates.url;
    if ('color' in updates) updateData.color = updates.color;

    // Recurrence
    if ('recurrence' in updates) updateData.recurrence = updates.recurrence as Prisma.InputJsonValue ?? undefined;
    if ('recurrenceParentId' in updates) updateData.recurrenceParentId = updates.recurrenceParentId;
    if (updates.excludedDates !== undefined) updateData.excludedDates = updates.excludedDates;
    if (updates.isException !== undefined) updateData.isException = updates.isException;

    // Source tracking
    if ('source' in updates) updateData.source = updates.source as Prisma.InputJsonValue ?? undefined;

    // Soft delete
    if (updates.deleted !== undefined) {
      updateData.deleted = updates.deleted;
      if (updates.deleted) {
        updateData.deletedAt = new Date();
      }
    }
    if ('deletedAt' in updates) {
      updateData.deletedAt = updates.deletedAt
        ? new Date(updates.deletedAt)
        : null;
    }

    // 7. Update the event
    const event = await prisma.calendarEvent.update({
      where: { id },
      data: updateData,
    });

    // 8. Return updated event
    return NextResponse.json({ event });
  } catch (error) {
    console.error('PATCH /api/events/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id]
 *
 * Soft delete an event (set deleted: true, deletedAt: now).
 * Returns 404 if not found or not owned by user.
 */
export async function DELETE(request: Request, context: RouteContext) {
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

    // 2. Get event ID from params
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // 3. Verify ownership BEFORE deleting
    const existingEvent = await getOwnedEvent(id, user.id);

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // 4. Soft delete the event
    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    });

    // 5. Return success
    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        deleted: event.deleted,
        deletedAt: event.deletedAt,
      },
    });
  } catch (error) {
    console.error('DELETE /api/events/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
