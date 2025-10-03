import { parseISO } from "date-fns";
import { prisma } from "@/lib/server/prisma";
import { exportPayloadSchema } from "@/lib/validators/import";
import { normalizeCollections, normalizeTags, ensureUrlProtocol, safeHost } from "@/lib/utils/strings";
import { stringifyNullable } from "@/lib/utils/json";

export async function exportData() {
  const [cards, collections] = await Promise.all([
    prisma.card.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.collection.findMany({ orderBy: { createdAt: "asc" } })
  ]);

  return {
    exportedAt: new Date().toISOString(),
    cards,
    collections
  };
}

export async function importData(payload: unknown) {
  const parsed = exportPayloadSchema.parse(payload);

  let createdCards = 0;
  let updatedCards = 0;
  let createdCollections = 0;
  let updatedCollections = 0;

  await prisma.$transaction(async (tx) => {
    for (const collection of parsed.collections) {
      const id = collection.id ?? undefined;
      const existing = id
        ? await tx.collection.findUnique({ where: { id } })
        : await tx.collection.findUnique({ where: { slug: collection.slug } });

      const data = {
        name: collection.name,
        slug: collection.slug,
        parentId: collection.parentId ?? null,
        createdAt: collection.createdAt ? parseISO(collection.createdAt) : undefined,
        updatedAt: collection.updatedAt ? parseISO(collection.updatedAt) : undefined
      };

      if (existing) {
        await tx.collection.update({
          where: { id: existing.id },
          data
        });
        updatedCollections += 1;
      } else {
        await tx.collection.create({
          data: {
            ...data,
            id: id ?? undefined
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
        const existing = await tx.card.findUnique({ where: { id } });
        if (existing) {
          await tx.card.update({ where: { id }, data });
          updatedCards += 1;
          continue;
        }
      }

      await tx.card.create({
        data: {
          ...data,
          id
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
