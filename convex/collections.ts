import { query, mutation, internalQuery, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireWorkspaceAccess } from "./users";
import { Id } from "./_generated/dataModel";

// =================================================================
// TAG MIGRATION HELPERS
// =================================================================

/**
 * Migrate card tags when a Pawkit slug changes.
 *
 * This runs inline (not scheduled) to avoid privacy gaps where cards
 * with the old slug could briefly appear in non-private views.
 *
 * IMPORTANT: We migrate ALL cards (including deleted/trashed) so that
 * restoring a trashed card doesn't leave it orphaned with the old slug.
 *
 * Performance note: This is O(n) over all cards since Convex can't
 * filter by array-contains. For most accounts this is fine. For very
 * large accounts (1000+ cards), may need to batch via action.
 *
 * @see docs/adr/0001-tags-canonical-membership.md
 */
async function migrateTagsForSlugChange(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  oldSlug: string,
  newSlug: string
): Promise<number> {
  // Get ALL cards for this workspace (including deleted/trashed)
  // This ensures restoring a trashed card won't leave it orphaned
  const [activeCards, deletedCards] = await Promise.all([
    ctx.db
      .query("cards")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId).eq("deleted", false)
      )
      .collect(),
    ctx.db
      .query("cards")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId).eq("deleted", true)
      )
      .collect(),
  ]);

  const allCards = [...activeCards, ...deletedCards];
  const now = Date.now();
  let migratedCount = 0;

  for (const card of allCards) {
    // Check if card has the old slug tag
    if (card.tags.includes(oldSlug)) {
      // Replace old slug with new slug, then dedupe
      // Deduping handles edge case where card already has the new slug
      const newTags = [...new Set(
        card.tags.map((tag) => (tag === oldSlug ? newSlug : tag))
      )];
      await ctx.db.patch(card._id, { tags: newTags, updatedAt: now });
      migratedCount++;
    }
  }

  // TODO: For very large accounts (1000+ cards), consider batching
  // via an action to avoid mutation timeout. Add monitoring to
  // track migration times and optimize if needed.

  return migratedCount;
}

// =================================================================
// COLLECTION QUERIES
// =================================================================

/**
 * List all non-deleted collections for a workspace.
 * By default excludes private collections unless includePrivate is true.
 * Private collections are only visible in the sidebar (pawkits tree) and when navigating directly.
 */
export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
    includePrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, { workspaceId, includePrivate = false }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    const collections = await ctx.db
      .query("collections")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId).eq("deleted", false)
      )
      .collect();

    // Filter out private collections unless explicitly included
    if (!includePrivate) {
      return collections.filter((c) => !c.isPrivate);
    }

    return collections;
  },
});

/**
 * Get a single collection by ID.
 */
export const get = query({
  args: { id: v.id("collections") },
  handler: async (ctx, { id }) => {
    const collection = await ctx.db.get(id);
    if (!collection) return null;

    await requireWorkspaceAccess(ctx, collection.workspaceId);
    return collection;
  },
});

/**
 * Get a collection by slug.
 */
export const getBySlug = query({
  args: {
    workspaceId: v.id("workspaces"),
    slug: v.string(),
  },
  handler: async (ctx, { workspaceId, slug }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    return await ctx.db
      .query("collections")
      .withIndex("by_workspace_slug", (q) =>
        q.eq("workspaceId", workspaceId).eq("slug", slug)
      )
      .filter((q) => q.eq(q.field("deleted"), false))
      .unique();
  },
});

/**
 * List root collections (no parent).
 * By default excludes private collections unless includePrivate is true.
 */
export const listRoot = query({
  args: {
    workspaceId: v.id("workspaces"),
    includePrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, { workspaceId, includePrivate = false }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    const collections = await ctx.db
      .query("collections")
      .withIndex("by_workspace_parent", (q) =>
        q.eq("workspaceId", workspaceId).eq("parentId", undefined)
      )
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();

    if (!includePrivate) {
      return collections.filter((c) => !c.isPrivate);
    }

    return collections;
  },
});

/**
 * List child collections of a parent.
 * By default excludes private collections unless includePrivate is true.
 */
export const listChildren = query({
  args: {
    workspaceId: v.id("workspaces"),
    parentId: v.id("collections"),
    includePrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, { workspaceId, parentId, includePrivate = false }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    const collections = await ctx.db
      .query("collections")
      .withIndex("by_workspace_parent", (q) =>
        q.eq("workspaceId", workspaceId).eq("parentId", parentId)
      )
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();

    if (!includePrivate) {
      return collections.filter((c) => !c.isPrivate);
    }

    return collections;
  },
});

/**
 * List pinned collections.
 * By default excludes private collections unless includePrivate is true.
 */
export const listPinned = query({
  args: {
    workspaceId: v.id("workspaces"),
    includePrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, { workspaceId, includePrivate = false }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    const collections = await ctx.db
      .query("collections")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId).eq("deleted", false)
      )
      .filter((q) => q.eq(q.field("pinned"), true))
      .collect();

    if (!includePrivate) {
      return collections.filter((c) => !c.isPrivate);
    }

    return collections;
  },
});

/**
 * Get cards in a collection.
 */
export const getCards = query({
  args: { collectionId: v.id("collections") },
  handler: async (ctx, { collectionId }) => {
    const collection = await ctx.db.get(collectionId);
    if (!collection) return [];

    await requireWorkspaceAccess(ctx, collection.workspaceId);

    const collectionNotes = await ctx.db
      .query("collectionNotes")
      .withIndex("by_collection", (q) => q.eq("collectionId", collectionId))
      .collect();

    // Fetch cards and sort by position
    const cards = await Promise.all(
      collectionNotes.map(async (note) => {
        const card = await ctx.db.get(note.cardId);
        return card && !card.deleted && card.workspaceId === collection.workspaceId
          ? { ...card, _position: note.position }
          : null;
      })
    );

    return cards
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => a._position - b._position);
  },
});

/**
 * Get collection hierarchy (collection with ancestors).
 */
export const getHierarchy = query({
  args: { collectionId: v.id("collections") },
  handler: async (ctx, { collectionId }) => {
    const collection = await ctx.db.get(collectionId);
    if (!collection) return null;

    await requireWorkspaceAccess(ctx, collection.workspaceId);

    // Build ancestor chain
    const ancestors: typeof collection[] = [];
    let current = collection;

    while (current.parentId) {
      const parent = await ctx.db.get(current.parentId);
      if (!parent) break;
      ancestors.unshift(parent);
      current = parent;
    }

    return { collection, ancestors };
  },
});

// =================================================================
// COLLECTION MUTATIONS
// =================================================================

/**
 * Generate a unique slug for a collection.
 */
async function generateUniqueSlug(
  ctx: { db: { query: Function } },
  workspaceId: Id<"workspaces">,
  name: string,
  excludeId?: Id<"collections">
): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  let slug = baseSlug;
  let counter = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Build query with proper filter construction
    // Convex doesn't support `true` as a filter expression, so we conditionally add filters
    const candidates = await (ctx.db as any)
      .query("collections")
      .withIndex("by_workspace_slug", (q: any) =>
        q.eq("workspaceId", workspaceId).eq("slug", slug)
      )
      .filter((q: any) => q.eq(q.field("deleted"), false))
      .collect();

    // If excludeId is provided, filter it out in JavaScript
    const existing = excludeId
      ? candidates.find((c: { _id: Id<"collections"> }) => c._id !== excludeId)
      : candidates[0];

    if (!existing) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Create a new collection (Pawkit).
 */
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    parentId: v.optional(v.id("collections")),
    icon: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
    isSystem: v.optional(v.boolean()),
    coverImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, args.workspaceId);

    const now = Date.now();

    // Generate unique slug
    const slug = await generateUniqueSlug(ctx, args.workspaceId, args.name);

    // Get next position
    const siblings = await ctx.db
      .query("collections")
      .withIndex("by_workspace_parent", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("parentId", args.parentId)
      )
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();

    const maxPosition = siblings.length > 0
      ? Math.max(...siblings.map((c) => c.position))
      : -1;

    const collectionId = await ctx.db.insert("collections", {
      workspaceId: args.workspaceId,
      name: args.name,
      slug,
      parentId: args.parentId,
      position: maxPosition + 1,
      icon: args.icon,
      coverImage: args.coverImage,
      isPrivate: args.isPrivate || false,
      isSystem: args.isSystem || false,
      hidePreview: false,
      useCoverAsBackground: false,
      pinned: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    });

    return collectionId;
  },
});

/**
 * Update a collection.
 */
export const update = mutation({
  args: {
    id: v.id("collections"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    coverImagePosition: v.optional(v.number()),
    coverImageHeight: v.optional(v.number()),
    coverContentOffset: v.optional(v.number()),
    isPrivate: v.optional(v.boolean()),
    hidePreview: v.optional(v.boolean()),
    useCoverAsBackground: v.optional(v.boolean()),
    pinned: v.optional(v.boolean()),
    boardMetadata: v.optional(v.any()),
    parentId: v.optional(v.id("collections")),
    position: v.optional(v.number()),
  },
  handler: async (ctx, { id, name, ...updates }) => {
    const collection = await ctx.db.get(id);
    if (!collection) throw new Error("Collection not found");

    await requireWorkspaceAccess(ctx, collection.workspaceId);

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };

    // Track if slug is changing (for tag migration)
    const oldSlug = collection.slug;
    let newSlug: string | undefined;

    // Handle name change (requires slug update)
    if (name !== undefined && name !== collection.name) {
      filteredUpdates.name = name;
      newSlug = await generateUniqueSlug(
        ctx,
        collection.workspaceId,
        name,
        id
      );
      filteredUpdates.slug = newSlug;
    }

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(id, filteredUpdates);

    // CRITICAL: Migrate card tags when slug changes
    // This must run inline (not scheduled) to avoid privacy gaps
    // where cards with the old slug could briefly appear in non-private views.
    // @see docs/adr/0001-tags-canonical-membership.md
    if (newSlug && newSlug !== oldSlug) {
      await migrateTagsForSlugChange(ctx, collection.workspaceId, oldSlug, newSlug);
    }

    return await ctx.db.get(id);
  },
});

/**
 * Delete a collection (soft delete).
 */
export const remove = mutation({
  args: { id: v.id("collections") },
  handler: async (ctx, { id }) => {
    const collection = await ctx.db.get(id);
    if (!collection) throw new Error("Collection not found");

    await requireWorkspaceAccess(ctx, collection.workspaceId);

    await ctx.db.patch(id, {
      deleted: true,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Restore a deleted collection.
 */
export const restore = mutation({
  args: { id: v.id("collections") },
  handler: async (ctx, { id }) => {
    const collection = await ctx.db.get(id);
    if (!collection) throw new Error("Collection not found");

    await requireWorkspaceAccess(ctx, collection.workspaceId);

    await ctx.db.patch(id, {
      deleted: false,
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Permanently delete a collection.
 */
export const permanentDelete = mutation({
  args: { id: v.id("collections") },
  handler: async (ctx, { id }) => {
    const collection = await ctx.db.get(id);
    if (!collection) throw new Error("Collection not found");

    await requireWorkspaceAccess(ctx, collection.workspaceId);

    // Delete collection notes
    const collectionNotes = await ctx.db
      .query("collectionNotes")
      .withIndex("by_collection", (q) => q.eq("collectionId", id))
      .collect();

    for (const note of collectionNotes) {
      await ctx.db.delete(note._id);
    }

    // Delete the collection
    await ctx.db.delete(id);
  },
});

/**
 * Add a card to a collection.
 *
 * This mutation keeps tags and collectionNotes in sync:
 * - Adds a collectionNotes entry for ordering
 * - Adds the collection slug to card.tags for membership
 *
 * @see docs/adr/0001-tags-canonical-membership.md
 */
export const addCard = mutation({
  args: {
    collectionId: v.id("collections"),
    cardId: v.id("cards"),
    position: v.optional(v.number()),
  },
  handler: async (ctx, { collectionId, cardId, position }) => {
    const collection = await ctx.db.get(collectionId);
    if (!collection) throw new Error("Collection not found");

    await requireWorkspaceAccess(ctx, collection.workspaceId);

    const card = await ctx.db.get(cardId);
    if (!card) {
      throw new Error("Card not found");
    }
    if (card.workspaceId !== collection.workspaceId) {
      throw new Error("Card does not belong to this workspace");
    }

    // Check if already in collection (via collectionNotes)
    const existing = await ctx.db
      .query("collectionNotes")
      .withIndex("by_collection_card", (q) =>
        q.eq("collectionId", collectionId).eq("cardId", cardId)
      )
      .unique();

    const now = Date.now();

    // Add collection slug to card tags (deduplicated)
    // Tags are canonical for membership - this keeps both systems in sync
    if (!card.tags.includes(collection.slug)) {
      await ctx.db.patch(cardId, {
        tags: [...card.tags, collection.slug],
        updatedAt: now,
      });
    }

    if (existing) return existing._id;

    // Get max position if not specified
    let pos = position;
    if (pos === undefined) {
      const notes = await ctx.db
        .query("collectionNotes")
        .withIndex("by_collection", (q) => q.eq("collectionId", collectionId))
        .collect();
      pos = notes.length > 0 ? Math.max(...notes.map((n) => n.position)) + 1 : 0;
    }

    return await ctx.db.insert("collectionNotes", {
      collectionId,
      cardId,
      position: pos,
      createdAt: now,
    });
  },
});

/**
 * Remove a card from a collection.
 *
 * This mutation keeps tags and collectionNotes in sync:
 * - Removes the collectionNotes entry
 * - Removes only the collection slug from card.tags (preserves other tags)
 *
 * @see docs/adr/0001-tags-canonical-membership.md
 */
export const removeCard = mutation({
  args: {
    collectionId: v.id("collections"),
    cardId: v.id("cards"),
  },
  handler: async (ctx, { collectionId, cardId }) => {
    const collection = await ctx.db.get(collectionId);
    if (!collection) throw new Error("Collection not found");

    await requireWorkspaceAccess(ctx, collection.workspaceId);

    const now = Date.now();

    // Remove collection slug from card tags (preserves all other tags)
    // Tags are canonical for membership - this keeps both systems in sync
    const card = await ctx.db.get(cardId);
    if (card && card.tags.includes(collection.slug)) {
      const newTags = card.tags.filter((tag) => tag !== collection.slug);
      await ctx.db.patch(cardId, { tags: newTags, updatedAt: now });
    }

    // Remove collectionNotes entry
    const collectionNote = await ctx.db
      .query("collectionNotes")
      .withIndex("by_collection_card", (q) =>
        q.eq("collectionId", collectionId).eq("cardId", cardId)
      )
      .unique();

    if (collectionNote) {
      await ctx.db.delete(collectionNote._id);
    }
  },
});

/**
 * Reorder cards in a collection.
 */
export const reorderCards = mutation({
  args: {
    collectionId: v.id("collections"),
    cardIds: v.array(v.id("cards")),
  },
  handler: async (ctx, { collectionId, cardIds }) => {
    const collection = await ctx.db.get(collectionId);
    if (!collection) throw new Error("Collection not found");

    await requireWorkspaceAccess(ctx, collection.workspaceId);

    // Update positions for each card
    for (let i = 0; i < cardIds.length; i++) {
      const collectionNote = await ctx.db
        .query("collectionNotes")
        .withIndex("by_collection_card", (q) =>
          q.eq("collectionId", collectionId).eq("cardId", cardIds[i])
        )
        .unique();

      if (collectionNote) {
        await ctx.db.patch(collectionNote._id, { position: i });
      }
    }
  },
});

/**
 * Move collection to a new parent.
 */
export const move = mutation({
  args: {
    id: v.id("collections"),
    newParentId: v.optional(v.id("collections")),
    position: v.optional(v.number()),
  },
  handler: async (ctx, { id, newParentId, position }) => {
    const collection = await ctx.db.get(id);
    if (!collection) throw new Error("Collection not found");

    await requireWorkspaceAccess(ctx, collection.workspaceId);

    // Prevent circular reference
    if (newParentId) {
      let current = await ctx.db.get(newParentId);
      while (current) {
        if (current._id === id) {
          throw new Error("Cannot move collection into itself or its descendants");
        }
        if (!current.parentId) break;
        current = await ctx.db.get(current.parentId);
      }
    }

    // Get position if not specified
    let pos = position;
    if (pos === undefined) {
      const siblings = await ctx.db
        .query("collections")
        .withIndex("by_workspace_parent", (q) =>
          q.eq("workspaceId", collection.workspaceId).eq("parentId", newParentId)
        )
        .filter((q) => q.eq(q.field("deleted"), false))
        .collect();
      pos = siblings.length > 0 ? Math.max(...siblings.map((c) => c.position)) + 1 : 0;
    }

    await ctx.db.patch(id, {
      parentId: newParentId,
      position: pos,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Reorder collections at the same level.
 */
export const reorder = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    parentId: v.optional(v.id("collections")),
    collectionIds: v.array(v.id("collections")),
  },
  handler: async (ctx, { workspaceId, collectionIds }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    // Verify each collection belongs to the workspace before patching
    for (let i = 0; i < collectionIds.length; i++) {
      const collection = await ctx.db.get(collectionIds[i]);
      if (!collection) {
        throw new Error(`Collection not found: ${collectionIds[i]}`);
      }
      if (collection.workspaceId !== workspaceId) {
        throw new Error("Unauthorized: collection does not belong to this workspace");
      }

      await ctx.db.patch(collectionIds[i], {
        position: i,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Get slugs of private collections.
 * Used by client to filter out cards that belong to private collections.
 */
export const listPrivateSlugs = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, { workspaceId }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    const privateCollections = await ctx.db
      .query("collections")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId).eq("deleted", false)
      )
      .filter((q) => q.eq(q.field("isPrivate"), true))
      .collect();

    return privateCollections.map((c) => c.slug);
  },
});

// =================================================================
// INTERNAL QUERIES (for HTTP endpoints)
// =================================================================

/**
 * List collections by workspace ID.
 * Internal query - only callable from HTTP actions.
 */
export const listByWorkspace = internalQuery({
  args: { workspaceId: v.string() },
  handler: async (ctx, { workspaceId }) => {
    return await ctx.db
      .query("collections")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId as Id<"workspaces">).eq("deleted", false)
      )
      .collect();
  },
});
