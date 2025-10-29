"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, Suspense, useEffect } from "react";
import { NotesView } from "@/components/notes/notes-view";
import { useDataStore } from "@/lib/stores/data-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";

function NotesPageContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || undefined;
  const setContentType = usePanelStore((state) => state.setContentType);

  // Read from global store - instant, no API calls
  const { cards, collections } = useDataStore();

  // Set the right panel content to show notes controls
  useEffect(() => {
    setContentType("notes-controls");
  }, [setContentType]);

  // Filter to only notes (md-note or text-note) and exclude Den cards and private pawkit cards
  const allNotes = useMemo(() => {
    // Build a set of private collection SLUGS for fast lookup (cards store slugs, not IDs)
    const privateCollectionSlugs = new Set<string>();
    const getAllPrivateSlugs = (nodes: any[]): void => {
      for (const node of nodes) {
        if (node.isPrivate) {
          privateCollectionSlugs.add(node.slug);
        }
        if (node.children && node.children.length > 0) {
          getAllPrivateSlugs(node.children);
        }
      }
    };
    getAllPrivateSlugs(collections);

    let notes = cards.filter(c => {
      // Must be a note type
      if (c.type !== 'md-note' && c.type !== 'text-note') return false;

      // Exclude cards in private collections (including 'the-den')
      const isInPrivateCollection = c.collections?.some(collectionSlug =>
        privateCollectionSlugs.has(collectionSlug)
      );
      if (isInPrivateCollection) return false;

      return true;
    });

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
  }, [cards, collections, q]);

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
