/**
 * Collection (Pawkit) Validation Schemas
 *
 * Zod schemas for validating Collection API requests.
 * Used by POST and PATCH endpoints.
 */

import { z } from 'zod';

/**
 * Schema for creating a new collection
 * Client can provide their own ID (for offline-first sync)
 */
export const createCollectionSchema = z.object({
  // Client-generated ID (cuid) for offline-first
  id: z.string().optional(),

  // Required fields
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),

  // Optional fields
  parentId: z.string().nullish(),
  position: z.number().int().default(0),

  // Display settings
  coverImage: z.string().nullish(),
  coverImagePosition: z.number().int().nullish(),
  icon: z.string().nullish(),

  // Flags
  isPrivate: z.boolean().default(false),
  isSystem: z.boolean().default(false),
  hidePreview: z.boolean().default(false),
  useCoverAsBackground: z.boolean().default(false),

  // Board/Kanban config
  metadata: z.record(z.unknown()).nullish(),

  // Pinning
  pinned: z.boolean().default(false),
});

/**
 * Schema for updating an existing collection
 * All fields are optional for partial updates
 */
export const updateCollectionSchema = z.object({
  // Basic info
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  parentId: z.string().nullish(),
  position: z.number().int().optional(),

  // Display settings
  coverImage: z.string().nullish(),
  coverImagePosition: z.number().int().nullish(),
  icon: z.string().nullish(),

  // Flags
  isPrivate: z.boolean().optional(),
  hidePreview: z.boolean().optional(),
  useCoverAsBackground: z.boolean().optional(),

  // Board/Kanban config
  metadata: z.record(z.unknown()).nullish(),

  // Pinning
  pinned: z.boolean().optional(),

  // Soft delete (allow setting via PATCH for sync)
  deleted: z.boolean().optional(),
  deletedAt: z.string().datetime().nullish(),
});

/**
 * Query parameters for GET /api/collections
 */
export const listCollectionsQuerySchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  since: z.string().datetime().optional().nullable(),
  deleted: z
    .string()
    .transform((v) => v === 'true')
    .optional()
    .nullable(),
  parentId: z.string().optional().nullable(), // Filter by parent (null for root)
  limit: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().min(1).max(100))
    .optional()
    .nullable(),
  offset: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().min(0))
    .optional()
    .nullable(),
}).passthrough();

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
export type ListCollectionsQuery = z.infer<typeof listCollectionsQuerySchema>;
