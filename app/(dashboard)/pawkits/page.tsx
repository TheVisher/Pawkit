import { CollectionsGrid } from "@/components/pawkits/grid";
import { CollectionsManager } from "@/components/pawkits/manager";
import { PawkitsHeader } from "@/components/pawkits/pawkits-header";
import { collectionPreviewCards, countCards, listCards } from "@/lib/server/cards";
import { listCollections, type CollectionDTO } from "@/lib/server/collections";
import { safeHost } from "@/lib/utils/strings";
import { prisma } from "@/lib/server/prisma";
import { parseJsonArray } from "@/lib/utils/json";
import { requireUser } from "@/lib/auth/get-user";

function flattenCollections(nodes: CollectionDTO[]): CollectionDTO[] {
  const result: CollectionDTO[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children?.length) {
      result.push(...flattenCollections(node.children));
    }
  }
  return result;
}

export default async function CollectionsPage() {
  const user = await requireUser();

  const [{ tree }, rootCards, totals] = await Promise.all([
    listCollections(user.id),
    listCards(user.id, { limit: 6 }),
    countCards(user.id)
  ]);

  const flatCollections = flattenCollections(tree);

  // Batch fetch all cards at once to avoid N+1 queries
  const allCardsRaw = await prisma.card.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  });

  const cardsByCollection = new Map<string, typeof allCardsRaw>();

  // Group cards by collection slug
  for (const card of allCardsRaw) {
    const collections = parseJsonArray(card.collections);
    for (const collectionSlug of collections) {
      if (!cardsByCollection.has(collectionSlug)) {
        cardsByCollection.set(collectionSlug, []);
      }
      cardsByCollection.get(collectionSlug)!.push(card);
    }
  }

  const previewData = flatCollections.map((node) => {
    const cards = (cardsByCollection.get(node.slug) || []).slice(0, 6);
    return {
      id: node.id,
      name: node.name,
      slug: node.slug,
      count: cards.length,
      hasChildren: (node.children && node.children.length > 0) || false,
      isPinned: node.pinned || false,
      cards: cards.map((card) => ({
        id: card.id,
        title: card.title,
        url: card.url,
        image: card.image ?? null,
        domain: card.domain ?? safeHost(card.url)
      }))
    };
  });

  const rootPreview = {
    id: "all-cards",
    name: "All cards",
    slug: null,
    count: totals.total,
    cards: rootCards.items.map((card) => ({
      id: card.id,
      title: card.title,
      url: card.url,
      image: card.image ?? null,
      domain: card.domain ?? safeHost(card.url)
    }))
  };

  const gridItems = [rootPreview, ...previewData];

  // Get only root-level pawkits for the move modal
  const allPawkits = tree.map((node) => ({
    id: node.id,
    name: node.name,
    slug: node.slug,
  }));

  return (
    <div className="space-y-10">
      <PawkitsHeader />
      <CollectionsGrid collections={gridItems} allPawkits={allPawkits} />
      <section className="rounded-lg border border-gray-800 bg-gray-900/40 p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-2">Manage Pawkits</h2>
        <p className="text-sm text-gray-400">
          Use the sidebar to navigate Pawkits and sub-Pawkits. Click the 3-dot menu on any Pawkit card to rename, move, or delete it.
        </p>
      </section>
    </div>
  );
}
