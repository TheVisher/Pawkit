import { z } from "zod";

/**
 * User update validation schema
 * Used for PATCH /api/user
 */
export const userUpdateSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .max(100, "Display name must be 100 characters or less")
      .nullable()
      .optional(),
    serverSync: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// Static view types
const staticViewTypes = z.enum([
  "library",
  "notes",
  "den",
  "timeline",
  "pawkits",
  "home",
  "favorites",
  "trash",
  "tags",
]);

// Dynamic pawkit-specific view keys (e.g., "pawkit-arc-raiders")
const pawkitViewKey = z.string().regex(/^pawkit-[a-z0-9-]+$/, {
  message: "Pawkit view key must match pattern 'pawkit-{slug}'",
});

/**
 * View settings validation schema
 * Used for PATCH /api/user/view-settings
 * Supports both static view types and dynamic pawkit-specific keys
 */
export const viewSettingsUpdateSchema = z.object({
  view: z.union([staticViewTypes, pawkitViewKey], {
    errorMap: () => ({ message: "Invalid view type" }),
  }),
  settings: z.object({
    layout: z
      .enum(["grid", "masonry", "list"], {
        errorMap: () => ({ message: "Invalid layout type" }),
      })
      .optional(),
    cardSize: z
      .number()
      .int()
      .min(1, "Card size must be between 1 and 5")
      .max(5, "Card size must be between 1 and 5")
      .optional(),
    showTitles: z.boolean().optional(),
    showUrls: z.boolean().optional(),
    showTags: z.boolean().optional(),
    cardPadding: z
      .number()
      .int()
      .min(0, "Card padding must be between 0 and 4")
      .max(4, "Card padding must be between 0 and 4")
      .optional(),
    sortBy: z
      .enum(["createdAt", "title", "url", "updatedAt", "pawkit"], {
        errorMap: () => ({ message: "Invalid sort field" }),
      })
      .optional(),
    sortOrder: z
      .enum(["asc", "desc"], {
        errorMap: () => ({ message: "Invalid sort order" }),
      })
      .optional(),
    viewSpecific: z.string().nullable().optional(),
  }),
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type ViewSettingsUpdateInput = z.infer<typeof viewSettingsUpdateSchema>;
