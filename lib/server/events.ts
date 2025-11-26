import { prisma } from "@/lib/server/prisma";
import { CalendarEvent as PrismaCalendarEvent, Prisma } from "@prisma/client";
import { CalendarEvent, EventRecurrence, EventSource } from "@/lib/types/calendar";

/**
 * Server-side operations for CalendarEvent
 * Follows the same patterns as cards.ts for consistency
 */

// DTO type for API responses - converts Prisma types to CalendarEvent type
export type CalendarEventDTO = CalendarEvent;

/**
 * Map Prisma CalendarEvent to CalendarEventDTO for API responses
 */
function mapEvent(event: PrismaCalendarEvent): CalendarEventDTO {
  return {
    id: event.id,
    userId: event.userId,
    title: event.title,
    date: event.date,
    endDate: event.endDate,
    startTime: event.startTime,
    endTime: event.endTime,
    isAllDay: event.isAllDay,
    description: event.description,
    location: event.location,
    url: event.url,
    color: event.color,
    recurrence: event.recurrence as EventRecurrence | null,
    recurrenceParentId: event.recurrenceParentId,
    excludedDates: event.excludedDates,
    isException: event.isException,
    source: event.source as EventSource | null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    deleted: event.deleted,
    deletedAt: event.deletedAt?.toISOString() ?? null,
  };
}

/**
 * Input type for creating events
 */
export type CreateEventInput = {
  id?: string; // Allow client-provided ID for local-first sync
  title: string;
  date: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  isAllDay?: boolean;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  color?: string | null;
  recurrence?: EventRecurrence | null;
  recurrenceParentId?: string | null;
  excludedDates?: string[];
  isException?: boolean;
  source?: EventSource | null;
};

/**
 * Input type for updating events
 */
export type UpdateEventInput = Partial<CreateEventInput> & {
  deleted?: boolean;
  deletedAt?: string | null;
};

/**
 * Get all events for a user (non-deleted by default)
 */
export async function getEvents(
  userId: string,
  options?: { includeDeleted?: boolean }
): Promise<CalendarEventDTO[]> {
  const events = await prisma.calendarEvent.findMany({
    where: {
      userId,
      deleted: options?.includeDeleted ? undefined : false,
    },
    orderBy: { date: 'asc' },
  });

  return events.map(mapEvent);
}

/**
 * Get a single event by ID
 */
export async function getEvent(
  id: string,
  userId: string
): Promise<CalendarEventDTO | null> {
  const event = await prisma.calendarEvent.findFirst({
    where: { id, userId },
  });

  return event ? mapEvent(event) : null;
}

/**
 * Get events by date range (for efficient calendar view fetching)
 */
export async function getEventsByDateRange(
  userId: string,
  startDate: string,
  endDate: string,
  options?: { includeDeleted?: boolean }
): Promise<CalendarEventDTO[]> {
  // Find events where:
  // 1. Single-day events fall within range: date >= startDate AND date <= endDate
  // 2. Multi-day events overlap range: date <= endDate AND (endDate >= startDate OR endDate is null)
  // 3. Recurring events that might generate instances in range
  const events = await prisma.calendarEvent.findMany({
    where: {
      userId,
      deleted: options?.includeDeleted ? undefined : false,
      OR: [
        // Single-day events in range
        {
          date: { gte: startDate, lte: endDate },
          endDate: null,
        },
        // Multi-day events that overlap range
        {
          date: { lte: endDate },
          endDate: { gte: startDate },
        },
        // Recurring events that start before or during range
        // (we fetch all recurring events and let client filter instances)
        {
          date: { lte: endDate },
          recurrence: { not: Prisma.JsonNull },
        },
      ],
    },
    orderBy: { date: 'asc' },
  });

  return events.map(mapEvent);
}

/**
 * Create a new event
 */
export async function createEvent(
  userId: string,
  input: CreateEventInput
): Promise<CalendarEventDTO> {
  const event = await prisma.calendarEvent.create({
    data: {
      id: input.id, // Allow client-provided ID for local-first sync
      userId,
      title: input.title,
      date: input.date,
      endDate: input.endDate,
      startTime: input.startTime,
      endTime: input.endTime,
      isAllDay: input.isAllDay ?? true,
      description: input.description,
      location: input.location,
      url: input.url,
      color: input.color,
      recurrence: input.recurrence as unknown as Prisma.InputJsonValue,
      recurrenceParentId: input.recurrenceParentId,
      excludedDates: input.excludedDates ?? [],
      isException: input.isException ?? false,
      source: input.source as unknown as Prisma.InputJsonValue,
    },
  });

  return mapEvent(event);
}

/**
 * Update an existing event
 */
export async function updateEvent(
  id: string,
  userId: string,
  input: UpdateEventInput
): Promise<CalendarEventDTO> {
  const data: Prisma.CalendarEventUpdateInput = {};

  // Only include fields that are explicitly provided
  if (input.title !== undefined) data.title = input.title;
  if (input.date !== undefined) data.date = input.date;
  if (input.endDate !== undefined) data.endDate = input.endDate;
  if (input.startTime !== undefined) data.startTime = input.startTime;
  if (input.endTime !== undefined) data.endTime = input.endTime;
  if (input.isAllDay !== undefined) data.isAllDay = input.isAllDay;
  if (input.description !== undefined) data.description = input.description;
  if (input.location !== undefined) data.location = input.location;
  if (input.url !== undefined) data.url = input.url;
  if (input.color !== undefined) data.color = input.color;
  if (input.recurrence !== undefined) {
    data.recurrence = input.recurrence as unknown as Prisma.InputJsonValue;
  }
  if (input.recurrenceParentId !== undefined) {
    data.recurrenceParentId = input.recurrenceParentId;
  }
  if (input.excludedDates !== undefined) data.excludedDates = input.excludedDates;
  if (input.isException !== undefined) data.isException = input.isException;
  if (input.source !== undefined) {
    data.source = input.source as unknown as Prisma.InputJsonValue;
  }
  if (input.deleted !== undefined) data.deleted = input.deleted;
  if (input.deletedAt !== undefined) {
    data.deletedAt = input.deletedAt ? new Date(input.deletedAt) : null;
  }

  const event = await prisma.calendarEvent.update({
    where: { id },
    data,
  });

  // Verify user owns this event
  if (event.userId !== userId) {
    throw new Error('Unauthorized');
  }

  return mapEvent(event);
}

/**
 * Soft delete an event (set deleted: true)
 */
export async function deleteEvent(
  id: string,
  userId: string
): Promise<CalendarEventDTO> {
  // First verify the event belongs to this user
  const existing = await prisma.calendarEvent.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new Error('Event not found');
  }

  const event = await prisma.calendarEvent.update({
    where: { id },
    data: {
      deleted: true,
      deletedAt: new Date(),
    },
  });

  return mapEvent(event);
}

/**
 * Permanently delete an event (hard delete)
 */
export async function permanentlyDeleteEvent(
  id: string,
  userId: string
): Promise<void> {
  // First verify the event belongs to this user
  const existing = await prisma.calendarEvent.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new Error('Event not found');
  }

  await prisma.calendarEvent.delete({
    where: { id },
  });
}

/**
 * Restore a soft-deleted event
 */
export async function restoreEvent(
  id: string,
  userId: string
): Promise<CalendarEventDTO> {
  const existing = await prisma.calendarEvent.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new Error('Event not found');
  }

  const event = await prisma.calendarEvent.update({
    where: { id },
    data: {
      deleted: false,
      deletedAt: null,
    },
  });

  return mapEvent(event);
}

/**
 * Bulk upsert events (for sync operations)
 * Creates new events or updates existing ones based on ID
 */
export async function bulkUpsertEvents(
  userId: string,
  events: CreateEventInput[]
): Promise<CalendarEventDTO[]> {
  const results: CalendarEventDTO[] = [];

  for (const eventInput of events) {
    if (!eventInput.id) {
      // Create new event if no ID provided
      const created = await createEvent(userId, eventInput);
      results.push(created);
    } else {
      // Try to find existing event
      const existing = await prisma.calendarEvent.findFirst({
        where: { id: eventInput.id, userId },
      });

      if (existing) {
        // Update existing
        const updated = await updateEvent(eventInput.id, userId, eventInput);
        results.push(updated);
      } else {
        // Create with provided ID
        const created = await createEvent(userId, eventInput);
        results.push(created);
      }
    }
  }

  return results;
}

/**
 * Get events modified after a certain timestamp (for incremental sync)
 */
export async function getEventsModifiedAfter(
  userId: string,
  since: Date
): Promise<CalendarEventDTO[]> {
  const events = await prisma.calendarEvent.findMany({
    where: {
      userId,
      updatedAt: { gt: since },
    },
    orderBy: { updatedAt: 'asc' },
  });

  return events.map(mapEvent);
}
