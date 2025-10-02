import { z } from "zod";

export const exportPayloadSchema = z.object({
  exportedAt: z.string().optional(),
  cards: z
    .array(
      z.object({
        id: z.string().optional(),
        url: z.string().min(1),
        title: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(["PENDING", "READY", "ERROR"]).optional(),
        tags: z.array(z.string()).optional(),
        collections: z.array(z.string()).optional(),
        domain: z.string().optional(),
        image: z.string().optional(),
        description: z.string().optional(),
        metadata: z.record(z.any()).optional(),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional()
      })
    )
    .default([]),
  collections: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        slug: z.string().min(1),
        parentId: z.string().nullable().optional(),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional()
      })
    )
    .default([])
});
