"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, Suspense } from "react";
import { NotesView } from "@/components/notes/notes-view";
import { useDataStore } from "@/lib/stores/data-store";

function NotesPageContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || undefined;

  // Read from global store - instant, no API calls
  const { cards, collections } = useDataStore();

  // Filter to only notes (md-note or text-note) and exclude Den cards
  const allNotes = useMemo(() => {
    let notes = cards.filter(c =>
      (c.type === 'md-note' || c.type === 'text-note') && !c.inDen
    );

    // Apply search filter if present
    if (q) {
      const query = q.toLowerCase();
      notes = notes.filter(note =>
        note.title?.toLowerCase().includes(query) ||
        note.content?.toLowerCase().includes(query) ||
        note.notes?.toLowerCase().includes(query)
      );
    }

    // Sort by creation date
    return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [cards, q]);

  return (
    <NotesView
      initialCards={allNotes}
      collectionsTree={collections}
      query={q}
    />
  );
}

export default function NotesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotesPageContent />
    </Suspense>
  );
}
