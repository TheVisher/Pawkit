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
  type: z.enum(["url", "md-note", "text-note"]).default("url"),
  url: z
    .string()
    .optional()
    .transform((val) => val && val.length > 0 ? ensureUrlProtocol(val) : val),
  title: nullableString,
  notes: nullableString,
  content: nullableString,
  tags: tagsArray.optional(),
  collections: collectionsArray.optional(),
  autoFetchMetadata: z.boolean().optional(),
  previewServiceUrl: z.string().url().optional()
}).refine(
  (data) => {
    // URL cards must have a URL
    if (data.type === "url") {
      return !!data.url && data.url.length > 0;
    }
    // Note cards don't require URL
    return true;
  },
  {
    message: "URL is required for URL type cards",
    path: ["url"]
  }
);

export const cardUpdateSchema = z
  .object({
    type: z.enum(["url", "md-note", "text-note"]).optional(),
    url: z.string().min(1).transform(ensureUrlProtocol).optional(),
    title: nullableString,
    notes: nullableString,
    content: nullableString,
    status: z.enum(["PENDING", "READY", "ERROR"]).optional(),
    tags: tagsArray.optional(),
    collections: collectionsArray.optional(),
    domain: nullableString,
    image: nullableString,
    description: nullableString,
    pinned: z.boolean().optional(),
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
  type: z.enum(["url", "md-note", "text-note"]).optional(),
  status: z.enum(["PENDING", "READY", "ERROR"]).optional(),
  limit: z.coerce.number().int().min(1).max(10000).optional(),
  cursor: z.string().optional()
});
