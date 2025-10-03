import { z } from "zod";

const nameSchema = z
  .string({ required_error: "name is required" })
  .trim()
  .min(1, "name is required")
  .max(80, "name too long");

export const collectionCreateSchema = z.object({
  name: nameSchema,
  parentId: z.string().optional()
});

export const collectionUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    parentId: z.string().nullable().optional(),
    pinned: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });
