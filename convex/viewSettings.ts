import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireWorkspaceAccess } from "./users";

// =================================================================
// VIEW SETTINGS QUERIES
// =================================================================

/**
 * Get all view settings for a workspace.
 */
export const list = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    return await ctx.db
      .query("viewSettings")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();
  },
});

/**
 * Get view settings for a specific view key.
 */
export const get = query({
  args: {
    workspaceId: v.id("workspaces"),
    viewKey: v.string(),
  },
  handler: async (ctx, { workspaceId, viewKey }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    return await ctx.db
      .query("viewSettings")
      .withIndex("by_workspace_view", (q) =>
        q.eq("workspaceId", workspaceId).eq("viewKey", viewKey)
      )
      .unique();
  },
});

/**
 * Get view settings by ID.
 */
export const getById = query({
  args: { id: v.id("viewSettings") },
  handler: async (ctx, { id }) => {
    const settings = await ctx.db.get(id);
    if (!settings) return null;

    await requireWorkspaceAccess(ctx, settings.workspaceId);
    return settings;
  },
});

// =================================================================
// VIEW SETTINGS MUTATIONS
// =================================================================

/**
 * Create or update view settings for a specific view.
 */
export const upsert = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    viewKey: v.string(),
    layout: v.optional(v.string()),
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.string()),
    showTitles: v.optional(v.boolean()),
    showUrls: v.optional(v.boolean()),
    showTags: v.optional(v.boolean()),
    cardPadding: v.optional(v.number()),
    cardSpacing: v.optional(v.number()),
    cardSize: v.optional(v.string()),
    showMetadataFooter: v.optional(v.boolean()),
    listColumnOrder: v.optional(v.array(v.string())),
    listColumnWidths: v.optional(v.any()),
    listColumnVisibility: v.optional(v.any()),
  },
  handler: async (ctx, { workspaceId, viewKey, ...updates }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    const now = Date.now();

    // Check if settings exist
    const existing = await ctx.db
      .query("viewSettings")
      .withIndex("by_workspace_view", (q) =>
        q.eq("workspaceId", workspaceId).eq("viewKey", viewKey)
      )
      .unique();

    if (existing) {
      // Update existing settings
      const filteredUpdates: Record<string, unknown> = { updatedAt: now };
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          filteredUpdates[key] = value;
        }
      }

      await ctx.db.patch(existing._id, filteredUpdates);
      return await ctx.db.get(existing._id);
    } else {
      // Create new settings with defaults
      const settingsId = await ctx.db.insert("viewSettings", {
        workspaceId,
        viewKey,
        layout: updates.layout || "grid",
        sortBy: updates.sortBy || "createdAt",
        sortOrder: updates.sortOrder || "desc",
        showTitles: updates.showTitles ?? true,
        showUrls: updates.showUrls ?? false,
        showTags: updates.showTags ?? true,
        cardPadding: updates.cardPadding ?? 16,
        cardSpacing: updates.cardSpacing,
        cardSize: updates.cardSize,
        showMetadataFooter: updates.showMetadataFooter,
        listColumnOrder: updates.listColumnOrder,
        listColumnWidths: updates.listColumnWidths,
        listColumnVisibility: updates.listColumnVisibility,
        updatedAt: now,
      });

      return await ctx.db.get(settingsId);
    }
  },
});

/**
 * Update specific view settings.
 */
export const update = mutation({
  args: {
    id: v.id("viewSettings"),
    layout: v.optional(v.string()),
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.string()),
    showTitles: v.optional(v.boolean()),
    showUrls: v.optional(v.boolean()),
    showTags: v.optional(v.boolean()),
    cardPadding: v.optional(v.number()),
    cardSpacing: v.optional(v.number()),
    cardSize: v.optional(v.string()),
    showMetadataFooter: v.optional(v.boolean()),
    listColumnOrder: v.optional(v.array(v.string())),
    listColumnWidths: v.optional(v.any()),
    listColumnVisibility: v.optional(v.any()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const settings = await ctx.db.get(id);
    if (!settings) throw new Error("View settings not found");

    await requireWorkspaceAccess(ctx, settings.workspaceId);

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(id, filteredUpdates);
    return await ctx.db.get(id);
  },
});

/**
 * Delete view settings.
 */
export const remove = mutation({
  args: { id: v.id("viewSettings") },
  handler: async (ctx, { id }) => {
    const settings = await ctx.db.get(id);
    if (!settings) throw new Error("View settings not found");

    await requireWorkspaceAccess(ctx, settings.workspaceId);

    await ctx.db.delete(id);
  },
});

/**
 * Delete view settings by view key.
 */
export const removeByViewKey = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    viewKey: v.string(),
  },
  handler: async (ctx, { workspaceId, viewKey }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    const settings = await ctx.db
      .query("viewSettings")
      .withIndex("by_workspace_view", (q) =>
        q.eq("workspaceId", workspaceId).eq("viewKey", viewKey)
      )
      .unique();

    if (settings) {
      await ctx.db.delete(settings._id);
    }
  },
});

/**
 * Get or create default view settings.
 */
export const getOrCreateDefault = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    viewKey: v.string(),
  },
  handler: async (ctx, { workspaceId, viewKey }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    // Check if settings exist
    const existing = await ctx.db
      .query("viewSettings")
      .withIndex("by_workspace_view", (q) =>
        q.eq("workspaceId", workspaceId).eq("viewKey", viewKey)
      )
      .unique();

    if (existing) {
      return existing;
    }

    // Create default settings
    const now = Date.now();
    const settingsId = await ctx.db.insert("viewSettings", {
      workspaceId,
      viewKey,
      layout: "grid",
      sortBy: "createdAt",
      sortOrder: "desc",
      showTitles: true,
      showUrls: false,
      showTags: true,
      cardPadding: 16,
      updatedAt: now,
    });

    return await ctx.db.get(settingsId);
  },
});
