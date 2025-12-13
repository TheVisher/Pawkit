import { z } from "zod";

export const todoCreateSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Text is required")
    .max(500, "Text must be 500 characters or less"),
  completed: z.boolean().optional().default(false),
  dueDate: z.string().datetime().nullable().optional(), // ISO 8601 string or null for backlog
});

export const todoUpdateSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Text is required")
    .max(500, "Text must be 500 characters or less")
    .optional(),
  completed: z.boolean().optional(),
  dueDate: z.string().datetime().nullable().optional(), // ISO 8601 string or null for backlog
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided",
});

// Type for Todo with new fields
export type TodoItem = {
  id: string;
  userId: string;
  text: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  completedAt: string | null;
};
