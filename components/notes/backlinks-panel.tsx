"use client";

import { CardModel } from "@/lib/types";
import { FileText, Link2 } from "lucide-react";

type BacklinksPanelProps = {
  noteId: string;
  backlinks: Array<{
    id: string;
    title: string | null;
    content: string | null;
    createdAt: string;
  }>;
  linkedCards: Array<{
    id: string;
    title: string | null;
    url: string;
    image: string | null;
    domain: string | null;
  }>;
  onNoteClick: (noteId: string) => void;
  onCardClick: (cardId: string) => void;
};

export function BacklinksPanel({
  noteId,
  backlinks,
  linkedCards,
  onNoteClick,
  onCardClick
}: BacklinksPanelProps) {
  return (
    <div className="space-y-6">
      {/* Backlinks Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Linked From ({backlinks.length})
        </h3>
        {backlinks.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No notes link to this note yet</p>
        ) : (
          <div className="space-y-2">
            {backlinks.map((backlink) => (
              <button
                key={backlink.id}
                onClick={() => onNoteClick(backlink.id)}
                className="w-full text-left p-3 rounded-lg border border-gray-800 hover:border-accent hover:bg-gray-900/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-200 truncate">
                      {backlink.title || "Untitled Note"}
                    </h4>
                    {backlink.content && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {backlink.content.substring(0, 150)}...
                      </p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(backlink.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Linked Cards Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Linked Bookmarks ({linkedCards.length})
        </h3>
        {linkedCards.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No bookmarks linked yet</p>
        ) : (
          <div className="space-y-2">
            {linkedCards.map((card) => (
              <button
                key={card.id}
                onClick={() => onCardClick(card.id)}
                className="w-full text-left p-3 rounded-lg border border-gray-800 hover:border-accent hover:bg-gray-900/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {card.image ? (
                    <img
                      src={card.image}
                      alt={card.title || ""}
                      className="w-12 h-12 object-cover rounded flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
                      <Link2 className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-200 truncate">
                      {card.title || card.domain || card.url}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {card.domain || new URL(card.url).hostname}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add Link Instructions */}
      <div className="p-3 rounded-lg bg-gray-900/50 border border-gray-800">
        <p className="text-xs text-gray-500">
          <strong className="text-gray-400">Tip:</strong> Use <code className="px-1 bg-gray-800 rounded">[[Note Title]]</code> to link notes or <code className="px-1 bg-gray-800 rounded">[[card:Title]]</code> to link bookmarks
        </p>
      </div>
    </div>
  );
}
