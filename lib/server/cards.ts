import { Card, Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";
import { fetchPreviewMetadata } from "@/lib/server/metadata";
import { cardCreateSchema, cardListQuerySchema, cardUpdateSchema } from "@/lib/validators/card";
import { normalizeCollections, normalizeTags, safeHost } from "@/lib/utils/strings";
import { parseJsonArray, parseJsonObject, stringifyNullable } from "@/lib/utils/json";

const DEFAULT_PREVIEW_TEMPLATE = process.env.NEXT_PUBLIC_PREVIEW_SERVICE_URL;

export type CardInput = typeof cardCreateSchema._input;
export type CardUpdateInput = typeof cardUpdateSchema._input;
export type CardListQuery = typeof cardListQuerySchema._input;

export type CardDTO = Omit<Card, 'tags' | 'collections' | 'metadata'> & {
  tags: string[];
  collections: string[];
  metadata: Record<string, unknown> | undefined;
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
    tags: parseJsonArray(card.tags),
    collections: parseJsonArray(card.collections),
    metadata: parseJsonObject(card.metadata)
  };
}

export async function createCard(payload: CardInput): Promise<CardDTO> {
  const parsed = cardCreateSchema.parse(payload);
  const normalizedTags = normalizeTags(parsed.tags);
  const normalizedCollections = normalizeCollections(parsed.collections);

  let status: "PENDING" | "READY" | "ERROR" = "PENDING";
  const data: Prisma.CardCreateInput = {
    url: parsed.url,
    title: parsed.title,
    notes: parsed.notes,
    tags: serializeTags(normalizedTags),
    collections: serializeCollections(normalizedCollections)
  };

  if (parsed.autoFetchMetadata) {
    const preview = await fetchPreviewMetadata(parsed.url, parsed.previewServiceUrl ?? DEFAULT_PREVIEW_TEMPLATE);
    if (preview) {
      const title = preview.title ?? parsed.title;
      const description = preview.description ?? parsed.notes ?? undefined;
      const image = preview.image ?? preview.logo ?? preview.screenshot;
      const domain = safeHost(parsed.url);
      if (title) {
        data.title = title;
      }
      if (description) {
        data.description = description;
      }
      if (image) {
        data.image = image;
      }
      if (domain) {
        data.domain = domain;
      }
      data.metadata = stringifyNullable(preview.raw ?? preview);
      status = "READY";
    }
  }

  if (!data.domain) {
    data.domain = safeHost(parsed.url);
  }

  data.status = status;

  const created = await prisma.card.create({
    data
  });

  return mapCard(created);
}


export async function listCards(query: CardListQuery) {
  const parsed = cardListQuerySchema.parse(query);
  const limit = parsed.limit ?? 50;
  const where: Prisma.CardWhereInput = {};

  if (parsed.q) {
    const term = parsed.q;
    where.OR = [
      { title: { contains: term } },
      { url: { contains: term } },
      { domain: { contains: term } },
      { notes: { contains: term } },
      { tags: { contains: term } }
    ];
  }

  if (parsed.collection) {
    where.collections = { contains: parsed.collection };
  }

  if (parsed.status) {
    where.status = parsed.status;
  }

  const orderBy: Prisma.CardOrderByWithRelationInput = { createdAt: "desc" };

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

export async function getCard(id: string) {
  const card = await prisma.card.findUnique({ where: { id } });
  return card ? mapCard(card) : null;
}

export async function updateCard(id: string, payload: CardUpdateInput): Promise<CardDTO> {
  const parsed = cardUpdateSchema.parse(payload);
  const normalizedTags = parsed.tags ? normalizeTags(parsed.tags) : undefined;
  const normalizedCollections = parsed.collections ? normalizeCollections(parsed.collections) : undefined;

  const data: Prisma.CardUpdateInput = {
    ...parsed,
    tags: normalizedTags ? serializeTags(normalizedTags) : undefined,
    collections: normalizedCollections ? serializeCollections(normalizedCollections) : undefined,
    metadata: parsed.metadata ? stringifyNullable(parsed.metadata) : parsed.metadata === undefined ? undefined : null
  };

  if (parsed.url) {
    data.domain = safeHost(parsed.url);
  }

  const updated = await prisma.card.update({
    where: { id },
    data
  });

  return mapCard(updated);
}

export async function deleteCard(id: string) {
  await prisma.card.delete({ where: { id } });
}

export async function countCards() {
  const [total, ready, pending, error] = await Promise.all([
    prisma.card.count(),
    prisma.card.count({ where: { status: "READY" } }),
    prisma.card.count({ where: { status: "PENDING" } }),
    prisma.card.count({ where: { status: "ERROR" } })
  ]);

  return { total, ready, pending, error };
}

export async function quickAccessCards(limit = 4) {
  const items = await prisma.card.findMany({
    orderBy: {
      updatedAt: "desc"
    },
    take: limit
  });
  return items.map(mapCard);
}

export async function collectionPreviewCards(slug: string, limit = 6) {
  if (!slug) {
    return [];
  }
  const result = await listCards({ collection: slug, limit });
  return result.items;
}
export async function recentCards(limit = 6) {
  const items = await prisma.card.findMany({
    orderBy: { createdAt: "desc" },
    take: limit
  });
  return items.map(mapCard);
}

export async function bulkAddCollection(cardIds: string[], slug: string) {
  if (cardIds.length === 0) return;
  const cards = await prisma.card.findMany({ where: { id: { in: cardIds } } });
  await Promise.all(
    cards.map((card) => {
      const existing = new Set(parseJsonArray(card.collections));
      existing.add(slug);
      return prisma.card.update({
        where: { id: card.id },
        data: {
          collections: serializeCollections(Array.from(existing))
        }
      });
    })
  );
}

export async function bulkRemoveCards(cardIds: string[]) {
  if (!cardIds.length) return;
  await prisma.card.deleteMany({ where: { id: { in: cardIds } } });
}



