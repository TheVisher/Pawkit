"use client";

import { useEffect, useState } from "react";
import { localStorage } from "@/lib/services/local-storage";
import { useDataStore } from "@/lib/stores/data-store";

type BacklinksPanelProps = {
  noteId: string;
  onNavigate?: (noteId: string) => void;
};

type Backlink = {
  id: string;
  sourceNoteId: string;
  linkText: string;
  createdAt: string;
};

type OutgoingLink = {
  id: string;
  targetNoteId: string;
  linkText: string;
  createdAt: string;
};

export function BacklinksPanel({ noteId, onNavigate }: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [outgoingLinks, setOutgoingLinks] = useState<OutgoingLink[]>([]);
  const cards = useDataStore((state) => state.cards);

  useEffect(() => {
    async function loadLinks() {
      const [incoming, outgoing] = await Promise.all([
        localStorage.getBacklinks(noteId),
        localStorage.getNoteLinks(noteId),
      ]);
      setBacklinks(incoming);
      setOutgoingLinks(outgoing);
    }

    loadLinks();

    // Reload links whenever cards change (event-driven, not polling)
    // This happens when:
    // - User creates/edits a note with links
    // - User deletes a note
    // - Data syncs from server
  }, [noteId, cards]);

  const getCardTitle = (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    return card?.title || 'Untitled Note';
  };

  return (
    <div className="space-y-6">
      {/* Backlinks Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <span className="text-accent">←</span>
          Backlinks
          <span className="text-xs text-gray-500">({backlinks.length})</span>
        </h3>

        {backlinks.length === 0 ? (
          <p className="text-xs text-gray-500 italic">
            No backlinks yet. Other notes that link to this note will appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {backlinks.map((backlink) => (
              <div
                key={backlink.id}
                className="p-3 rounded border border-gray-800 bg-gray-900/50 hover:bg-gray-800/50 transition-colors"
              >
                <button
                  onClick={() => onNavigate && onNavigate(backlink.sourceNoteId)}
                  className="text-sm text-accent hover:underline text-left w-full"
                >
                  {getCardTitle(backlink.sourceNoteId)}
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  Via: <span className="text-gray-400">[[{backlink.linkText}]]</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Outgoing Links Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <span className="text-accent">→</span>
          Outgoing Links
          <span className="text-xs text-gray-500">({outgoingLinks.length})</span>
        </h3>

        {outgoingLinks.length === 0 ? (
          <p className="text-xs text-gray-500 italic">
            No outgoing links yet. Add [[Note Title]] in your content to link to other notes.
          </p>
        ) : (
          <div className="space-y-2">
            {outgoingLinks.map((link) => (
              <div
                key={link.id}
                className="p-3 rounded border border-gray-800 bg-gray-900/50 hover:bg-gray-800/50 transition-colors"
              >
                <button
                  onClick={() => onNavigate && onNavigate(link.targetNoteId)}
                  className="text-sm text-accent hover:underline text-left w-full"
                >
                  {getCardTitle(link.targetNoteId)}
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  Via: <span className="text-gray-400">[[{link.linkText}]]</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
