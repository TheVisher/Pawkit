import { CollectionsGrid } from "@/components/pawkits/grid";
import { CollectionsManager } from "@/components/pawkits/manager";
import { PawkitsHeader } from "@/components/pawkits/pawkits-header";
import { collectionPreviewCards, countCards, listCards } from "@/lib/server/cards";
import { listCollections, type CollectionDTO } from "@/lib/server/collections";
import { safeHost } from "@/lib/utils/strings";

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
  const [{ tree }, rootCards, totals] = await Promise.all([
    listCollections(),
    listCards({ limit: 6 }),
    countCards()
  ]);

  const flatCollections = flattenCollections(tree);

  const previewData = await Promise.all(
    flatCollections.map(async (node) => {
      const cards = await collectionPreviewCards(node.slug, 6);
      return {
        id: node.id,
        name: node.name,
        slug: node.slug,
        count: cards.length,
        hasChildren: (node.children && node.children.length > 0) || false,
        cards: cards.map((card) => ({
          id: card.id,
          title: card.title,
          url: card.url,
          image: card.image ?? null,
          domain: card.domain ?? safeHost(card.url)
        }))
      };
    })
  );

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
