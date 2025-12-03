import { z } from "zod";

// Event recurrence schema
const recurrenceSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.number().int().min(1).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  endDate: z.string().optional(),
  count: z.number().int().min(1).optional(),
}).optional().nullable();

// Time format validation (HH:MM)
const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)")
  .optional()
  .nullable();

// Date format validation (YYYY-MM-DD)
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)");

// Hex color validation
const colorString = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color")
  .optional()
  .nullable();

export const eventCreateSchema = z.object({
  id: z.string().uuid().optional(), // Allow client-provided ID for local-first sync
  title: z.string().trim().min(1, "Title is required").max(200, "Title too long"),
  date: dateString,
  endDate: dateString.optional().nullable(),
  startTime: timeString,
  endTime: timeString,
  isAllDay: z.boolean().optional().default(false),
  description: z.string().max(2000, "Description too long").optional().nullable(),
  location: z.string().max(500, "Location too long").optional().nullable(),
  url: z.string().url("Invalid URL").optional().nullable(),
  color: colorString,
  recurrence: recurrenceSchema,
  recurrenceParentId: z.string().uuid().optional().nullable(),
  excludedDates: z.array(dateString).optional().default([]),
  isException: z.boolean().optional().default(false),
  source: z.enum(["manual", "import", "sync"]).optional().nullable(),
});

export const eventUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  date: dateString.optional(),
  endDate: dateString.optional().nullable(),
  startTime: timeString,
  endTime: timeString,
  isAllDay: z.boolean().optional(),
  description: z.string().max(2000).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  url: z.string().url().optional().nullable(),
  color: colorString,
  recurrence: recurrenceSchema,
  recurrenceParentId: z.string().uuid().optional().nullable(),
  excludedDates: z.array(dateString).optional(),
  isException: z.boolean().optional(),
  source: z.enum(["manual", "import", "sync"]).optional().nullable(),
  deleted: z.boolean().optional(),
  deletedAt: z.string().datetime().optional().nullable(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided",
});

// Bulk upsert schema
export const eventBulkUpsertSchema = z.object({
  bulk: z.literal(true),
  events: z.array(eventCreateSchema.extend({
    deleted: z.boolean().optional(),
    deletedAt: z.string().datetime().optional().nullable(),
  })),
});
