import {
  query,
  mutation,
  internalQuery,
  internalMutation,
  MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { requireWorkspaceAccess } from "./users";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { validateExternalUrl } from "./urlValidation";

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
// CALENDAR EVENT CLEANUP
// =================================================================

async function softDeleteCardEvents(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  cardIds: Set<Id<"cards">>
): Promise<number> {
  const cardIdSet = new Set(Array.from(cardIds, (id) => String(id)));
  const events = await ctx.db
    .query("calendarEvents")
    .withIndex("by_workspace", (q: any) => q.eq("workspaceId", workspaceId))
    .collect();

  const now = Date.now();
  let deletedCount = 0;

  for (const event of events) {
    if (event.deleted) continue;
    const source = event.source;
    const parsedSource =
      typeof source === "string"
        ? (() => {
            try {
              return JSON.parse(source) as Record<string, unknown>;
            } catch {
              return null;
            }
          })()
        : source;
    const sourceRecord = (parsedSource && typeof parsedSource === "object"
      ? (parsedSource as Record<string, unknown>)
      : null);
    const sourceType =
      typeof sourceRecord?.type === "string" ? sourceRecord.type.toLowerCase() : null;
    const rawCardId = sourceRecord?.cardId;
    const normalizedCardId =
      typeof rawCardId === "string"
        ? rawCardId
        : rawCardId && typeof rawCardId === "object"
          ? (() => {
              const maybeId = (rawCardId as Record<string, unknown>)._id
                ?? (rawCardId as Record<string, unknown>).id;
              return typeof maybeId === "string" ? maybeId : null;
            })()
          : null;
    if (sourceType === "card" && normalizedCardId && cardIdSet.has(normalizedCardId)) {
      await ctx.db.patch(event._id, {
        deleted: true,
        deletedAt: now,
        updatedAt: now,
      });
      deletedCount++;
    }
  }

  return deletedCount;
}

// =================================================================
// PRIVATE COLLECTION HELPERS
// =================================================================

/**
 * Get the set of slugs for private collections.
 * In Pawkit, cards are associated with collections via tags that match collection slugs.
 * So to filter private cards, we need to check if card.tags includes any private collection slug.
 */
async function getPrivateCollectionSlugs(
  ctx: { db: { query: Function } },
  workspaceId: Id<"workspaces">
): Promise<Set<string>> {
  // Get all private collections for this workspace
  const privateCollections = await (ctx.db as any)
    .query("collections")
    .withIndex("by_workspace_deleted", (q: any) =>
      q.eq("workspaceId", workspaceId).eq("deleted", false)
    )
    .filter((q: any) => q.eq(q.field("isPrivate"), true))
    .collect();

  return new Set(privateCollections.map((c: { slug: string }) => c.slug));
}

/**
 * Get the set of all collection slugs (Pawkit slugs) for a workspace.
 * These slugs are reserved tags and should not be modified through generic tag operations.
 * Membership should only be changed via addCard/removeCard in collections.ts.
 * @see docs/adr/0001-tags-canonical-membership.md
 */
async function getPawkitSlugs(
  ctx: { db: { query: Function } },
  workspaceId: Id<"workspaces">
): Promise<Set<string>> {
  const collections = await (ctx.db as any)
    .query("collections")
    .withIndex("by_workspace_deleted", (q: any) =>
      q.eq("workspaceId", workspaceId).eq("deleted", false)
    )
    .collect();

  return new Set(collections.map((c: { slug: string }) => c.slug));
}

/**
 * Filter out Pawkit slugs from a list of tags.
 * Returns only the non-reserved tags.
 */
function filterOutPawkitSlugs(tags: string[], pawkitSlugs: Set<string>): string[] {
  return tags.filter((tag) => !pawkitSlugs.has(tag));
}

/**
 * Check if a card belongs to a private collection.
 * Cards belong to collections via tags matching collection slugs.
 */
function isCardInPrivateCollection(
  card: { tags: string[] },
  privateSlugs: Set<string>
): boolean {
  if (privateSlugs.size === 0) return false;
  return card.tags.some((tag) => privateSlugs.has(tag));
}

// =================================================================
// CARD QUERIES
// =================================================================

/**
 * List all non-deleted cards for a workspace.
 * By default excludes cards that belong to private collections (via tags).
 */
export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
    includePrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, { workspaceId, includePrivate = false }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId).eq("deleted", false)
      )
      .collect();

    // Filter out cards in private collections unless explicitly included
    if (!includePrivate) {
      const privateSlugs = await getPrivateCollectionSlugs(ctx, workspaceId);
      if (privateSlugs.size > 0) {
        return cards.filter((card) => !isCardInPrivateCollection(card, privateSlugs));
      }
    }

    return cards;
  },
});

/**
 * List cards with pagination (cursor-based).
 * By default excludes cards in private collections (via tags).
 * Note: When filtering, pagination may return fewer items than limit.
 */
export const listPaginated = query({
  args: {
    workspaceId: v.id("workspaces"),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    includePrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, { workspaceId, cursor, limit = 50, includePrivate = false }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    // Fetch more than needed since we may filter some out
    const fetchLimit = includePrivate ? limit : limit * 2;

    const results = await ctx.db
      .query("cards")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId).eq("deleted", false)
      )
      .paginate({ cursor: cursor ?? null, numItems: fetchLimit });

    let cards = results.page;

    // Filter out cards in private collections unless explicitly included
    if (!includePrivate) {
      const privateSlugs = await getPrivateCollectionSlugs(ctx, workspaceId);
      if (privateSlugs.size > 0) {
        cards = cards.filter((card) => !isCardInPrivateCollection(card, privateSlugs));
      }
    }

    return {
      cards: cards.slice(0, limit),
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
 * By default excludes cards in private collections (via tags).
 */
export const listPinned = query({
  args: {
    workspaceId: v.id("workspaces"),
    includePrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, { workspaceId, includePrivate = false }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_workspace_pinned", (q) =>
        q.eq("workspaceId", workspaceId).eq("pinned", true)
      )
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();

    if (!includePrivate) {
      const privateSlugs = await getPrivateCollectionSlugs(ctx, workspaceId);
      if (privateSlugs.size > 0) {
        return cards.filter((card) => !isCardInPrivateCollection(card, privateSlugs));
      }
    }

    return cards;
  },
});

/**
 * List cards by type (url, md-note, etc.).
 * By default excludes cards in private collections (via tags).
 */
export const listByType = query({
  args: {
    workspaceId: v.id("workspaces"),
    type: v.string(),
    includePrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, { workspaceId, type, includePrivate = false }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_workspace_type", (q) =>
        q.eq("workspaceId", workspaceId).eq("type", type)
      )
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();

    if (!includePrivate) {
      const privateSlugs = await getPrivateCollectionSlugs(ctx, workspaceId);
      if (privateSlugs.size > 0) {
        return cards.filter((card) => !isCardInPrivateCollection(card, privateSlugs));
      }
    }

    return cards;
  },
});

/**
 * List cards scheduled for a specific date.
 * By default excludes cards in private collections (via tags).
 */
export const listByScheduledDate = query({
  args: {
    workspaceId: v.id("workspaces"),
    date: v.string(),
    includePrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, { workspaceId, date, includePrivate = false }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    let cards = await ctx.db
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
      .collect();

    // Filter by scheduled date
    cards = cards.filter((card) => card.scheduledDates.includes(date));

    // Filter out cards in private collections unless explicitly included
    if (!includePrivate) {
      const privateSlugs = await getPrivateCollectionSlugs(ctx, workspaceId);
      if (privateSlugs.size > 0) {
        cards = cards.filter((card) => !isCardInPrivateCollection(card, privateSlugs));
      }
    }

    return cards;
  },
});

/**
 * Search cards by title, description, or content.
 * Combines results from multiple search indexes.
 * By default excludes cards in private collections (via tags).
 */
export const search = query({
  args: {
    workspaceId: v.id("workspaces"),
    query: v.string(),
    limit: v.optional(v.number()),
    includePrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, { workspaceId, query: searchQuery, limit = 20, includePrivate = false }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    // Fetch more than needed since we may filter some out
    const fetchLimit = includePrivate ? limit : limit * 2;

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
        .take(fetchLimit),
      ctx.db
        .query("cards")
        .withSearchIndex("search_by_description", (q) =>
          q
            .search("description", searchQuery)
            .eq("workspaceId", workspaceId)
            .eq("deleted", false)
        )
        .take(fetchLimit),
      ctx.db
        .query("cards")
        .withSearchIndex("search_by_content", (q) =>
          q
            .search("contentText", searchQuery)
            .eq("workspaceId", workspaceId)
            .eq("deleted", false)
        )
        .take(fetchLimit),
    ]);

    // Get private collection slugs for filtering
    const privateSlugs = includePrivate
      ? new Set<string>()
      : await getPrivateCollectionSlugs(ctx, workspaceId);

    // Deduplicate and merge results, filtering private cards
    const seen = new Set<Id<"cards">>();
    const merged = [];

    for (const card of [...titleResults, ...descResults, ...contentResults]) {
      if (!seen.has(card._id) && !isCardInPrivateCollection(card, privateSlugs)) {
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

    // SSRF protection: Validate URL before creating card
    if (args.url && args.type === "url") {
      const validated = validateExternalUrl(args.url);
      if (!validated.ok) {
        throw new Error(validated.error);
      }
    }

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
      await ctx.scheduler.runAfter(1000, internal.metadata.scrapeArticle, { cardId });
    }

    return cardId;
  },
});

/**
 * Update a card.
 * NOTE: Tag updates through this mutation will preserve Pawkit membership tags.
 * Pawkit slugs are reserved tags - use collections.addCard/removeCard to change membership.
 * @see docs/adr/0001-tags-canonical-membership.md
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

    // Protect Pawkit membership tags from being removed through generic tag updates.
    // If tags are being updated, preserve any Pawkit slugs that were in the original tags.
    // This prevents accidental membership changes through the tag editor.
    if (updates.tags !== undefined) {
      const pawkitSlugs = await getPawkitSlugs(ctx, card.workspaceId);

      // Get Pawkit slugs currently on this card (these represent membership)
      const existingPawkitTags = card.tags.filter((tag) => pawkitSlugs.has(tag));

      // Filter out any Pawkit slugs from the new tags (user can't add/remove membership this way)
      const newNonPawkitTags = filterOutPawkitSlugs(updates.tags, pawkitSlugs);

      // Combine: keep existing Pawkit membership + new non-Pawkit tags
      filteredUpdates.tags = [...new Set([...existingPawkitTags, ...newNonPawkitTags])];
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

    await softDeleteCardEvents(ctx, card.workspaceId, new Set([id]));

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

    await softDeleteCardEvents(ctx, card.workspaceId, new Set([id]));

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

    const deletedCardIds = new Set<Id<"cards">>();

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

      deletedCardIds.add(card._id);

      // Delete the card
      await ctx.db.delete(card._id);
    }

    if (deletedCardIds.size > 0) {
      await softDeleteCardEvents(ctx, workspaceId, deletedCardIds);
    }

    return { deleted: deletedCards.length };
  },
});

/**
 * Bulk update tags for multiple cards.
 * NOTE: Pawkit slugs are protected - they cannot be added or removed through this mutation.
 * Use collections.addCard/removeCard to change Pawkit membership.
 * @see docs/adr/0001-tags-canonical-membership.md
 */
export const bulkUpdateTags = mutation({
  args: {
    cardIds: v.array(v.id("cards")),
    addTags: v.optional(v.array(v.string())),
    removeTags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { cardIds, addTags = [], removeTags = [] }) => {
    const now = Date.now();

    // We need to get Pawkit slugs once (assuming all cards are in same workspace)
    // Get the first card to determine workspace
    if (cardIds.length === 0) return;

    const firstCard = await ctx.db.get(cardIds[0]);
    if (!firstCard) return;

    await requireWorkspaceAccess(ctx, firstCard.workspaceId);

    // Get Pawkit slugs for this workspace
    const pawkitSlugs = await getPawkitSlugs(ctx, firstCard.workspaceId);

    // Filter out Pawkit slugs from add/remove lists
    // These are reserved tags that can only be modified through Pawkit UI
    const safeAddTags = filterOutPawkitSlugs(addTags, pawkitSlugs);
    const safeRemoveTags = filterOutPawkitSlugs(removeTags, pawkitSlugs);

    for (const cardId of cardIds) {
      const card = await ctx.db.get(cardId);
      if (!card) continue;

      // Guard: reject mixed workspaces to ensure Pawkit slug filtering is correct
      if (card.workspaceId !== firstCard.workspaceId) {
        throw new Error("bulkUpdateTags does not support cards from multiple workspaces");
      }

      let newTags = card.tags;

      // Remove tags (excluding Pawkit slugs)
      if (safeRemoveTags.length > 0) {
        newTags = newTags.filter((tag) => !safeRemoveTags.includes(tag));
      }

      // Add tags (excluding Pawkit slugs, avoid duplicates)
      if (safeAddTags.length > 0) {
        const tagsToAdd = safeAddTags.filter((tag) => !newTags.includes(tag));
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

    const cardIdsByWorkspace = new Map<Id<"workspaces">, Set<Id<"cards">>>();

    for (const cardId of cardIds) {
      const card = await ctx.db.get(cardId);
      if (!card) continue;

      await requireWorkspaceAccess(ctx, card.workspaceId);

      await ctx.db.patch(cardId, {
        deleted: true,
        deletedAt: now,
        updatedAt: now,
      });

      const set = cardIdsByWorkspace.get(card.workspaceId) ?? new Set<Id<"cards">>();
      set.add(cardId);
      cardIdsByWorkspace.set(card.workspaceId, set);
    }

    for (const [workspaceId, ids] of cardIdsByWorkspace) {
      await softDeleteCardEvents(ctx, workspaceId, ids);
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

/**
 * Internal mutation to create a card from the browser extension.
 * Skips workspace access check since it's done in the HTTP handler.
 */
export const createFromExtension = internalMutation({
  args: {
    workspaceId: v.string(),
    type: v.string(),
    url: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    favicon: v.optional(v.string()),
    collectionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const workspaceId = args.workspaceId as Id<"workspaces">;

    // SSRF protection: Validate URL before creating card
    if (args.url && args.type === "url") {
      const validated = validateExternalUrl(args.url);
      if (!validated.ok) {
        throw new Error(validated.error);
      }
    }

    // Extract domain from URL
    let domain: string | undefined;
    if (args.url) {
      try {
        domain = new URL(args.url).hostname;
      } catch {
        // Ignore URL parsing errors
      }
    }

    // Create the card
    const cardId = await ctx.db.insert("cards", {
      workspaceId,
      type: args.type,
      url: args.url,
      title: args.title || args.url || "Untitled",
      description: args.description,
      image: args.image,
      favicon: args.favicon,
      domain,
      status: args.image ? "READY" : "PENDING",
      deleted: false,
      pinned: false,
      tags: [],
      scheduledDates: [],
      isFileCard: false,
      source: { type: "webext" },
      createdAt: now,
      updatedAt: now,
    });

    // Add to collection if specified
    // NOTE: This must also add the collection slug to card.tags to keep
    // tags and collectionNotes in sync.
    // @see docs/adr/0001-tags-canonical-membership.md
    if (args.collectionId) {
      const collectionId = args.collectionId as Id<"collections">;
      const collection = await ctx.db.get(collectionId);

      if (collection && collection.workspaceId === workspaceId && !collection.deleted) {
        // Add collection slug to card tags (tags are canonical for membership)
        const card = await ctx.db.get(cardId);
        if (card && !card.tags.includes(collection.slug)) {
          await ctx.db.patch(cardId, {
            tags: [...card.tags, collection.slug],
            updatedAt: now,
          });
        }

        // Get max position for collectionNotes (used for ordering)
        const notes = await ctx.db
          .query("collectionNotes")
          .withIndex("by_collection", (q) => q.eq("collectionId", collectionId))
          .collect();
        const maxPos = notes.length > 0 ? Math.max(...notes.map((n) => n.position)) + 1 : 0;

        await ctx.db.insert("collectionNotes", {
          collectionId,
          cardId,
          position: maxPos,
          createdAt: now,
        });
      }
    }

    // Schedule metadata scraping if needed
    if (args.url && !args.image) {
      try {
        await ctx.scheduler.runAfter(0, internal.metadata.scrape, { cardId });
      } catch {
        // Ignore scheduling errors
      }
    }

    return cardId;
  },
});
