/**
 * Card Validation Schemas
 *
 * Zod schemas for validating Card API requests.
 * Used by POST and PATCH endpoints.
 */

import { z } from 'zod';

/**
 * Card types supported by the system
 */
export const CardType = z.enum([
  'url',
  'md-note',
  'text-note',
  'quick-note',
  'file',
]);

/**
 * Card status for async metadata fetching
 */
export const CardStatus = z.enum(['PENDING', 'READY', 'ERROR']);

/**
 * Schema for creating a new card
 * Client can provide their own ID (for offline-first sync)
 */
export const createCardSchema = z.object({
  // Client-generated ID (cuid) for offline-first
  id: z.string().optional(),

  // Required fields
  workspaceId: z.string().min(1, 'Workspace ID is required'),

  // Type (defaults to 'url')
  type: CardType.default('url'),

  // URL is required for 'url' type, empty string for notes
  url: z.string().default(''),

  // Optional content fields
  title: z.string().nullish(),
  description: z.string().nullish(),
  content: z.string().nullish(),
  notes: z.string().nullish(),

  // Metadata fields
  domain: z.string().nullish(),
  image: z.string().nullish(),
  favicon: z.string().nullish(),
  metadata: z.record(z.unknown()).nullish(),
  status: CardStatus.default('PENDING'),

  // Organization
  tags: z.array(z.string()).default([]),
  collections: z.array(z.string()).default([]),
  pinned: z.boolean().default(false),

  // Scheduling
  scheduledDate: z.string().datetime().nullish(),
  scheduledStartTime: z.string().nullish(),
  scheduledEndTime: z.string().nullish(),

  // Article/Reader mode
  articleContent: z.string().nullish(),
  summary: z.string().nullish(),
  summaryType: z.string().nullish(),

  // YouTube transcripts
  transcriptSegments: z.string().nullish(),

  // AI fields
  structuredData: z.record(z.unknown()).nullish(),
  source: z.record(z.unknown()).nullish(),

  // File support
  isFileCard: z.boolean().default(false),
  fileId: z.string().nullish(),

  // Cloud sync
  cloudId: z.string().nullish(),
  cloudProvider: z.string().nullish(),
  cloudSyncedAt: z.string().datetime().nullish(),
});

/**
 * Schema for updating an existing card
 * All fields are optional for partial updates
 */
export const updateCardSchema = z.object({
  // Type
  type: CardType.optional(),

  // Content fields
  url: z.string().optional(),
  title: z.string().nullish(),
  description: z.string().nullish(),
  content: z.string().nullish(),
  notes: z.string().nullish(),

  // Metadata fields
  domain: z.string().nullish(),
  image: z.string().nullish(),
  favicon: z.string().nullish(),
  metadata: z.record(z.unknown()).nullish(),
  status: CardStatus.optional(),

  // Organization
  tags: z.array(z.string()).optional(),
  collections: z.array(z.string()).optional(),
  pinned: z.boolean().optional(),

  // Scheduling
  scheduledDate: z.string().datetime().nullish(),
  scheduledStartTime: z.string().nullish(),
  scheduledEndTime: z.string().nullish(),

  // Article/Reader mode
  articleContent: z.string().nullish(),
  summary: z.string().nullish(),
  summaryType: z.string().nullish(),

  // YouTube transcripts
  transcriptSegments: z.string().nullish(),

  // AI fields
  structuredData: z.record(z.unknown()).nullish(),
  source: z.record(z.unknown()).nullish(),

  // File support
  isFileCard: z.boolean().optional(),
  fileId: z.string().nullish(),

  // Cloud sync
  cloudId: z.string().nullish(),
  cloudProvider: z.string().nullish(),
  cloudSyncedAt: z.string().datetime().nullish(),

  // Soft delete (allow setting via PATCH for sync)
  deleted: z.boolean().optional(),
  deletedAt: z.string().datetime().nullish(),
});

/**
 * Query parameters for GET /api/cards
 */
export const listCardsQuerySchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  since: z.string().datetime().optional(),
  deleted: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  type: CardType.optional(),
  limit: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().min(1).max(100))
    .optional(),
  offset: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().min(0))
    .optional(),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type ListCardsQuery = z.infer<typeof listCardsQuerySchema>;
