import { listCards } from "@/lib/server/cards";
import { listCollections } from "@/lib/server/collections";
import { CardModel, CollectionNode, CardStatus } from "@/lib/types";
import { LibraryWorkspace } from "@/components/library/workspace";
import { DEFAULT_LAYOUT, LAYOUTS, LayoutMode } from "@/lib/constants";
import { LibraryHeader } from "@/components/library/library-header";

export default async function LibraryPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const collection = typeof params.collection === "string" ? params.collection : undefined;
  const statusParam = typeof params.status === "string" ? params.status : undefined;
  const status = statusParam && ["PENDING", "READY", "ERROR"].includes(statusParam) ? statusParam as "PENDING" | "READY" | "ERROR" : undefined;
  const layoutParam = typeof params.layout === "string" ? (params.layout as LayoutMode) : DEFAULT_LAYOUT;
  const cursor = typeof params.cursor === "string" ? params.cursor : undefined;

  const layout: LayoutMode = LAYOUTS.includes(layoutParam) ? layoutParam : DEFAULT_LAYOUT;

  const [{ items, nextCursor }, collections] = await Promise.all([
    listCards({ q, collection, status, limit: 50, cursor }),
    listCollections()
  ]);

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
    <div className="space-y-4">
      <LibraryHeader cardCount={initialCards.length} initialLayout={layout} />
      <LibraryWorkspace
        initialCards={initialCards}
        initialNextCursor={nextCursor}
        initialQuery={{ q, collection, status, layout }}
        collectionsTree={tree}
      />
    </div>
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
