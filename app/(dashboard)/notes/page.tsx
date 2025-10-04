import { listCards } from "@/lib/server/cards";
import { listCollections } from "@/lib/server/collections";
import { LayoutMode, LAYOUTS, DEFAULT_LAYOUT } from "@/lib/constants";
import { NotesView } from "@/components/notes/notes-view";

type SearchParams = {
  q?: string;
  layout?: LayoutMode;
};

export default async function NotesPage({ searchParams }: { searchParams: SearchParams }) {
  const query = searchParams.q;
  const layoutParam = searchParams.layout as LayoutMode;
  const layout: LayoutMode = layoutParam && LAYOUTS.includes(layoutParam) ? layoutParam : DEFAULT_LAYOUT;

  // Fetch only note cards (md-note or text-note)
  const { items: mdNotes, nextCursor: mdCursor } = await listCards({
    q: query,
    type: "md-note",
    limit: 50
  });

  const { items: textNotes, nextCursor: textCursor } = await listCards({
    q: query,
    type: "text-note",
    limit: 50
  });

  // Combine and sort by creation date
  const allNotes = [...mdNotes, ...textNotes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const { tree } = await listCollections();

  return (
    <NotesView
      initialCards={allNotes}
      initialLayout={layout}
      collectionsTree={tree}
      query={query}
    />
  );
}
