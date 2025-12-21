/**
 * Workspace Validation Schemas
 *
 * Zod schemas for validating Workspace API requests.
 * Used by POST and PATCH endpoints.
 */

import { z } from 'zod';

/**
 * Schema for creating a new workspace
 * Client can provide their own ID (for offline-first sync)
 */
export const createWorkspaceSchema = z.object({
  // Client-generated ID (cuid) for offline-first
  id: z.string().optional(),

  // Required fields
  name: z.string().min(1, 'Name is required'),

  // Optional fields
  icon: z.string().nullish(), // Emoji or icon identifier
  isDefault: z.boolean().default(false),
});

/**
 * Schema for updating an existing workspace
 * All fields are optional for partial updates
 */
export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().nullish(),
  isDefault: z.boolean().optional(),
});

/**
 * Query parameters for GET /api/workspaces
 */
export const listWorkspacesQuerySchema = z.object({
  since: z.string().datetime().optional().nullable(),
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
}).passthrough(); // Allow extra query params (workspaceId, deleted) to be ignored

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type ListWorkspacesQuery = z.infer<typeof listWorkspacesQuerySchema>;
