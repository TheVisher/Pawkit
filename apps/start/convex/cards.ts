import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { requireWorkspaceAccess } from "./users";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// =================================================================
// CONTENT HELPERS
// =================================================================

function extractTextFromPlateNode(node: unknown, parts: string[]): void {
  if (!node || typeof node !== "object") return;

  const record = node as Record<string, unknown>;
  if (typeof record.text === "string") {
    parts.push(record.text);
  }

  const children = record.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      extractTextFromPlateNode(child, parts);
    }
  }
}

function extractTextFromPlateContent(content: unknown): string {
  if (!Array.isArray(content)) return "";

  const parts: string[] = [];
  for (const node of content) {
    extractTextFromPlateNode(node, parts);
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function tryParseJsonArray(value: string): unknown[] | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[")) return null;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getContentText(content: unknown): string {
  if (!content) return "";

  if (Array.isArray(content)) {
    return extractTextFromPlateContent(content);
  }

  if (typeof content === "string") {
    const parsed = tryParseJsonArray(content);
    if (parsed) {
      return extractTextFromPlateContent(parsed);
    }
    return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  return "";
}

// =================================================================
// CARD QUERIES
// =================================================================

/**
 * List all non-deleted cards for a workspace.
 */
export const list = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    return await ctx.db
      .query("cards")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId).eq("deleted", false)
      )
      .collect();
  },
});

/**
 * List cards with pagination (cursor-based).
 */
export const listPaginated = query({
  args: {
    workspaceId: v.id("workspaces"),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { workspaceId, cursor, limit = 50 }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    const results = await ctx.db
      .query("cards")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId).eq("deleted", false)
      )
      .paginate({ cursor: cursor ?? null, numItems: limit });

    return {
      cards: results.page,
      nextCursor: results.continueCursor,
      isDone: results.isDone,
    };
  },
});

/**
 * Get a single card by ID.
 */
export const get = query({
  args: { id: v.id("cards") },
  handler: async (ctx, { id }) => {
    const card = await ctx.db.get(id);
    if (!card) return null;

    await requireWorkspaceAccess(ctx, card.workspaceId);
    return card;
  },
});

/**
 * List pinned cards for a workspace.
 */
export const listPinned = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    return await ctx.db
      .query("cards")
      .withIndex("by_workspace_pinned", (q) =>
        q.eq("workspaceId", workspaceId).eq("pinned", true)
      )
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();
  },
});

/**
 * List cards by type (url, md-note, etc.).
 */
export const listByType = query({
  args: {
    workspaceId: v.id("workspaces"),
    type: v.string(),
  },
  handler: async (ctx, { workspaceId, type }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    return await ctx.db
      .query("cards")
      .withIndex("by_workspace_type", (q) =>
        q.eq("workspaceId", workspaceId).eq("type", type)
      )
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();
  },
});

/**
 * List cards scheduled for a specific date.
 */
export const listByScheduledDate = query({
  args: {
    workspaceId: v.id("workspaces"),
    date: v.string(),
  },
  handler: async (ctx, { workspaceId, date }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    return await ctx.db
      .query("cards")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId).eq("deleted", false)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("deleted"), false),
          q.or(
            // Check if scheduledDates array contains the date
            // Since Convex doesn't support array contains in filters,
            // we need to check this in post-processing
            q.neq(q.field("scheduledDates"), [])
          )
        )
      )
      .collect()
      .then((cards) =>
        cards.filter((card) => card.scheduledDates.includes(date))
      );
  },
});

/**
 * Search cards by title, description, or content.
 * Combines results from multiple search indexes.
 */
export const search = query({
  args: {
    workspaceId: v.id("workspaces"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { workspaceId, query: searchQuery, limit = 20 }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    // Search across all three indexes
    const [titleResults, descResults, contentResults] = await Promise.all([
      ctx.db
        .query("cards")
        .withSearchIndex("search_by_title", (q) =>
          q
            .search("title", searchQuery)
            .eq("workspaceId", workspaceId)
            .eq("deleted", false)
        )
        .take(limit),
      ctx.db
        .query("cards")
        .withSearchIndex("search_by_description", (q) =>
          q
            .search("description", searchQuery)
            .eq("workspaceId", workspaceId)
            .eq("deleted", false)
        )
        .take(limit),
      ctx.db
        .query("cards")
        .withSearchIndex("search_by_content", (q) =>
          q
            .search("contentText", searchQuery)
            .eq("workspaceId", workspaceId)
            .eq("deleted", false)
        )
        .take(limit),
    ]);

    // Deduplicate and merge results
    const seen = new Set<Id<"cards">>();
    const merged = [];

    for (const card of [...titleResults, ...descResults, ...contentResults]) {
      if (!seen.has(card._id)) {
        seen.add(card._id);
        merged.push(card);
        if (merged.length >= limit) break;
      }
    }

    return merged;
  },
});

/**
 * List deleted cards (trash).
 */
export const listDeleted = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    return await ctx.db
      .query("cards")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId).eq("deleted", true)
      )
      .collect();
  },
});

/**
 * Get daily note for a specific date.
 */
export const getDailyNote = query({
  args: {
    workspaceId: v.id("workspaces"),
    date: v.string(),
  },
  handler: async (ctx, { workspaceId, date }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_workspace_daily", (q) =>
        q.eq("workspaceId", workspaceId).eq("isDailyNote", true)
      )
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();

    // Daily notes use the date as their title
    return cards.find((card) => card.title === date) || null;
  },
});

// =================================================================
// CARD MUTATIONS
// =================================================================

/**
 * Create a new card.
 */
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    type: v.string(),
    url: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    content: v.optional(v.any()),
    contentText: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    pinned: v.optional(v.boolean()),
    scheduledDates: v.optional(v.array(v.string())),
    scheduledStartTime: v.optional(v.string()),
    scheduledEndTime: v.optional(v.string()),
    isDailyNote: v.optional(v.boolean()),
    image: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    favicon: v.optional(v.string()),
    domain: v.optional(v.string()),
    metadata: v.optional(v.any()),
    isFileCard: v.optional(v.boolean()),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, args.workspaceId);

    const now = Date.now();
    const contentText =
      args.content !== undefined ? getContentText(args.content) : args.contentText || "";
    const cardId = await ctx.db.insert("cards", {
      workspaceId: args.workspaceId,
      type: args.type,
      url: args.url,
      title: args.title,
      description: args.description,
      content: args.content,
      contentText,
      notes: args.notes,
      tags: args.tags || [],
      pinned: args.pinned || false,
      scheduledDates: args.scheduledDates || [],
      scheduledStartTime: args.scheduledStartTime,
      scheduledEndTime: args.scheduledEndTime,
      isDailyNote: args.isDailyNote || false,
      image: args.image,
      images: args.images,
      favicon: args.favicon,
      domain: args.domain,
      metadata: args.metadata,
      status: "PENDING",
      isFileCard: args.isFileCard ?? false,
      storageId: args.storageId,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    });

    // Schedule metadata scraping for URL cards
    if (args.type === "url" && args.url) {
      await ctx.scheduler.runAfter(0, internal.metadata.scrape, { cardId });
    }

    return cardId;
  },
});

/**
 * Update a card.
 */
export const update = mutation({
  args: {
    id: v.id("cards"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    content: v.optional(v.any()),
    contentText: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    pinned: v.optional(v.boolean()),
    scheduledDates: v.optional(v.array(v.string())),
    scheduledStartTime: v.optional(v.string()),
    scheduledEndTime: v.optional(v.string()),
    url: v.optional(v.string()),
    image: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    favicon: v.optional(v.string()),
    domain: v.optional(v.string()),
    articleContent: v.optional(v.string()),
    articleContentEdited: v.optional(v.boolean()),
    summary: v.optional(v.string()),
    summaryType: v.optional(v.string()),
    metadata: v.optional(v.any()),
    status: v.optional(v.string()),
    structuredData: v.optional(v.any()),
    source: v.optional(v.any()),
    convertedToTodo: v.optional(v.boolean()),
    dismissedTodoSuggestion: v.optional(v.boolean()),
    wordCount: v.optional(v.number()),
    readingTime: v.optional(v.number()),
    readProgress: v.optional(v.number()),
    isRead: v.optional(v.boolean()),
    lastScrollPosition: v.optional(v.number()),
    manuallyMarkedUnread: v.optional(v.boolean()),
    linkStatus: v.optional(v.string()),
    lastLinkCheck: v.optional(v.number()),
    redirectUrl: v.optional(v.string()),
    headerGradientColor: v.optional(v.string()),
    headerImagePosition: v.optional(v.number()),
    dominantColor: v.optional(v.string()),
    aspectRatio: v.optional(v.number()),
    blurDataUri: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const card = await ctx.db.get(id);
    if (!card) throw new Error("Card not found");

    await requireWorkspaceAccess(ctx, card.workspaceId);

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    if (updates.content !== undefined) {
      filteredUpdates.contentText = getContentText(updates.content);
    }

    await ctx.db.patch(id, filteredUpdates);
    return await ctx.db.get(id);
  },
});

/**
 * Delete a card (soft delete).
 */
export const remove = mutation({
  args: { id: v.id("cards") },
  handler: async (ctx, { id }) => {
    const card = await ctx.db.get(id);
    if (!card) throw new Error("Card not found");

    await requireWorkspaceAccess(ctx, card.workspaceId);

    await ctx.db.patch(id, {
      deleted: true,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Restore a deleted card.
 */
export const restore = mutation({
  args: { id: v.id("cards") },
  handler: async (ctx, { id }) => {
    const card = await ctx.db.get(id);
    if (!card) throw new Error("Card not found");

    await requireWorkspaceAccess(ctx, card.workspaceId);

    await ctx.db.patch(id, {
      deleted: false,
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Permanently delete a card (hard delete).
 */
export const permanentDelete = mutation({
  args: { id: v.id("cards") },
  handler: async (ctx, { id }) => {
    const card = await ctx.db.get(id);
    if (!card) throw new Error("Card not found");

    await requireWorkspaceAccess(ctx, card.workspaceId);

    // Delete associated collection notes
    const collectionNotes = await ctx.db
      .query("collectionNotes")
      .withIndex("by_card", (q) => q.eq("cardId", id))
      .collect();

    for (const note of collectionNotes) {
      await ctx.db.delete(note._id);
    }

    // Delete associated references
    const references = await ctx.db
      .query("references")
      .withIndex("by_source", (q) => q.eq("sourceId", id))
      .collect();

    for (const ref of references) {
      await ctx.db.delete(ref._id);
    }

    // Delete associated backlinks (incoming references)
    const backlinks = await ctx.db
      .query("references")
      .withIndex("by_target", (q) => q.eq("targetId", id).eq("targetType", "card"))
      .collect();

    for (const ref of backlinks) {
      await ctx.db.delete(ref._id);
    }

    if (card.storageId) {
      await ctx.storage.delete(card.storageId);
    }

    // Delete the card
    await ctx.db.delete(id);
  },
});

/**
 * Empty trash (permanently delete all deleted cards).
 */
export const emptyTrash = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    const deletedCards = await ctx.db
      .query("cards")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId).eq("deleted", true)
      )
      .collect();

    for (const card of deletedCards) {
      // Delete associated collection notes
      const collectionNotes = await ctx.db
        .query("collectionNotes")
        .withIndex("by_card", (q) => q.eq("cardId", card._id))
        .collect();

      for (const note of collectionNotes) {
        await ctx.db.delete(note._id);
      }

      // Delete associated references
      const references = await ctx.db
        .query("references")
        .withIndex("by_source", (q) => q.eq("sourceId", card._id))
        .collect();

      for (const ref of references) {
        await ctx.db.delete(ref._id);
      }

      // Delete associated backlinks (incoming references)
      const backlinks = await ctx.db
        .query("references")
        .withIndex("by_target", (q) =>
          q.eq("targetId", card._id).eq("targetType", "card")
        )
        .collect();

      for (const ref of backlinks) {
        await ctx.db.delete(ref._id);
      }

      if (card.storageId) {
        await ctx.storage.delete(card.storageId);
      }

      // Delete the card
      await ctx.db.delete(card._id);
    }

    return { deleted: deletedCards.length };
  },
});

/**
 * Bulk update tags for multiple cards.
 */
export const bulkUpdateTags = mutation({
  args: {
    cardIds: v.array(v.id("cards")),
    addTags: v.optional(v.array(v.string())),
    removeTags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { cardIds, addTags = [], removeTags = [] }) => {
    const now = Date.now();

    for (const cardId of cardIds) {
      const card = await ctx.db.get(cardId);
      if (!card) continue;

      await requireWorkspaceAccess(ctx, card.workspaceId);

      let newTags = card.tags;

      // Remove tags
      if (removeTags.length > 0) {
        newTags = newTags.filter((tag) => !removeTags.includes(tag));
      }

      // Add tags (avoid duplicates)
      if (addTags.length > 0) {
        const tagsToAdd = addTags.filter((tag) => !newTags.includes(tag));
        newTags = [...newTags, ...tagsToAdd];
      }

      await ctx.db.patch(cardId, { tags: newTags, updatedAt: now });
    }
  },
});

/**
 * Bulk delete cards (soft delete).
 */
export const bulkDelete = mutation({
  args: { cardIds: v.array(v.id("cards")) },
  handler: async (ctx, { cardIds }) => {
    const now = Date.now();

    for (const cardId of cardIds) {
      const card = await ctx.db.get(cardId);
      if (!card) continue;

      await requireWorkspaceAccess(ctx, card.workspaceId);

      await ctx.db.patch(cardId, {
        deleted: true,
        deletedAt: now,
        updatedAt: now,
      });
    }
  },
});

// =================================================================
// INTERNAL FUNCTIONS (for scheduled jobs and internal use)
// =================================================================

/**
 * Internal query to get card without auth check (for background jobs).
 */
export const getInternal = internalQuery({
  args: { cardId: v.id("cards") },
  handler: async (ctx, { cardId }) => {
    return await ctx.db.get(cardId);
  },
});

/**
 * Internal mutation to update card metadata (for background jobs).
 */
export const updateMetadata = internalMutation({
  args: {
    cardId: v.id("cards"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    favicon: v.optional(v.string()),
    domain: v.optional(v.string()),
    status: v.optional(v.string()),
    articleContent: v.optional(v.string()),
    wordCount: v.optional(v.number()),
    readingTime: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, { cardId, ...updates }) => {
    const card = await ctx.db.get(cardId);
    if (!card) return;

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(cardId, filteredUpdates);
  },
});

/**
 * Internal mutation to update link status (for link checking jobs).
 */
export const updateLinkStatus = internalMutation({
  args: {
    cardId: v.id("cards"),
    linkStatus: v.string(),
    lastLinkCheck: v.number(),
    redirectUrl: v.optional(v.string()),
  },
  handler: async (ctx, { cardId, linkStatus, lastLinkCheck, redirectUrl }) => {
    const card = await ctx.db.get(cardId);
    if (!card) return;

    await ctx.db.patch(cardId, {
      linkStatus,
      lastLinkCheck,
      redirectUrl,
      updatedAt: Date.now(),
    });
  },
});
