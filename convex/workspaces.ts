import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./users";

// =================================================================
// WORKSPACE QUERIES
// =================================================================

/**
 * List all workspaces for the current user.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    return await ctx.db
      .query("workspaces")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

/**
 * Get a single workspace by ID.
 */
export const get = query({
  args: { id: v.id("workspaces") },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx);

    const workspace = await ctx.db.get(id);
    if (!workspace || workspace.userId !== user._id) {
      return null;
    }

    return workspace;
  },
});

/**
 * Get the user's default workspace.
 */
export const getDefault = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    return await ctx.db
      .query("workspaces")
      .withIndex("by_user_default", (q) =>
        q.eq("userId", user._id).eq("isDefault", true)
      )
      .first();
  },
});

/**
 * Get workspace statistics (counts of cards, collections, etc.).
 */
export const getStats = query({
  args: { id: v.id("workspaces") },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx);

    const workspace = await ctx.db.get(id);
    if (!workspace || workspace.userId !== user._id) {
      throw new Error("Workspace not found");
    }

    // Count cards
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", id).eq("deleted", false)
      )
      .collect();

    // Count collections
    const collections = await ctx.db
      .query("collections")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", id).eq("deleted", false)
      )
      .collect();

    // Count todos
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", id).eq("deleted", false)
      )
      .collect();

    // Count events
    const events = await ctx.db
      .query("calendarEvents")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", id).eq("deleted", false)
      )
      .collect();

    return {
      totalCards: cards.length,
      totalCollections: collections.length,
      totalTodos: todos.length,
      completedTodos: todos.filter((t) => t.completed).length,
      totalEvents: events.length,
      cardsByType: cards.reduce(
        (acc, card) => {
          acc[card.type] = (acc[card.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  },
});

// =================================================================
// WORKSPACE MUTATIONS
// =================================================================

/**
 * Create a new workspace.
 */
export const create = mutation({
  args: {
    name: v.string(),
    icon: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    // If this is being set as default, unset any existing default
    if (args.isDefault) {
      const existingDefault = await ctx.db
        .query("workspaces")
        .withIndex("by_user_default", (q) =>
          q.eq("userId", user._id).eq("isDefault", true)
        )
        .first();

      if (existingDefault) {
        await ctx.db.patch(existingDefault._id, {
          isDefault: false,
          updatedAt: now,
        });
      }
    }

    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      icon: args.icon,
      userId: user._id,
      isDefault: args.isDefault || false,
      createdAt: now,
      updatedAt: now,
    });

    return workspaceId;
  },
});

/**
 * Update a workspace.
 */
export const update = mutation({
  args: {
    id: v.id("workspaces"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    preferences: v.optional(
      v.object({
        recentTags: v.optional(v.array(v.string())),
        tagColors: v.optional(v.any()),
      })
    ),
  },
  handler: async (ctx, { id, ...updates }) => {
    const user = await requireUser(ctx);

    const workspace = await ctx.db.get(id);
    if (!workspace || workspace.userId !== user._id) {
      throw new Error("Workspace not found");
    }

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
 * Set a workspace as default.
 */
export const setDefault = mutation({
  args: { id: v.id("workspaces") },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    const workspace = await ctx.db.get(id);
    if (!workspace || workspace.userId !== user._id) {
      throw new Error("Workspace not found");
    }

    // Unset any existing default
    const existingDefault = await ctx.db
      .query("workspaces")
      .withIndex("by_user_default", (q) =>
        q.eq("userId", user._id).eq("isDefault", true)
      )
      .first();

    if (existingDefault && existingDefault._id !== id) {
      await ctx.db.patch(existingDefault._id, {
        isDefault: false,
        updatedAt: now,
      });
    }

    // Set this workspace as default
    await ctx.db.patch(id, {
      isDefault: true,
      updatedAt: now,
    });

    return await ctx.db.get(id);
  },
});

/**
 * Delete a workspace.
 * WARNING: This permanently deletes all data in the workspace.
 */
export const remove = mutation({
  args: { id: v.id("workspaces") },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx);

    const workspace = await ctx.db.get(id);
    if (!workspace || workspace.userId !== user._id) {
      throw new Error("Workspace not found");
    }

    // Don't allow deleting the default workspace
    if (workspace.isDefault) {
      throw new Error("Cannot delete the default workspace");
    }

    // Delete all cards
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", id))
      .collect();
    for (const card of cards) {
      await ctx.db.delete(card._id);
    }

    // Delete all collection notes first (FK constraint)
    const collections = await ctx.db
      .query("collections")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", id))
      .collect();
    for (const collection of collections) {
      const notes = await ctx.db
        .query("collectionNotes")
        .withIndex("by_collection", (q) => q.eq("collectionId", collection._id))
        .collect();
      for (const note of notes) {
        await ctx.db.delete(note._id);
      }
      await ctx.db.delete(collection._id);
    }

    // Delete all events
    const events = await ctx.db
      .query("calendarEvents")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", id))
      .collect();
    for (const event of events) {
      await ctx.db.delete(event._id);
    }

    // Delete all todos
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", id))
      .collect();
    for (const todo of todos) {
      await ctx.db.delete(todo._id);
    }

    // Delete all references
    const references = await ctx.db
      .query("references")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", id))
      .collect();
    for (const ref of references) {
      await ctx.db.delete(ref._id);
    }

    // Delete all view settings
    const viewSettings = await ctx.db
      .query("viewSettings")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", id))
      .collect();
    for (const setting of viewSettings) {
      await ctx.db.delete(setting._id);
    }

    // Delete the workspace
    await ctx.db.delete(id);
  },
});

/**
 * Update workspace preferences (partial update).
 */
export const updatePreferences = mutation({
  args: {
    id: v.id("workspaces"),
    recentTags: v.optional(v.array(v.string())),
    tagColors: v.optional(v.any()),
  },
  handler: async (ctx, { id, recentTags, tagColors }) => {
    const user = await requireUser(ctx);

    const workspace = await ctx.db.get(id);
    if (!workspace || workspace.userId !== user._id) {
      throw new Error("Workspace not found");
    }

    const currentPrefs = workspace.preferences || {};
    const newPrefs = { ...currentPrefs };

    if (recentTags !== undefined) {
      newPrefs.recentTags = recentTags;
    }
    if (tagColors !== undefined) {
      newPrefs.tagColors = tagColors;
    }

    await ctx.db.patch(id, {
      preferences: newPrefs,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

/**
 * Add a tag to recent tags.
 */
export const addRecentTag = mutation({
  args: {
    id: v.id("workspaces"),
    tag: v.string(),
    maxTags: v.optional(v.number()),
  },
  handler: async (ctx, { id, tag, maxTags = 20 }) => {
    const user = await requireUser(ctx);

    const workspace = await ctx.db.get(id);
    if (!workspace || workspace.userId !== user._id) {
      throw new Error("Workspace not found");
    }

    const currentPrefs = workspace.preferences || {};
    const recentTags = currentPrefs.recentTags || [];

    // Remove tag if it exists, then add to front
    const filtered = recentTags.filter((t: string) => t !== tag);
    const updated = [tag, ...filtered].slice(0, maxTags);

    await ctx.db.patch(id, {
      preferences: { ...currentPrefs, recentTags: updated },
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});
