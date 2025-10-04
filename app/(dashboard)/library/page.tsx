import { listCards } from "@/lib/server/cards";
import { listCollections } from "@/lib/server/collections";
import { CardModel, CollectionNode, CardStatus } from "@/lib/types";
import { DEFAULT_LAYOUT, LAYOUTS, LayoutMode } from "@/lib/constants";
import { LibraryView } from "@/components/library/library-view";
import { requireUser } from "@/lib/auth/get-user";

export default async function LibraryPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const collection = typeof params.collection === "string" ? params.collection : undefined;
  const statusParam = typeof params.status === "string" ? params.status : undefined;
  const status = statusParam && ["PENDING", "READY", "ERROR"].includes(statusParam) ? statusParam as "PENDING" | "READY" | "ERROR" : undefined;
  const layoutParam = typeof params.layout === "string" ? (params.layout as LayoutMode) : DEFAULT_LAYOUT;
  const cursor = typeof params.cursor === "string" ? params.cursor : undefined;

  const layout: LayoutMode = LAYOUTS.includes(layoutParam) ? layoutParam : DEFAULT_LAYOUT;

  const [{ items, nextCursor }, collections] = await Promise.all([
    listCards(user.id, { q, collection, status, limit: 50, cursor }),
    listCollections(user.id)
  ]);

  return (
    <LibraryView
      initialCards={items}
      initialNextCursor={nextCursor}
      initialLayout={layout}
      collectionsTree={collections.tree}
      query={{ q, collection, status }}
    />
  );
}
