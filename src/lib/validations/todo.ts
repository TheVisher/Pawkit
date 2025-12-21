/**
 * Todo Validation Schemas
 *
 * Zod schemas for validating Todo API requests.
 * Used by POST and PATCH endpoints.
 */

import { z } from 'zod';

/**
 * Priority levels for todos
 */
export const TodoPriority = z.enum(['high', 'medium', 'low']);

/**
 * Schema for creating a new todo
 * Client can provide their own ID (for offline-first sync)
 */
export const createTodoSchema = z.object({
  // Client-generated ID (cuid) for offline-first
  id: z.string().optional(),

  // Required fields
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  text: z.string().min(1, 'Text is required'),

  // Optional fields
  completed: z.boolean().default(false),
  completedAt: z.string().datetime().nullish(),
  dueDate: z.string().datetime().nullish(),
  priority: TodoPriority.nullish(),
  linkedCardId: z.string().nullish(),
});

/**
 * Schema for updating an existing todo
 * All fields are optional for partial updates
 */
export const updateTodoSchema = z.object({
  // Task content
  text: z.string().min(1).optional(),

  // Completion
  completed: z.boolean().optional(),
  completedAt: z.string().datetime().nullish(),

  // Scheduling
  dueDate: z.string().datetime().nullish(),

  // Priority
  priority: TodoPriority.nullish(),

  // Link to card
  linkedCardId: z.string().nullish(),
});

/**
 * Query parameters for GET /api/todos
 */
export const listTodosQuerySchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  since: z.string().datetime().optional().nullable(),
  // Include soft-deleted todos (default: false)
  deleted: z
    .string()
    .transform((v) => v === 'true')
    .optional()
    .nullable(),
  // Filter by completion status
  completed: z
    .string()
    .transform((v) => v === 'true')
    .optional()
    .nullable(),
  // Filter by priority
  priority: TodoPriority.optional().nullable(),
  // Filter by due date range
  dueBefore: z.string().datetime().optional().nullable(),
  dueAfter: z.string().datetime().optional().nullable(),
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

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
export type ListTodosQuery = z.infer<typeof listTodosQuerySchema>;
