import { listCards } from "@/lib/server/cards";
import { listCollections } from "@/lib/server/collections";
import { CardModel, CollectionNode, CardStatus } from "@/lib/types";
import { LibraryWorkspace } from "@/components/library/workspace";
import { PawkitsHeader } from "@/components/pawkits/pawkits-header";
import { DEFAULT_LAYOUT, LAYOUTS, LayoutMode } from "@/lib/constants";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/get-user";

export default async function CollectionPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
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
    listCards(user.id, { q, collection: slug, status, limit: 50, cursor }),
    listCollections(user.id)
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

  // Flatten all pawkits for the move modal (only root-level pawkits)
  const allPawkits = collections.tree.map((node) => ({
    id: node.id,
    name: node.name,
    slug: node.slug,
  }));

  return (
    <div className="space-y-6">
      <PawkitsHeader parentSlug={slug} parentId={currentCollection.id} allPawkits={allPawkits} />
      <LibraryWorkspace
        initialCards={items}
        initialNextCursor={nextCursor}
        initialQuery={{ q, collection: slug, status, layout }}
        collectionsTree={collections.tree}
        collectionName={currentCollection.name}
      />
    </div>
  );
}
