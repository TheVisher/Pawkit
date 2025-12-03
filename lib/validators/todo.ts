import { z } from "zod";

export const todoCreateSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Text is required")
    .max(500, "Text must be 500 characters or less"),
  completed: z.boolean().optional().default(false),
});

export const todoUpdateSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Text is required")
    .max(500, "Text must be 500 characters or less")
    .optional(),
  completed: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided",
});
