import { Prisma } from "@prisma/client";
import type { OldCardAgeThreshold, CardType, CardStatus, CardModel, PrismaCard } from "@/lib/types";
// Use PrismaCard instead of Card from @prisma/client when Prisma client is not generated
type Card = PrismaCard;
import { prisma } from "@/lib/server/prisma";
import { fetchPreviewMetadata } from "@/lib/server/metadata";
import { cardCreateSchema, cardListQuerySchema, cardUpdateSchema } from "@/lib/validators/card";
import { normalizeCollections, normalizeTags, safeHost } from "@/lib/utils/strings";
import { parseJsonArray, parseJsonObject, stringifyNullable } from "@/lib/utils/json";
import { downloadAndStoreImage, isExpiringImageUrl, isStoredImageUrl } from "@/lib/server/image-storage";

const DEFAULT_PREVIEW_TEMPLATE = process.env.NEXT_PUBLIC_PREVIEW_SERVICE_URL;

export type CardInput = typeof cardCreateSchema._input;
export type CardUpdateInput = typeof cardUpdateSchema._input;
export type CardListQuery = typeof cardListQuerySchema._input;

// CardDTO is the serialized version of a Prisma Card, which matches CardModel + userId
export type CardDTO = CardModel & {
  userId: string;
};

function serializeTags(tags: string[]): string | null {
  return tags.length ? JSON.stringify(tags) : null;
}

function serializeCollections(collections: string[]): string | null {
  return collections.length ? JSON.stringify(collections) : null;
}

function mapCard(card: Card): CardDTO {
  return {
    ...card,
    type: card.type as CardType,
    status: card.status as CardStatus,
    tags: parseJsonArray(card.tags),
    collections: parseJsonArray(card.collections),
    metadata: parseJsonObject(card.metadata),
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
    deletedAt: card.deletedAt?.toISOString() ?? null,
    scheduledDate: card.scheduledDate?.toISOString() ?? null
  };
}

export async function createCard(userId: string, payload: CardInput): Promise<CardDTO> {
  const parsed = cardCreateSchema.parse(payload);
  const normalizedTags = normalizeTags(parsed.tags);
  const normalizedCollections = normalizeCollections(parsed.collections);

  const cardType = parsed.type || "url";
  const isNote = cardType === "md-note" || cardType === "text-note";

  // Check if any of the collections are private pawkits
  let inDen = false;
  if (normalizedCollections.length > 0) {
    const privateCollections = await prisma.collection.findMany({
      where: {
        userId,
        slug: { in: normalizedCollections },
        isPrivate: true
      },
      select: { slug: true }
    });
    inDen = privateCollections.length > 0;
  }

  // Create card with different logic based on type
  const data = {
    type: cardType,
    url: parsed.url || (isNote ? "" : ""),
    title: parsed.title ?? (cardType === "url" && parsed.url ? parsed.url : parsed.title) ?? (isNote ? "Untitled Note" : ""),
    notes: parsed.notes,
    content: parsed.content,
    tags: serializeTags(normalizedTags),
    collections: serializeCollections(normalizedCollections),
    domain: parsed.url && parsed.url.length > 0 ? safeHost(parsed.url) : undefined,
    status: cardType === "url" ? "PENDING" : "READY",
    inDen,
    user: { connect: { id: userId } }
  };

  try {
    console.log('[createCard] Attempting to create card:', { userId, type: cardType, url: parsed.url, title: data.title });
    const created = await prisma.card.create({
      data
    });

    console.log('[createCard] Card created successfully:', created.id);
    // Return immediately - metadata will be fetched in background for URL cards
    return mapCard(created);
  } catch (error) {
    // Handle unique constraint violation (P2002) - duplicate userId + url
    // Note: This should only happen for URL-type cards due to partial unique index
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      console.log('[createCard] P2002 ERROR - Duplicate detected for type:', cardType, 'URL:', parsed.url, 'Target:', error.meta?.target);

      // Find and return the existing non-deleted card
      // Look for cards of the same type to handle edge cases
      const existingCard = await prisma.card.findFirst({
        where: {
          userId,
          url: parsed.url || "",
          type: cardType, // Look for cards of the same type
          deleted: false // Exclude deleted cards
        }
      });

      if (existingCard) {
        console.log('[createCard] Returning existing card:', existingCard.id);
        return mapCard(existingCard);
      }

      // If no non-deleted card found, this might be a deleted duplicate
      // In this case, we should allow creation by re-throwing the error
      // so the caller can handle it appropriately
      console.error('[createCard] No existing non-deleted card found, but P2002 occurred. This should not happen!');
    }

    // Re-throw other errors
    throw error;
  }
}

export async function fetchAndUpdateCardMetadata(cardId: string, url: string, previewServiceUrl?: string): Promise<CardDTO> {
  try {
    console.log('[fetchAndUpdateCardMetadata] Starting for card:', cardId, 'URL:', url);
    const preview = await fetchPreviewMetadata(url, previewServiceUrl ?? DEFAULT_PREVIEW_TEMPLATE);
    console.log('[fetchAndUpdateCardMetadata] Preview result:', preview ? 'SUCCESS' : 'FAILED');
    
    if (preview) {
      console.log('[fetchAndUpdateCardMetadata] Preview details:', {
        title: preview.title,
        hasImage: !!preview.image,
        imageUrl: preview.image?.substring(0, 100),
        hasLogo: !!preview.logo,
        hasScreenshot: !!preview.screenshot
      });
    }

    const updateData: Record<string, any> = {
      status: "READY"
    };

    if (preview) {
      const title = preview.title;
      const description = preview.description;
      let image = preview.image ?? preview.logo ?? preview.screenshot;

      if (title) {
        updateData.title = title;
      }
      if (description) {
        updateData.description = description;
      }
      if (image) {
        // Check if this is an expiring URL (like TikTok) that needs to be downloaded and stored
        if (isExpiringImageUrl(image) && !isStoredImageUrl(image)) {
          console.log('[fetchAndUpdateCardMetadata] Detected expiring URL, downloading and storing...');
          const storedImageUrl = await downloadAndStoreImage(image, cardId);
          if (storedImageUrl) {
            image = storedImageUrl;
            console.log('[fetchAndUpdateCardMetadata] Image stored permanently:', storedImageUrl);
          } else {
            console.warn('[fetchAndUpdateCardMetadata] Failed to store image, using original URL');
          }
        }
        updateData.image = image;
      }
      updateData.metadata = stringifyNullable(preview.raw ?? preview);
    }

    const updated = await prisma.card.update({
      where: { id: cardId },
      data: updateData
    });

    return mapCard(updated);
  } catch (error) {
    // Mark as ERROR if metadata fetch fails
    const updated = await prisma.card.update({
      where: { id: cardId },
      data: { status: "ERROR" }
    });
    return mapCard(updated);
  }
}


export async function listCards(userId: string, query: CardListQuery) {
  const parsed = cardListQuerySchema.parse(query);
  const limit = parsed.limit ?? 50;
  // For sync operations, includeDeleted=true allows fetching deleted cards
  // For regular queries, default to deleted=false to hide deleted cards
  const where: Record<string, any> = {
    userId,
    deleted: parsed.includeDeleted ? undefined : false,
    inDen: false
  };

  if (parsed.q) {
    const term = parsed.q;
    where.OR = [
      { title: { contains: term } },
      { url: { contains: term } },
      { domain: { contains: term } },
      { notes: { contains: term } },
      { content: { contains: term } },
      { tags: { contains: term } },
      { collections: { contains: term } }
    ];
  }

  if (parsed.collection) {
    // Use exact match for collection slug in JSON array
    // Match both ["slug"] and ["slug","other"] patterns
    const jsonPattern = `"${parsed.collection}"`;
    where.collections = { contains: jsonPattern };
  }

  if (parsed.type) {
    where.type = parsed.type;
  }

  if (parsed.status) {
    where.status = parsed.status;
  }

  const orderBy = { createdAt: "desc" as const };

  const items = await prisma.card.findMany({
    where,
    orderBy,
    take: limit + 1,
    cursor: parsed.cursor ? { id: parsed.cursor } : undefined,
    skip: parsed.cursor ? 1 : 0
  });

  const hasMore = items.length > limit;
  const sliced = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? sliced[sliced.length - 1]?.id : undefined;

  return {
    items: sliced.map(mapCard),
    nextCursor
  };
}

export async function getCard(userId: string, id: string) {
  const card = await prisma.card.findFirst({ where: { id, userId } });
  return card ? mapCard(card) : null;
}

export async function updateCard(userId: string, id: string, payload: CardUpdateInput): Promise<CardDTO> {
  let parsed;
  try {
    parsed = cardUpdateSchema.parse(payload);
  } catch (error) {
    console.error('[updateCard] Validation failed for payload:', JSON.stringify(payload, null, 2));
    console.error('[updateCard] Validation error:', error);
    throw error;
  }

  const normalizedTags = parsed.tags ? normalizeTags(parsed.tags) : undefined;
  const normalizedCollections = parsed.collections ? normalizeCollections(parsed.collections) : undefined;

  const data: Record<string, any> = {
    ...parsed,
    tags: normalizedTags ? serializeTags(normalizedTags) : undefined,
    collections: normalizedCollections ? serializeCollections(normalizedCollections) : undefined,
    metadata: parsed.metadata ? stringifyNullable(parsed.metadata) : parsed.metadata === undefined ? undefined : null
  };

  if (parsed.url) {
    data.domain = safeHost(parsed.url);
  }

  // When collections are updated, check if any are private pawkits
  // If so, set inDen to true to hide from Library/Timeline/Search
  if (normalizedCollections !== undefined) {
    const privateCollections = await prisma.collection.findMany({
      where: {
        userId,
        slug: { in: normalizedCollections },
        isPrivate: true
      },
      select: { slug: true }
    });

    data.inDen = privateCollections.length > 0;
  }

  const updated = await prisma.card.update({
    where: { id, userId },
    data
  });

  return mapCard(updated);
}

export async function deleteCard(userId: string, id: string) {
  await prisma.card.delete({ where: { id, userId } });
}

export async function countCards(userId: string) {
  const baseWhere = { userId, deleted: false, inDen: false };

  const [total, ready, pending, error] = await Promise.all([
    prisma.card.count({ where: baseWhere }),
    prisma.card.count({ where: { ...baseWhere, status: "READY" } }),
    prisma.card.count({ where: { ...baseWhere, status: "PENDING" } }),
    prisma.card.count({ where: { ...baseWhere, status: "ERROR" } })
  ]);

  return { total, ready, pending, error };
}

export async function quickAccessCards(userId: string, limit = 8) {
  const baseWhere = { userId, deleted: false, inDen: false };

  // Get pinned cards first
  const pinnedCards = await prisma.card.findMany({
    where: { ...baseWhere, pinned: true },
    orderBy: { updatedAt: "desc" },
    take: limit
  });

  // If we have enough pinned cards, return them
  if (pinnedCards.length >= limit) {
    return pinnedCards.map(mapCard);
  }

  // Otherwise, fill remaining slots with most recently updated cards
  const remaining = limit - pinnedCards.length;
  const pinnedIds = pinnedCards.map((card: PrismaCard) => card.id);
  const excludePinned = pinnedIds.length ? { id: { notIn: pinnedIds } } : {};

  const recentCards = await prisma.card.findMany({
    where: {
      ...baseWhere,
      ...excludePinned
    },
    orderBy: { updatedAt: "desc" },
    take: remaining
  });

  return [...pinnedCards, ...recentCards].map(mapCard);
}

export async function collectionPreviewCards(userId: string, slug: string, limit = 6) {
  if (!slug) {
    return [];
  }
  const result = await listCards(userId, { collection: slug, limit });
  return result.items;
}

export async function recentCards(userId: string, limit = 6) {
  const items = await prisma.card.findMany({
    where: { userId, deleted: false, inDen: false },
    orderBy: { createdAt: "desc" },
    take: limit
  });
  return items.map(mapCard);
}

export async function bulkAddCollection(userId: string, cardIds: string[], slug: string) {
  if (cardIds.length === 0) return;

  // Validate that the collection exists
  const collection = await prisma.collection.findFirst({ where: { slug, userId } });
  if (!collection) {
    throw new Error(`Collection with slug "${slug}" does not exist`);
  }

  const cards = await prisma.card.findMany({ where: { id: { in: cardIds }, userId } });
  await Promise.all(
    cards.map((card: PrismaCard) => {
      const existing = new Set(parseJsonArray(card.collections));
      existing.add(slug);
      return prisma.card.update({
        where: { id: card.id, userId },
        data: {
          collections: serializeCollections(Array.from(existing))
        }
      });
    })
  );
}

export async function bulkRemoveCards(userId: string, cardIds: string[]) {
  if (!cardIds.length) return;
  await prisma.card.deleteMany({ where: { id: { in: cardIds }, userId } });
}

export type TimelineGroup = {
  date: string;
  cards: CardDTO[];
};

export async function getTimelineCards(userId: string, days = 30): Promise<TimelineGroup[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const cards = await prisma.card.findMany({
    where: {
      userId,
      createdAt: {
        gte: startDate
      },
      deleted: false,
      inDen: false
    },
    orderBy: { createdAt: "desc" }
  });

  // Group cards by date (YYYY-MM-DD)
  const groupedByDate = new Map<string, Card[]>();

  for (const card of cards) {
    const dateKey = card.createdAt.toISOString().split('T')[0];
    if (!groupedByDate.has(dateKey)) {
      groupedByDate.set(dateKey, []);
    }
    groupedByDate.get(dateKey)!.push(card);
  }

  // Convert to array and sort by date descending
  const timeline: TimelineGroup[] = Array.from(groupedByDate.entries())
    .map(([date, cards]) => ({
      date,
      cards: cards.map(mapCard)
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return timeline;
}

export async function softDeleteCard(userId: string, id: string) {
  console.log('[softDeleteCard] Starting delete:', { userId, cardId: id });

  // Check if card exists before attempting update
  const existingCard = await prisma.card.findFirst({
    where: { id, userId },
    select: { id: true, deleted: true, title: true }
  });

  console.log('[softDeleteCard] Existing card:', existingCard);

  if (!existingCard) {
    console.error('[softDeleteCard] Card not found:', { userId, cardId: id });
    throw new Error(`Card ${id} not found for user ${userId}`);
  }

  const result = await prisma.card.update({
    where: { id, userId },
    data: {
      deleted: true,
      deletedAt: new Date()
    }
  });

  console.log('[softDeleteCard] Update result:', {
    id: result.id,
    deleted: result.deleted,
    deletedAt: result.deletedAt,
    updatedAt: result.updatedAt
  });

  // Verify the update persisted
  const verifyCard = await prisma.card.findFirst({
    where: { id, userId },
    select: { id: true, deleted: true, deletedAt: true }
  });

  console.log('[softDeleteCard] Verification after update:', verifyCard);

  return result;
}

export async function getTrashCards(userId: string) {
  const cards = await prisma.card.findMany({
    where: { userId, deleted: true },
    orderBy: { deletedAt: "desc" }
  });
  return cards.map(mapCard);
}

export async function restoreCard(userId: string, id: string) {
  const card = await prisma.card.findFirst({ where: { id, userId } });
  if (!card) {
    throw new Error('Card not found');
  }

  // Parse collections array
  const collections: any = card.collections ? JSON.parse(card.collections) : [];
  const collectionSlugs = Array.isArray(collections) ? collections : [];

  let restoredToLibrary = false;
  let cleanedCollections = collectionSlugs;

  // If card has collections, check if they still exist
  if (collectionSlugs.length > 0) {
    const validCollections = await prisma.collection.findMany({
      where: {
        userId,
        slug: { in: collectionSlugs },
        deleted: false
      },
      select: { slug: true }
    });

    const validSlugs = validCollections.map((c: { slug: string }) => c.slug);
    cleanedCollections = collectionSlugs.filter((slug: string) => validSlugs.includes(slug));

    // If all collections were removed, card goes to library
    if (cleanedCollections.length === 0 && collectionSlugs.length > 0) {
      restoredToLibrary = true;
    }
  }

  const updated = await prisma.card.update({
    where: { id, userId },
    data: {
      deleted: false,
      deletedAt: null,
      collections: JSON.stringify(cleanedCollections)
    }
  });

  return {
    card: updated,
    restoredToLibrary
  };
}

export async function permanentlyDeleteCard(userId: string, id: string) {
  return prisma.card.delete({ where: { id, userId } });
}

export async function purgeOldTrashItems(userId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  await prisma.$transaction([
    prisma.card.deleteMany({
      where: {
        userId,
        deleted: true,
        deletedAt: {
          lte: thirtyDaysAgo
        }
      }
    }),
    prisma.collection.deleteMany({
      where: {
        userId,
        deleted: true,
        deletedAt: {
          lte: thirtyDaysAgo
        }
      }
    })
  ]);
}

export type DigUpFilterMode = "uncategorized" | "all";

export type DigUpCardsResult = {
  cards: CardDTO[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
};

export interface GetDigUpCardsParams {
  userId: string;
  cursor?: string;
  filterMode?: DigUpFilterMode;
  limit?: number;
}

export async function getDigUpCards({
  userId,
  cursor,
  filterMode = "uncategorized",
  limit = 20
}: GetDigUpCardsParams): Promise<DigUpCardsResult> {
  // Build where clause based on filter mode
  const where: Record<string, any> = {
    userId,
    deleted: false,
    inDen: false,
  };

  // Add filter for uncategorized cards (no collections assigned)
  if (filterMode === "uncategorized") {
    where.OR = [
      { collections: null },
      { collections: "" }
    ];
  }

  // Get total count (only on first request when cursor is null)
  const totalCount = !cursor ? await prisma.card.count({ where }) : 0;

  // Add cursor for pagination (start after the cursor ID)
  if (cursor) {
    where.id = { gt: cursor };
  }

  const cards = await prisma.card.findMany({
    where,
    orderBy: { createdAt: "asc" }, // Oldest first
    take: limit + 1 // Take one extra to check if there are more
  });

  // Check if there are more cards
  const hasMore = cards.length > limit;
  const cardsToReturn = hasMore ? cards.slice(0, limit) : cards;
  const nextCursor = hasMore ? cardsToReturn[cardsToReturn.length - 1].id : null;

  return {
    cards: cardsToReturn.map(mapCard),
    nextCursor,
    hasMore,
    totalCount
  };
}

// Keep old function for backwards compatibility (deprecated)
export type OldCardsResult = {
  cards: CardDTO[];
  ageThreshold: OldCardAgeThreshold;
  total: number;
};

export async function getOldCards(userId: string): Promise<OldCardsResult | null> {
  // Use new function with default params
  const result = await getDigUpCards({
    userId,
    filterMode: "uncategorized",
    limit: 50
  });

  if (result.cards.length === 0) {
    return null;
  }

  return {
    cards: result.cards,
    ageThreshold: "1 day", // Legacy field
    total: result.cards.length
  };
}

