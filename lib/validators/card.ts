import { z } from "zod";
import { ensureUrlProtocol, normalizeCollections, normalizeTags } from "@/lib/utils/strings";

const nullableString = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional()
  .or(z.literal("").transform(() => undefined));

const tagsArray = z
  .array(z.string().min(1).trim())
  .default([])
  .transform(normalizeTags);

const collectionsArray = z
  .array(z.string().min(1).trim())
  .default([])
  .transform(normalizeCollections);

export const cardCreateSchema = z.object({
  url: z
    .string({ required_error: "url is required" })
    .min(1, "url is required")
    .transform(ensureUrlProtocol),
  title: nullableString,
  notes: nullableString,
  tags: tagsArray.optional(),
  collections: collectionsArray.optional(),
  autoFetchMetadata: z.boolean().optional(),
  previewServiceUrl: z.string().url().optional()
});

export const cardUpdateSchema = z
  .object({
    url: z.string().min(1).transform(ensureUrlProtocol).optional(),
    title: nullableString,
    notes: nullableString,
    status: z.enum(["PENDING", "READY", "ERROR"]).optional(),
    tags: tagsArray.optional(),
    collections: collectionsArray.optional(),
    domain: nullableString,
    image: nullableString,
    description: nullableString,
    metadata: z
      .record(z.any())
      .nullable()
      .optional()
      .transform((value) => (value ? value : undefined))
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

export const cardListQuerySchema = z.object({
  q: z.string().trim().optional(),
  collection: z.string().trim().optional(),
  status: z.enum(["PENDING", "READY", "ERROR"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional()
});
