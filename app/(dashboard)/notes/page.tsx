"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, Suspense } from "react";
import { LayoutMode, LAYOUTS, DEFAULT_LAYOUT } from "@/lib/constants";
import { NotesView } from "@/components/notes/notes-view";
import { useDataStore } from "@/lib/stores/data-store";

function NotesPageContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || undefined;
  const layoutParam = searchParams.get("layout") as LayoutMode | null;

  // Read from localStorage first, then URL param, then default
  const savedLayout = typeof window !== 'undefined' ? localStorage.getItem("notes-layout") as LayoutMode | null : null;
  const layout: LayoutMode = layoutParam && LAYOUTS.includes(layoutParam)
    ? layoutParam
    : savedLayout && LAYOUTS.includes(savedLayout)
      ? savedLayout
      : DEFAULT_LAYOUT;

  // Read from global store - instant, no API calls
  const { cards, collections } = useDataStore();

  // Filter to only notes (md-note or text-note)
  const allNotes = useMemo(() => {
    let notes = cards.filter(c => c.type === 'md-note' || c.type === 'text-note');

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
      initialLayout={layout}
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
