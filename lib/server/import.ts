import { parseISO } from "date-fns";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";
import { exportPayloadSchema } from "@/lib/validators/import";
import { normalizeCollections, normalizeTags, ensureUrlProtocol, safeHost } from "@/lib/utils/strings";
import { stringifyNullable } from "@/lib/utils/json";

// Transaction client type for Prisma $transaction callbacks
type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export async function exportData(userId: string, includeDen = false) {
  const cardWhere = includeDen
    ? { userId, deleted: false }
    : { userId, deleted: false, inDen: false };

  const collectionWhere = includeDen
    ? { userId, deleted: false }
    : { userId, deleted: false, inDen: false };

  const [cards, collections] = await Promise.all([
    prisma.card.findMany({ where: cardWhere, orderBy: { createdAt: "asc" } }),
    prisma.collection.findMany({ where: collectionWhere, orderBy: { createdAt: "asc" } })
  ]);

  return {
    exportedAt: new Date().toISOString(),
    cards,
    collections
  };
}

export async function importData(userId: string, payload: unknown) {
  const parsed = exportPayloadSchema.parse(payload);

  let createdCards = 0;
  let updatedCards = 0;
  let createdCollections = 0;
  let updatedCollections = 0;

  await prisma.$transaction(async (tx: TransactionClient) => {
    for (const collection of parsed.collections) {
      const id = collection.id ?? undefined;
      const existing = id
        ? await tx.collection.findFirst({ where: { id, userId } })
        : await tx.collection.findFirst({ where: { slug: collection.slug, userId } });

      const data = {
        name: collection.name,
        slug: collection.slug,
        parentId: collection.parentId ?? null,
        createdAt: collection.createdAt ? parseISO(collection.createdAt) : undefined,
        updatedAt: collection.updatedAt ? parseISO(collection.updatedAt) : undefined
      };

      if (existing) {
        await tx.collection.update({
          where: { id: existing.id, userId },
          data
        });
        updatedCollections += 1;
      } else {
        await tx.collection.create({
          data: {
            ...data,
            id: id ?? undefined,
            userId
          }
        });
        createdCollections += 1;
      }
    }

    for (const card of parsed.cards) {
      const id = card.id ?? undefined;
      const normalizedTags = normalizeTags(card.tags);
      const normalizedCollections = normalizeCollections(card.collections);

      const data = {
        url: ensureUrlProtocol(card.url),
        title: card.title,
        notes: card.notes,
        status: card.status ?? "PENDING",
        tags: normalizedTags.length ? JSON.stringify(normalizedTags) : null,
        collections: normalizedCollections.length ? JSON.stringify(normalizedCollections) : null,
        domain: card.domain ?? safeHost(card.url),
        image: card.image,
        description: card.description,
        metadata: stringifyNullable(card.metadata),
        createdAt: card.createdAt ? parseISO(card.createdAt) : undefined,
        updatedAt: card.updatedAt ? parseISO(card.updatedAt) : undefined
      };

      if (id) {
        const existing = await tx.card.findFirst({ where: { id, userId } });
        if (existing) {
          await tx.card.update({ where: { id, userId }, data });
          updatedCards += 1;
          continue;
        }
      }

      await tx.card.create({
        data: {
          ...data,
          id,
          userId
        }
      });
      createdCards += 1;
    }
  });

  return {
    createdCards,
    updatedCards,
    createdCollections,
    updatedCollections
  };
}
