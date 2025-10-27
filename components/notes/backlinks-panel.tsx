"use client";

import { useEffect, useState } from "react";
import { localDb } from "@/lib/services/local-storage";
import { useDataStore } from "@/lib/stores/data-store";
import { FileText, Bookmark, Globe } from "lucide-react";

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

type CardBacklink = {
  id: string;
  sourceNoteId: string;
  linkText: string;
  linkType: 'card' | 'url';
  createdAt: string;
};

type AnyBacklink = Backlink | CardBacklink;

type OutgoingLink = {
  id: string;
  targetNoteId: string;
  linkText: string;
  createdAt: string;
};

type CardReference = {
  id: string;
  targetCardId: string;
  linkText: string;
  linkType: 'card' | 'url';
  createdAt: string;
};

export function BacklinksPanel({ noteId, onNavigate }: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<AnyBacklink[]>([]);
  const [outgoingLinks, setOutgoingLinks] = useState<OutgoingLink[]>([]);
  const [cardReferences, setCardReferences] = useState<CardReference[]>([]);
  const cards = useDataStore((state) => state.cards);

  useEffect(() => {
    async function loadLinks() {
      const [incoming, outgoing, cardRefs, cardBacklinks] = await Promise.all([
        localDb.getBacklinks(noteId),
        localDb.getNoteLinks(noteId),
        localDb.getNoteCardLinks(noteId),
        localDb.getCardBacklinks(noteId), // Get backlinks for cards too
      ]);
      
      // Combine note backlinks and card backlinks
      const allBacklinks = [...incoming, ...cardBacklinks];
      
      setBacklinks(allBacklinks);
      setOutgoingLinks(outgoing);
      setCardReferences(cardRefs);
    }

    loadLinks();
  }, [noteId]); // Removed cards dependency to reduce re-renders

  const getCardTitle = (cardId: string) => {
    const card = cards.find((c) => c.id === cardId && !c.inDen);
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
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">
                    {'linkType' in backlink ? (
                      backlink.linkType === 'card' ? <Bookmark size={14} /> : <Globe size={14} />
                    ) : (
                      <FileText size={14} />
                    )}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[BacklinksPanel] Backlink clicked:', backlink.sourceNoteId);
                      if (onNavigate) {
                        console.log('[BacklinksPanel] Calling onNavigate with:', backlink.sourceNoteId);
                        onNavigate(backlink.sourceNoteId);
                      } else {
                        console.log('[BacklinksPanel] onNavigate is not defined');
                      }
                    }}
                    className="text-sm text-accent hover:underline text-left flex-1 cursor-pointer"
                  >
                    {getCardTitle(backlink.sourceNoteId)}
                  </button>
                </div>
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[BacklinksPanel] Outgoing link clicked:', link.targetNoteId);
                    if (onNavigate) {
                      console.log('[BacklinksPanel] Calling onNavigate with:', link.targetNoteId);
                      onNavigate(link.targetNoteId);
                    } else {
                      console.log('[BacklinksPanel] onNavigate is not defined');
                    }
                  }}
                  className="text-sm text-accent hover:underline text-left w-full cursor-pointer"
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

      {/* Card References Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <span className="text-accent">
            <Globe size={16} />
          </span>
          Card References
          <span className="text-xs text-gray-500">({cardReferences.length})</span>
        </h3>

        {cardReferences.length === 0 ? (
          <p className="text-xs text-gray-500 italic">
            No card references yet. Add [[card:Title]] or [[URL]] in your content to link to bookmarks.
          </p>
        ) : (
          <div className="space-y-2">
            {cardReferences.map((ref) => (
              <div
                key={ref.id}
                className="p-3 rounded border border-gray-800 bg-gray-900/50 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">
                    {ref.linkType === 'card' ? <Bookmark size={14} /> : <Globe size={14} />}
                  </span>
                  <button
                    onClick={(e) => {
                      console.log('[BacklinksPanel] Card reference clicked:', ref.targetCardId);
                      e.preventDefault();
                      e.stopPropagation();
                      if (onNavigate) {
                        console.log('[BacklinksPanel] Calling onNavigate with:', ref.targetCardId);
                        onNavigate(ref.targetCardId);
                      } else {
                        console.log('[BacklinksPanel] onNavigate is not defined');
                      }
                    }}
                    className="text-sm text-blue-400 hover:text-blue-300 truncate hover:underline cursor-pointer text-left"
                  >
                    {getCardTitle(ref.targetCardId)}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Via: <span className="text-gray-400">[[{ref.linkText}]]</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
