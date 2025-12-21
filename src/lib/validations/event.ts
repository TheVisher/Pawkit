/**
 * CalendarEvent Validation Schemas
 *
 * Zod schemas for validating CalendarEvent API requests.
 * Used by POST and PATCH endpoints.
 */

import { z } from 'zod';

// Date format: YYYY-MM-DD
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

// Time format: HH:mm
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Recurrence schema (RFC 5545 inspired)
 * Example: { freq: 'weekly', interval: 1, byDay: ['MO', 'WE', 'FR'], until: '2025-12-31' }
 */
export const recurrenceSchema = z.object({
  freq: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval: z.number().int().min(1).default(1),
  byDay: z.array(z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])).optional(),
  byMonthDay: z.array(z.number().int().min(1).max(31)).optional(),
  byMonth: z.array(z.number().int().min(1).max(12)).optional(),
  count: z.number().int().min(1).optional(),
  until: z.string().regex(datePattern, 'Must be YYYY-MM-DD format').optional(),
}).optional();

/**
 * Source tracking schema
 * Example: { type: 'card', cardId: 'xxx' } or { type: 'manual' }
 */
export const sourceSchema = z.object({
  type: z.enum(['card', 'manual', 'kit', 'import']),
  cardId: z.string().optional(),
}).optional();

/**
 * Schema for creating a new calendar event
 * Client can provide their own ID (for offline-first sync)
 */
export const createEventSchema = z.object({
  // Client-generated ID (cuid) for offline-first
  id: z.string().optional(),

  // Required fields
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  title: z.string().min(1, 'Title is required'),
  date: z.string().regex(datePattern, 'Date must be YYYY-MM-DD format'),

  // Optional date/time fields
  endDate: z.string().regex(datePattern, 'End date must be YYYY-MM-DD format').nullish(),
  startTime: z.string().regex(timePattern, 'Start time must be HH:mm format').nullish(),
  endTime: z.string().regex(timePattern, 'End time must be HH:mm format').nullish(),
  isAllDay: z.boolean().default(true),

  // Additional info
  description: z.string().nullish(),
  location: z.string().nullish(),
  url: z.string().url().nullish(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be hex format (#RRGGBB)').nullish(),

  // Recurrence
  recurrence: z.record(z.unknown()).nullish(), // Allow generic JSON for now
  recurrenceParentId: z.string().nullish(),
  excludedDates: z.array(z.string().regex(datePattern)).default([]),
  isException: z.boolean().default(false),

  // Source tracking
  source: z.record(z.unknown()).nullish(),
});

/**
 * Schema for updating an existing calendar event
 * All fields are optional for partial updates
 */
export const updateEventSchema = z.object({
  // Event details
  title: z.string().min(1).optional(),
  date: z.string().regex(datePattern, 'Date must be YYYY-MM-DD format').optional(),
  endDate: z.string().regex(datePattern, 'End date must be YYYY-MM-DD format').nullish(),
  startTime: z.string().regex(timePattern, 'Start time must be HH:mm format').nullish(),
  endTime: z.string().regex(timePattern, 'End time must be HH:mm format').nullish(),
  isAllDay: z.boolean().optional(),

  // Additional info
  description: z.string().nullish(),
  location: z.string().nullish(),
  url: z.string().url().nullish(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be hex format (#RRGGBB)').nullish(),

  // Recurrence
  recurrence: z.record(z.unknown()).nullish(),
  recurrenceParentId: z.string().nullish(),
  excludedDates: z.array(z.string().regex(datePattern)).optional(),
  isException: z.boolean().optional(),

  // Source tracking
  source: z.record(z.unknown()).nullish(),

  // Soft delete (allow setting via PATCH for sync)
  deleted: z.boolean().optional(),
  deletedAt: z.string().datetime().nullish(),
});

/**
 * Query parameters for GET /api/events
 */
export const listEventsQuerySchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  since: z.string().datetime().optional().nullable(),
  deleted: z
    .string()
    .transform((v) => v === 'true')
    .optional()
    .nullable(),
  // Date range filtering for calendar views
  startDate: z.string().regex(datePattern, 'Start date must be YYYY-MM-DD format').optional().nullable(),
  endDate: z.string().regex(datePattern, 'End date must be YYYY-MM-DD format').optional().nullable(),
  limit: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().min(1).max(500)) // Higher limit for calendar month views
    .optional()
    .nullable(),
  offset: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().min(0))
    .optional()
    .nullable(),
}).passthrough();

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
