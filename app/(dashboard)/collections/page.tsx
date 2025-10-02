import { CollectionsGrid } from "@/components/collections/grid";
import { CollectionsManager } from "@/components/collections/manager";
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

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-100">Collections</h1>
        <p className="text-sm text-gray-400">
          Organize cards into visual groups. Open a collection to filter the library or manage the hierarchy below.
        </p>
      </header>
      <CollectionsGrid collections={gridItems} />
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-100">Hierarchy</h2>
        <CollectionsManager tree={tree} />
      </section>
    </div>
  );
}
