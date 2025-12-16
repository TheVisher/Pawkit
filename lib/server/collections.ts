import { Prisma, PrismaClient } from "@prisma/client";
import type { PrismaCollection } from "@/lib/types";
type Collection = PrismaCollection;
import { prisma } from "@/lib/server/prisma";
import { collectionCreateSchema, collectionUpdateSchema } from "@/lib/validators/collection";
import { slugify } from "@/lib/utils/slug";
import { unstable_cache, revalidateTag } from 'next/cache';

type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

const MAX_DEPTH = 10;

export type CollectionDTO = Omit<Collection, 'createdAt' | 'updatedAt' | 'deletedAt'> & {
  children: CollectionDTO[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

function mapCollection(collection: Collection): Omit<CollectionDTO, 'children'> {
  return {
    ...collection,
    createdAt: collection.createdAt.toISOString(),
    updatedAt: collection.updatedAt.toISOString(),
    deletedAt: collection.deletedAt?.toISOString() ?? null
  };
}

export const listCollections = unstable_cache(
  async (userId: string, includeDeleted = false) => {
    const items = await prisma.collection.findMany({
      where: {
        userId,
        ...(includeDeleted ? {} : { deleted: false }),
        inDen: false
      },
      orderBy: { name: "asc" }
    });

    const nodes = new Map<string, CollectionDTO>();
    const roots: CollectionDTO[] = [];

    items.forEach((item: PrismaCollection) => {
      nodes.set(item.id, { ...mapCollection(item), children: [] });
    });

    nodes.forEach((node: CollectionDTO) => {
      if (node.parentId && nodes.has(node.parentId)) {
        nodes.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortTree = (tree: CollectionDTO[]) => {
      tree.sort((a, b) => a.name.localeCompare(b.name));
      tree.forEach((node: CollectionDTO) => sortTree(node.children));
    };

    sortTree(roots);

    return { tree: roots, flat: Array.from(nodes.values()) };
  },
  ['collections'],
  { revalidate: 5, tags: ['collections'] }
);

async function ensureDepth(userId: string, parentId: string | undefined | null) {
  if (!parentId) return 1;

  const allCollections = await prisma.collection.findMany({
    where: { userId },
    select: { id: true, parentId: true }
  });

  const collectionMap = new Map(allCollections.map(c => [c.id, c.parentId]));

  let depth = 1;
  let currentId: string | undefined | null = parentId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) {
      throw new Error('Circular reference detected in collection hierarchy');
    }
    visited.add(currentId);

    const parentOfCurrent = collectionMap.get(currentId);
    if (parentOfCurrent === undefined) break;
    depth += 1;
    currentId = parentOfCurrent;
    if (depth > MAX_DEPTH) {
      throw new Error(`Maximum depth of ${MAX_DEPTH} exceeded`);
    }
  }
  return depth;
}

async function uniqueSlug(userId: string, base: string, excludeId?: string): Promise<string> {
  const baseSlug = slugify(base) || `collection-${Date.now()}`;
  const MAX_ATTEMPTS = 100;

  for (let attempt = 0; attempt <= MAX_ATTEMPTS; attempt++) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;

    // Check globally since slug is a global unique constraint
    const existing = await prisma.collection.findFirst({
      where: { slug: candidate },
      select: { id: true, userId: true }
    });

    if (!existing || (excludeId && existing.id === excludeId)) {
      return candidate;
    }
    
    // If the slug belongs to THIS user, we can use it (idempotent)
    if (existing.userId === userId) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now()}`;
}

export async function createCollection(userId: string, payload: unknown) {
  const parsed = collectionCreateSchema.parse(payload);
  await ensureDepth(userId, parsed.parentId ?? null);
  
  const baseSlug = slugify(parsed.name) || `collection-${Date.now()}`;
  
  // Check if this user already has this collection (by name or slug pattern)
  const existingForUser = await prisma.collection.findFirst({
    where: { 
      userId,
      OR: [
        { slug: baseSlug },
        { slug: { startsWith: `${baseSlug}-` } },
        { name: parsed.name }
      ]
    },
    orderBy: { createdAt: 'asc' }
  });

  if (existingForUser) {
    console.log(`[Collections] Collection "${parsed.name}" already exists for user (id: ${existingForUser.id}, slug: ${existingForUser.slug})`);
    
    if (existingForUser.deleted) {
      const restored = await prisma.collection.update({
        where: { id: existingForUser.id },
        data: {
          deleted: false,
          deletedAt: null,
          name: parsed.name,
          parentId: parsed.parentId ?? null
        }
      });
      revalidateTag('collections');
      return restored;
    }
    
    if (existingForUser.parentId !== (parsed.parentId ?? null) || existingForUser.name !== parsed.name) {
      const updated = await prisma.collection.update({
        where: { id: existingForUser.id },
        data: {
          parentId: parsed.parentId ?? null,
          name: parsed.name
        }
      });
      revalidateTag('collections');
      return updated;
    }
    
    return existingForUser;
  }

  const slug = await uniqueSlug(userId, parsed.name);

  try {
    const created = await prisma.collection.create({
      data: {
        name: parsed.name,
        parentId: parsed.parentId ?? null,
        slug,
        metadata: parsed.metadata as Prisma.InputJsonValue ?? undefined,
        user: { connect: { id: userId } }
      }
    });

    revalidateTag('collections');
    return created;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      console.log(`[Collections] Unique constraint hit for slug "${slug}", attempting recovery`);
      
      const existingAfterRace = await prisma.collection.findFirst({
        where: { 
          userId,
          OR: [{ slug }, { name: parsed.name }]
        }
      });
      
      if (existingAfterRace) {
        console.log(`[Collections] Found existing collection after race (id: ${existingAfterRace.id})`);
        return existingAfterRace;
      }
      
      const newSlug = `${slug}-${Date.now()}`;

      try {
        const createdWithNewSlug = await prisma.collection.create({
          data: {
            name: parsed.name,
            parentId: parsed.parentId ?? null,
            slug: newSlug,
            metadata: parsed.metadata as Prisma.InputJsonValue ?? undefined,
            user: { connect: { id: userId } }
          }
        });
        revalidateTag('collections');
        return createdWithNewSlug;
      } catch (retryError) {
        const finalCheck = await prisma.collection.findFirst({
          where: { userId, name: parsed.name }
        });
        if (finalCheck) {
          return finalCheck;
        }
        throw retryError;
      }
    }
    throw error;
  }
}

async function isDescendant(userId: string, ancestorId: string, potentialDescendantId: string): Promise<boolean> {
  let currentId: string | null = potentialDescendantId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) return false;
    visited.add(currentId);

    if (currentId === ancestorId) return true;

    const collection: Collection | null = await prisma.collection.findFirst({ where: { id: currentId, userId } });
    currentId = collection?.parentId ?? null;
  }
  return false;
}

export async function updateCollection(userId: string, id: string, payload: unknown) {
  const parsed = collectionUpdateSchema.parse(payload);
  if (parsed.parentId) {
    if (parsed.parentId === id) {
      throw new Error("Collection cannot be its own parent");
    }
    if (await isDescendant(userId, id, parsed.parentId)) {
      throw new Error("Cannot move collection under its own descendant");
    }
    await ensureDepth(userId, parsed.parentId);
  }

  const data: Record<string, any> = {
    ...parsed,
    parentId: parsed.parentId === undefined ? undefined : parsed.parentId ?? null
  };

  if (parsed.name) {
    data.slug = await uniqueSlug(userId, parsed.name, id);
  }

  const updated = await prisma.collection.update({ where: { id, userId }, data });

  if (parsed.isPrivate !== undefined && updated.slug) {
    const newInDenValue = parsed.isPrivate;

    const cardsInCollection = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Card"
      WHERE "userId" = ${userId}
        AND deleted = false
        AND collections::jsonb ? ${updated.slug}
    `;

    if (cardsInCollection.length > 0) {
      await prisma.card.updateMany({
        where: {
          id: { in: cardsInCollection.map((c: {id: string}) => c.id) }
        },
        data: {
          inDen: newInDenValue
        }
      });
    }
  }

  revalidateTag('collections');
  return updated;
}

async function getAllDescendantIds(userId: string, parentId: string, tx: TransactionClient): Promise<string[]> {
  const children = await tx.collection.findMany({
    where: { parentId, userId, deleted: false },
    select: { id: true }
  });

  const childIds = children.map((c: { id: string }) => c.id);
  const descendantIds: string[] = [...childIds];

  for (const childId of childIds) {
    const grandChildren = await getAllDescendantIds(userId, childId, tx);
    descendantIds.push(...grandChildren);
  }

  return descendantIds;
}

export async function deleteCollection(userId: string, id: string, deleteCards = false, deleteSubPawkits = false) {
  const collection = await prisma.collection.findFirst({ where: { id, userId } });
  if (!collection) {
    return;
  }

  const now = new Date();

  await prisma.$transaction(async (tx: TransactionClient) => {
    let collectionIdsToDelete = [id];

    if (deleteSubPawkits) {
      const descendantIds = await getAllDescendantIds(userId, id, tx);
      collectionIdsToDelete = [id, ...descendantIds];
    } else {
      await tx.collection.updateMany({
        where: { parentId: id, userId },
        data: { parentId: collection.parentId }
      });
    }

    for (const collectionId of collectionIdsToDelete) {
      const coll = await tx.collection.findFirst({ where: { id: collectionId, userId } });
      if (!coll) continue;

      if (deleteCards) {
        await tx.card.updateMany({
          where: {
            userId,
            collections: { contains: `"${coll.slug}"` },
            deleted: false
          },
          data: {
            deleted: true,
            deletedAt: now
          }
        });
      } else {
        const affectedCards = await tx.card.findMany({
          where: {
            userId,
            collections: { contains: `"${coll.slug}"` },
            deleted: false
          }
        });

        for (const card of affectedCards) {
          const parsedCollections: unknown = card.collections ? JSON.parse(card.collections) : [];
          const filtered = Array.isArray(parsedCollections)
            ? (parsedCollections as string[]).filter((c: string) => c !== coll.slug)
            : [];

          await tx.card.update({
            where: { id: card.id, userId },
            data: { collections: JSON.stringify(filtered) }
          });
        }
      }

      await tx.collection.update({
        where: { id: collectionId, userId },
        data: {
          deleted: true,
          deletedAt: now
        }
      });
    }
  });

  revalidateTag('collections');
}

export async function pinnedCollections(userId: string, limit = 8) {
  const collections = await prisma.collection.findMany({
    where: {
      userId,
      pinned: true,
      parentId: null,
      deleted: false,
      inDen: false
    },
    orderBy: { updatedAt: "desc" },
    take: limit
  });

  return collections.map((c: PrismaCollection) => ({ ...mapCollection(c), children: [] }));
}

export async function getTrashCollections(userId: string) {
  const collections = await prisma.collection.findMany({
    where: { userId, deleted: true },
    orderBy: { deletedAt: "desc" }
  });

  return collections.map((c: PrismaCollection) => ({ ...mapCollection(c), children: [] }));
}

export async function restoreCollection(userId: string, id: string) {
  const collection = await prisma.collection.findFirst({ where: { id, userId } });
  if (!collection) {
    throw new Error('Collection not found');
  }

  let parentId = collection.parentId;
  let restoredToRoot = false;

  if (parentId) {
    const parent = await prisma.collection.findFirst({
      where: { id: parentId, userId }
    });

    if (!parent || parent.deleted) {
      parentId = null;
      restoredToRoot = true;
    }
  }

  const updated = await prisma.collection.update({
    where: { id, userId },
    data: {
      deleted: false,
      deletedAt: null,
      parentId
    }
  });

  revalidateTag('collections');

  return {
    collection: updated,
    restoredToRoot
  };
}

export async function permanentlyDeleteCollection(userId: string, id: string) {
  return prisma.collection.delete({ where: { id, userId } });
}
