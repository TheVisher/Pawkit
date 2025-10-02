import { listCards } from "@/lib/server/cards";
import { listCollections } from "@/lib/server/collections";
import { CardModel, CollectionNode, CardStatus } from "@/lib/types";
import { LibraryWorkspace } from "@/components/library/workspace";
import { DEFAULT_LAYOUT, LAYOUTS, LayoutMode } from "@/lib/constants";
import { notFound } from "next/navigation";

export default async function CollectionPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const searchParamsResolved = await searchParams;

  const q = typeof searchParamsResolved.q === "string" ? searchParamsResolved.q : undefined;
  const statusParam = typeof searchParamsResolved.status === "string" ? searchParamsResolved.status : undefined;
  const status = statusParam && ["PENDING", "READY", "ERROR"].includes(statusParam) ? statusParam as "PENDING" | "READY" | "ERROR" : undefined;
  const layoutParam = typeof searchParamsResolved.layout === "string" ? (searchParamsResolved.layout as LayoutMode) : DEFAULT_LAYOUT;
  const cursor = typeof searchParamsResolved.cursor === "string" ? searchParamsResolved.cursor : undefined;

  const layout: LayoutMode = LAYOUTS.includes(layoutParam) ? layoutParam : DEFAULT_LAYOUT;

  // Fetch cards for this specific collection
  const [{ items, nextCursor }, collections] = await Promise.all([
    listCards({ q, collection: slug, status, limit: 50, cursor }),
    listCollections()
  ]);

  // Verify collection exists
  const findCollection = (nodes: any[], targetSlug: string): any => {
    for (const node of nodes) {
      if (node.slug === targetSlug) return node;
      if (node.children) {
        const found = findCollection(node.children, targetSlug);
        if (found) return found;
      }
    }
    return null;
  };

  const currentCollection = findCollection(collections.tree, slug);
  if (!currentCollection) {
    notFound();
  }

  const initialCards: CardModel[] = items.map((card) => ({
    id: card.id,
    url: card.url,
    title: card.title,
    notes: card.notes,
    status: card.status as CardStatus,
    tags: card.tags,
    collections: card.collections,
    domain: card.domain,
    image: card.image,
    description: card.description,
    metadata: card.metadata ?? null,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString()
  }));

  const tree: CollectionNode[] = collections.tree.map((node) => serializeCollection(node));

  return (
    <LibraryWorkspace
      initialCards={initialCards}
      initialNextCursor={nextCursor}
      initialQuery={{ q, collection: slug, status, layout }}
      collectionsTree={tree}
      collectionName={currentCollection.name}
    />
  );
}

function serializeCollection(node: any): CollectionNode {
  return {
    id: node.id,
    name: node.name,
    slug: node.slug,
    parentId: node.parentId,
    createdAt: node.createdAt instanceof Date ? node.createdAt.toISOString() : node.createdAt,
    updatedAt: node.updatedAt instanceof Date ? node.updatedAt.toISOString() : node.updatedAt,
    children: Array.isArray(node.children) ? node.children.map((child: any) => serializeCollection(child)) : []
  };
}
