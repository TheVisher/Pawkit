import { Collection, Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";
import { collectionCreateSchema, collectionUpdateSchema } from "@/lib/validators/collection";
import { slugify } from "@/lib/utils/slug";

const MAX_DEPTH = 4;

export type CollectionDTO = Collection & { children: CollectionDTO[] };

export async function listCollections() {
  const items = await prisma.collection.findMany({
    orderBy: { name: "asc" }
  });

  const nodes = new Map<string, CollectionDTO>();
  const roots: CollectionDTO[] = [];

  items.forEach((item) => {
    nodes.set(item.id, { ...item, children: [] });
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

export async function updateCollection(id: string, payload: unknown) {
  const parsed = collectionUpdateSchema.parse(payload);
  if (parsed.parentId) {
    if (parsed.parentId === id) {
      throw new Error("Collection cannot be its own parent");
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

export async function deleteCollection(id: string) {
  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection) {
    return;
  }

  await prisma.$transaction([
    prisma.collection.updateMany({
      where: { parentId: id },
      data: { parentId: collection.parentId }
    }),
    prisma.collection.delete({ where: { id } })
  ]);
}
