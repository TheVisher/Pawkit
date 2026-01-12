/**
 * Reference Validation Schemas
 *
 * Zod schemas for validating Reference API requests.
 * References are @ mentions/backlinks between cards, Pawkits, and dates.
 */

import { z } from 'zod';

/**
 * Target types for references
 * - card: Link to another card
 * - pawkit: Link to a Pawkit/collection (by slug)
 * - date: Link to a date (ISO format YYYY-MM-DD)
 */
export const targetTypeSchema = z.enum(['card', 'pawkit', 'date']);

/**
 * Schema for creating a new reference
 * Client can provide their own ID (for offline-first sync)
 */
export const createReferenceSchema = z.object({
  // Client-generated ID (cuid) for offline-first
  id: z.string().optional(),

  // Required fields
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  sourceId: z.string().min(1, 'Source ID is required'),
  targetId: z.string().min(1, 'Target ID is required'),
  targetType: targetTypeSchema,
  linkText: z.string().min(1, 'Link text is required'),
});

/**
 * Schema for updating an existing reference
 * All fields are optional for partial updates
 */
export const updateReferenceSchema = z.object({
  // Allow updating target and link text
  targetId: z.string().min(1).optional(),
  targetType: targetTypeSchema.optional(),
  linkText: z.string().min(1).optional(),

  // Soft delete (allow setting via PATCH for sync)
  deleted: z.boolean().optional(),
  deletedAt: z.string().datetime().nullish(),
});

/**
 * Query parameters for GET /api/references
 */
export const listReferencesQuerySchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  since: z.string().datetime().optional().nullable(),
  deleted: z
    .string()
    .transform((v) => v === 'true')
    .optional()
    .nullable(),
  // Optional filters
  sourceId: z.string().optional().nullable(),
  targetId: z.string().optional().nullable(),
  targetType: targetTypeSchema.optional().nullable(),
  limit: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().min(1).max(500))
    .optional()
    .nullable(),
  offset: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().min(0))
    .optional()
    .nullable(),
}).passthrough();

export type CreateReferenceInput = z.infer<typeof createReferenceSchema>;
export type UpdateReferenceInput = z.infer<typeof updateReferenceSchema>;
export type ListReferencesQuery = z.infer<typeof listReferencesQuerySchema>;
