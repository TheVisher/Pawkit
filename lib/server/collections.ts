import { Collection, Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";
import { collectionCreateSchema, collectionUpdateSchema } from "@/lib/validators/collection";
import { slugify } from "@/lib/utils/slug";
import { unstable_cache, revalidateTag } from 'next/cache';

const MAX_DEPTH = 10; // Allow deep nesting

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

// Cache collections for 60 seconds to improve navigation speed
export const listCollections = unstable_cache(
  async (userId: string) => {
    const items = await prisma.collection.findMany({
      where: { userId, deleted: false, inDen: false },
      orderBy: { name: "asc" }
    });

    const nodes = new Map<string, CollectionDTO>();
    const roots: CollectionDTO[] = [];

    items.forEach((item) => {
      nodes.set(item.id, { ...mapCollection(item), children: [] });
    });

    nodes.forEach((node) => {
      if (node.parentId && nodes.has(node.parentId)) {
        nodes.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortTree = (tree: CollectionDTO[]) => {
      tree.sort((a, b) => a.name.localeCompare(b.name));
      tree.forEach((node) => sortTree(node.children));
    };

    sortTree(roots);

    return { tree: roots, flat: Array.from(nodes.values()) };
  },
  ['collections'],
  { revalidate: 60, tags: ['collections'] }
);

async function ensureDepth(userId: string, parentId: string | undefined | null) {
  if (!parentId) return 1;
  let depth = 1;
  let currentId: string | undefined | null = parentId;
  while (currentId) {
    const parent: Collection | null = await prisma.collection.findFirst({ where: { id: currentId, userId } });
    if (!parent) break;
    depth += 1;
    currentId = parent.parentId;
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

    const existing = await prisma.collection.findFirst({
      where: { slug: candidate, userId },
      select: { id: true }
    });

    if (!existing || (excludeId && existing.id === excludeId)) {
      return candidate;
    }
  }

  // Final fallback: timestamp ensures uniqueness
  return `${baseSlug}-${Date.now()}`;
}

export async function createCollection(userId: string, payload: unknown) {
  const parsed = collectionCreateSchema.parse(payload);
  await ensureDepth(userId, parsed.parentId ?? null);
  const slug = await uniqueSlug(userId, parsed.name);

  const created = await prisma.collection.create({
    data: {
      name: parsed.name,
      parentId: parsed.parentId ?? null,
      slug,
      user: { connect: { id: userId } }
    }
  });

  revalidateTag('collections');
  return created;
}

async function isDescendant(userId: string, ancestorId: string, potentialDescendantId: string): Promise<boolean> {
  let currentId: string | null = potentialDescendantId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) return false; // Cycle detected
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

  const data: Prisma.CollectionUpdateInput = {
    ...parsed,
    parentId: parsed.parentId === undefined ? undefined : parsed.parentId ?? null
  };

  if (parsed.name) {
    data.slug = await uniqueSlug(userId, parsed.name, id);
  }

  const updated = await prisma.collection.update({ where: { id, userId }, data });
  revalidateTag('collections');
  return updated;
}

export async function deleteCollection(userId: string, id: string, deleteCards = false) {
  const collection = await prisma.collection.findFirst({ where: { id, userId } });
  if (!collection) {
    return;
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Move child collections to parent (they don't get deleted)
    await tx.collection.updateMany({
      where: { parentId: id, userId },
      data: { parentId: collection.parentId }
    });

    if (deleteCards) {
      // Soft delete all cards in this collection
      await tx.card.updateMany({
        where: {
          userId,
          collections: { contains: `"${collection.slug}"` },
          deleted: false
        },
        data: {
          deleted: true,
          deletedAt: now
        }
      });
    } else {
      // Remove collection slug from all cards
      const affectedCards = await tx.card.findMany({
        where: {
          userId,
          collections: { contains: `"${collection.slug}"` },
          deleted: false
        }
      });

      for (const card of affectedCards) {
        const collections = card.collections ? JSON.parse(card.collections) : [];
        const filtered = Array.isArray(collections)
          ? collections.filter((c: string) => c !== collection.slug)
          : [];

        await tx.card.update({
          where: { id: card.id, userId },
          data: { collections: JSON.stringify(filtered) }
        });
      }
    }

    // Soft delete the collection
    await tx.collection.update({
      where: { id, userId },
      data: {
        deleted: true,
        deletedAt: now
      }
    });
  });

  revalidateTag('collections');
}

export async function pinnedCollections(userId: string, limit = 8) {
  const collections = await prisma.collection.findMany({
    where: {
      userId,
      pinned: true,
      parentId: null, // Only root-level Pawkits
      deleted: false,
      inDen: false
    },
    orderBy: { updatedAt: "desc" },
    take: limit
  });

  return collections.map(c => ({ ...mapCollection(c), children: [] }));
}

export async function getTrashCollections(userId: string) {
  const collections = await prisma.collection.findMany({
    where: { userId, deleted: true },
    orderBy: { deletedAt: "desc" }
  });

  return collections.map(c => ({ ...mapCollection(c), children: [] }));
}

export async function restoreCollection(userId: string, id: string) {
  return prisma.collection.update({
    where: { id, userId },
    data: {
      deleted: false,
      deletedAt: null
    }
  });
}

export async function permanentlyDeleteCollection(userId: string, id: string) {
  return prisma.collection.delete({ where: { id, userId } });
}
