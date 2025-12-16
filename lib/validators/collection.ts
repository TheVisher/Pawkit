import { z } from "zod";

const nameSchema = z
  .string({ required_error: "name is required" })
  .trim()
  .min(1, "name is required")
  .max(80, "name too long");

// Flexible metadata schema for board config, etc.
const metadataSchema = z.record(z.unknown()).nullable().optional();

export const collectionCreateSchema = z.object({
  name: nameSchema,
  parentId: z.string().nullable().optional(),
  metadata: metadataSchema
});

export const collectionUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    parentId: z.string().nullable().optional(),
    pinned: z.boolean().optional(),
    isPrivate: z.boolean().optional(),
    coverImage: z.string().nullable().optional(),
    coverImagePosition: z.number().int().min(0).max(100).nullable().optional(),
    hidePreview: z.boolean().optional(),
    useCoverAsBackground: z.boolean().optional(),
    metadata: metadataSchema
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });
