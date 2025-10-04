import { listCards } from "@/lib/server/cards";
import { listCollections } from "@/lib/server/collections";
import { LibraryWorkspace } from "@/components/library/workspace";
import { LayoutMode } from "@/lib/constants";

type SearchParams = {
  q?: string;
  layout?: LayoutMode;
};

export default async function NotesPage({ searchParams }: { searchParams: SearchParams }) {
  const query = searchParams.q;
  const layout = (searchParams.layout as LayoutMode) || "grid";

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Notes</h1>
        <p className="text-sm text-muted-foreground">{allNotes.length} note(s)</p>
      </div>
      <LibraryWorkspace
        initialCards={allNotes}
        initialNextCursor={undefined}
        initialQuery={{ q: query, layout }}
        collectionsTree={tree}
      />
    </div>
  );
}
