import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireWorkspaceAccess } from "./users";

// =================================================================
// REFERENCE QUERIES (@ mentions)
// =================================================================

/**
 * List all non-deleted references for a workspace.
 */
export const list = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    return await ctx.db
      .query("references")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId).eq("deleted", false)
      )
      .collect();
  },
});

/**
 * Get references from a specific source (outgoing links).
 */
export const getBySource = query({
  args: {
    workspaceId: v.id("workspaces"),
    sourceId: v.string(),
  },
  handler: async (ctx, { workspaceId, sourceId }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    return await ctx.db
      .query("references")
      .withIndex("by_workspace_source", (q) =>
        q.eq("workspaceId", workspaceId).eq("sourceId", sourceId)
      )
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();
  },
});

/**
 * Get references to a specific target (backlinks/incoming links).
 */
export const getByTarget = query({
  args: {
    targetId: v.string(),
    targetType: v.string(),
  },
  handler: async (ctx, { targetId, targetType }) => {
    const references = await ctx.db
      .query("references")
      .withIndex("by_target", (q) =>
        q.eq("targetId", targetId).eq("targetType", targetType)
      )
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();

    // Verify workspace access for each reference
    const validRefs = [];
    for (const ref of references) {
      try {
        await requireWorkspaceAccess(ctx, ref.workspaceId);
        validRefs.push(ref);
      } catch {
        // Skip refs we don't have access to
      }
    }

    return validRefs;
  },
});

/**
 * Get backlinks (references pointing to a card).
 */
export const getBacklinks = query({
  args: { cardId: v.id("cards") },
  handler: async (ctx, { cardId }) => {
    const card = await ctx.db.get(cardId);
    if (!card) return [];

    await requireWorkspaceAccess(ctx, card.workspaceId);

    // Get references where targetId is this card's ID and type is 'card'
    const references = await ctx.db
      .query("references")
      .withIndex("by_target", (q) =>
        q.eq("targetId", cardId).eq("targetType", "card")
      )
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();

    // Enrich with source card data
    const enriched = await Promise.all(
      references.map(async (ref) => {
        const sourceCard = await ctx.db.get(ref.sourceId as Id<"cards">);
        return {
          ...ref,
          sourceCard: sourceCard
            ? {
                id: sourceCard._id,
                title: sourceCard.title,
                type: sourceCard.type,
              }
            : null,
        };
      })
    );

    return enriched.filter((r) => r.sourceCard !== null);
  },
});

/**
 * Get all date references in a workspace.
 */
export const getDateReferences = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    return await ctx.db
      .query("references")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId).eq("deleted", false)
      )
      .filter((q) => q.eq(q.field("targetType"), "date"))
      .collect();
  },
});

/**
 * Get references for a specific date.
 */
export const getByDate = query({
  args: {
    workspaceId: v.id("workspaces"),
    date: v.string(),
  },
  handler: async (ctx, { workspaceId, date }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    const references = await ctx.db
      .query("references")
      .withIndex("by_target", (q) =>
        q.eq("targetId", date).eq("targetType", "date")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("workspaceId"), workspaceId),
          q.eq(q.field("deleted"), false)
        )
      )
      .collect();

    // Enrich with source card data
    const enriched = await Promise.all(
      references.map(async (ref) => {
        const sourceCard = await ctx.db.get(ref.sourceId as Id<"cards">);
        return {
          ...ref,
          sourceCard: sourceCard
            ? {
                id: sourceCard._id,
                title: sourceCard.title,
                type: sourceCard.type,
              }
            : null,
        };
      })
    );

    return enriched.filter((r) => r.sourceCard !== null);
  },
});

// =================================================================
// REFERENCE MUTATIONS
// =================================================================

/**
 * Create a new reference (@ mention).
 */
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    sourceId: v.string(),
    targetId: v.string(),
    targetType: v.string(), // 'card' | 'pawkit' | 'date'
    linkText: v.string(),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, args.workspaceId);

    const now = Date.now();

    const refId = await ctx.db.insert("references", {
      workspaceId: args.workspaceId,
      sourceId: args.sourceId,
      targetId: args.targetId,
      targetType: args.targetType,
      linkText: args.linkText,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    });

    return refId;
  },
});

/**
 * Update a reference.
 */
export const update = mutation({
  args: {
    id: v.id("references"),
    linkText: v.optional(v.string()),
    targetId: v.optional(v.string()),
    targetType: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const ref = await ctx.db.get(id);
    if (!ref) throw new Error("Reference not found");

    await requireWorkspaceAccess(ctx, ref.workspaceId);

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
 * Delete a reference (soft delete).
 */
export const remove = mutation({
  args: { id: v.id("references") },
  handler: async (ctx, { id }) => {
    const ref = await ctx.db.get(id);
    if (!ref) throw new Error("Reference not found");

    await requireWorkspaceAccess(ctx, ref.workspaceId);

    await ctx.db.patch(id, {
      deleted: true,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Permanently delete a reference.
 */
export const permanentDelete = mutation({
  args: { id: v.id("references") },
  handler: async (ctx, { id }) => {
    const ref = await ctx.db.get(id);
    if (!ref) throw new Error("Reference not found");

    await requireWorkspaceAccess(ctx, ref.workspaceId);

    await ctx.db.delete(id);
  },
});

/**
 * Sync references for a source (replace all references from a source).
 * Used when saving a document to update all its outgoing links.
 */
export const syncForSource = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    sourceId: v.string(),
    references: v.array(
      v.object({
        targetId: v.string(),
        targetType: v.string(),
        linkText: v.string(),
      })
    ),
  },
  handler: async (ctx, { workspaceId, sourceId, references }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    const now = Date.now();

    // Get existing references from this source
    const existing = await ctx.db
      .query("references")
      .withIndex("by_workspace_source", (q) =>
        q.eq("workspaceId", workspaceId).eq("sourceId", sourceId)
      )
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();

    // Create a map of new references for comparison
    const newRefMap = new Map(
      references.map((r) => [`${r.targetId}:${r.targetType}`, r])
    );

    // Delete references that no longer exist
    for (const ref of existing) {
      const key = `${ref.targetId}:${ref.targetType}`;
      if (!newRefMap.has(key)) {
        await ctx.db.patch(ref._id, {
          deleted: true,
          deletedAt: now,
          updatedAt: now,
        });
      } else {
        // Update existing reference if link text changed
        const newRef = newRefMap.get(key)!;
        if (ref.linkText !== newRef.linkText) {
          await ctx.db.patch(ref._id, {
            linkText: newRef.linkText,
            updatedAt: now,
          });
        }
        // Remove from map since it's already handled
        newRefMap.delete(key);
      }
    }

    // Create new references
    for (const [, ref] of newRefMap) {
      await ctx.db.insert("references", {
        workspaceId,
        sourceId,
        targetId: ref.targetId,
        targetType: ref.targetType,
        linkText: ref.linkText,
        deleted: false,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Delete all references from a source.
 * Used when deleting a card to clean up its outgoing links.
 */
export const deleteAllFromSource = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    sourceId: v.string(),
  },
  handler: async (ctx, { workspaceId, sourceId }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    const now = Date.now();

    const existing = await ctx.db
      .query("references")
      .withIndex("by_workspace_source", (q) =>
        q.eq("workspaceId", workspaceId).eq("sourceId", sourceId)
      )
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();

    for (const ref of existing) {
      await ctx.db.patch(ref._id, {
        deleted: true,
        deletedAt: now,
        updatedAt: now,
      });
    }

    return { deleted: existing.length };
  },
});
