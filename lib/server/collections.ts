import { Collection, Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";
import { collectionCreateSchema, collectionUpdateSchema } from "@/lib/validators/collection";
import { slugify } from "@/lib/utils/slug";

const MAX_DEPTH = 4;

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

export async function listCollections() {
  const items = await prisma.collection.findMany({
    where: { deleted: false },
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
}

async function ensureDepth(parentId: string | undefined | null) {
  if (!parentId) return 1;
  let depth = 1;
  let currentId: string | undefined | null = parentId;
  while (currentId) {
    const parent: Collection | null = await prisma.collection.findUnique({ where: { id: currentId } });
    if (!parent) break;
    depth += 1;
    currentId = parent.parentId;
    if (depth > MAX_DEPTH) {
      throw new Error(`Maximum depth of ${MAX_DEPTH} exceeded`);
    }
  }
  return depth;
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const baseSlug = slugify(base) || `collection-${Date.now()}`;
  const MAX_ATTEMPTS = 100;

  for (let attempt = 0; attempt <= MAX_ATTEMPTS; attempt++) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;

    const existing = await prisma.collection.findUnique({
      where: { slug: candidate },
      select: { id: true }
    });

    if (!existing || (excludeId && existing.id === excludeId)) {
      return candidate;
    }
  }

  // Final fallback: timestamp ensures uniqueness
  return `${baseSlug}-${Date.now()}`;
}

export async function createCollection(payload: unknown) {
  const parsed = collectionCreateSchema.parse(payload);
  await ensureDepth(parsed.parentId ?? null);
  const slug = await uniqueSlug(parsed.name);

  const created = await prisma.collection.create({
    data: {
      name: parsed.name,
      parentId: parsed.parentId ?? null,
      slug
    }
  });

  return created;
}

async function isDescendant(ancestorId: string, potentialDescendantId: string): Promise<boolean> {
  let currentId: string | null = potentialDescendantId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) return false; // Cycle detected
    visited.add(currentId);

    if (currentId === ancestorId) return true;

    const collection = await prisma.collection.findUnique({ where: { id: currentId } });
    currentId = collection?.parentId ?? null;
  }
  return false;
}

export async function updateCollection(id: string, payload: unknown) {
  const parsed = collectionUpdateSchema.parse(payload);
  if (parsed.parentId) {
    if (parsed.parentId === id) {
      throw new Error("Collection cannot be its own parent");
    }
    if (await isDescendant(id, parsed.parentId)) {
      throw new Error("Cannot move collection under its own descendant");
    }
    await ensureDepth(parsed.parentId);
  }

  const data: Prisma.CollectionUpdateInput = {
    ...parsed,
    parentId: parsed.parentId === undefined ? undefined : parsed.parentId ?? null
  };

  if (parsed.name) {
    data.slug = await uniqueSlug(parsed.name, id);
  }

  return prisma.collection.update({ where: { id }, data });
}

export async function deleteCollection(id: string, deleteCards = false) {
  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection) {
    return;
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Move child collections to parent (they don't get deleted)
    await tx.collection.updateMany({
      where: { parentId: id },
      data: { parentId: collection.parentId }
    });

    if (deleteCards) {
      // Soft delete all cards in this collection
      await tx.card.updateMany({
        where: {
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
          where: { id: card.id },
          data: { collections: JSON.stringify(filtered) }
        });
      }
    }

    // Soft delete the collection
    await tx.collection.update({
      where: { id },
      data: {
        deleted: true,
        deletedAt: now
      }
    });
  });
}

export async function pinnedCollections(limit = 8) {
  const collections = await prisma.collection.findMany({
    where: {
      pinned: true,
      parentId: null, // Only root-level Pawkits
      deleted: false
    },
    orderBy: { updatedAt: "desc" },
    take: limit
  });

  return collections.map(c => ({ ...mapCollection(c), children: [] }));
}

export async function getTrashCollections() {
  const collections = await prisma.collection.findMany({
    where: { deleted: true },
    orderBy: { deletedAt: "desc" }
  });

  return collections.map(c => ({ ...mapCollection(c), children: [] }));
}

export async function restoreCollection(id: string) {
  return prisma.collection.update({
    where: { id },
    data: {
      deleted: false,
      deletedAt: null
    }
  });
}

export async function permanentlyDeleteCollection(id: string) {
  return prisma.collection.delete({ where: { id } });
}
