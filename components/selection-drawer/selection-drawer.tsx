"use client";

import { useEffect, useState } from "react";
import { CardModel } from "@/lib/types";
import { useSelection } from "@/lib/hooks/selection-store";
import { X, Trash2, FolderInput, Tag, Calendar, FileText, Bookmark } from "lucide-react";

export type SelectionDrawerProps = {
  cards: CardModel[];
  onBulkDelete: () => void;
  onBulkMove: () => void;
  onBulkTag?: () => void;
  onBulkSchedule?: () => void;
};

export function SelectionDrawer({ cards, onBulkDelete, onBulkMove, onBulkTag, onBulkSchedule }: SelectionDrawerProps) {
  const selectedIds = useSelection((state) => state.selectedIds);
  const toggle = useSelection((state) => state.toggle);
  const clear = useSelection((state) => state.clear);
  const [isVisible, setIsVisible] = useState(false);

  // Show drawer when 2+ items are selected
  useEffect(() => {
    setIsVisible(selectedIds.length >= 2);
  }, [selectedIds.length]);

  // Get selected cards
  const selectedCards = cards.filter((card) => selectedIds.includes(card.id));

  // Don't render if not visible
  if (!isVisible) return null;

  return (
    <>
      {/* Drawer - no backdrop, allows free interaction with cards */}
      <div
        className="fixed right-0 top-0 bottom-0 w-80 bg-surface border-l border-subtle z-50 shadow-2xl flex flex-col animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              {selectedIds.length} Selected
            </h2>
          </div>
          <button
            onClick={clear}
            className="p-1 rounded-lg hover:bg-surface-soft transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Clear selection"
          >
            <X size={20} />
          </button>
        </div>

        {/* Selected Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {selectedCards.map((card) => (
            <SelectedItemThumbnail
              key={card.id}
              card={card}
              onRemove={() => toggle(card.id)}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-subtle space-y-2 bg-surface-90">
          <button
            onClick={onBulkMove}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-surface-soft hover:bg-accent transition-colors text-foreground font-medium"
          >
            <FolderInput size={18} />
            Move to Pawkit
          </button>

          {onBulkTag && (
            <button
              onClick={onBulkTag}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-surface-soft hover:bg-accent transition-colors text-foreground font-medium"
            >
              <Tag size={18} />
              Add Tags
            </button>
          )}

          {onBulkSchedule && (
            <button
              onClick={onBulkSchedule}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-surface-soft hover:bg-accent transition-colors text-foreground font-medium"
            >
              <Calendar size={18} />
              Schedule
            </button>
          )}

          <button
            onClick={onBulkDelete}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-rose-600 hover:bg-rose-700 transition-colors text-white font-medium"
          >
            <Trash2 size={18} />
            Move to Trash
          </button>
        </div>
      </div>
    </>
  );
}

type SelectedItemThumbnailProps = {
  card: CardModel;
  onRemove: () => void;
};

function SelectedItemThumbnail({ card, onRemove }: SelectedItemThumbnailProps) {
  const isNote = card.type === "md-note" || card.type === "text-note";
  const displayTitle = card.title || (isNote ? "Untitled Note" : card.domain || card.url);
  const isPending = card.status === "PENDING";
  const isError = card.status === "ERROR";

  return (
    <div className="group relative flex items-center gap-3 p-2 rounded-lg bg-surface-soft hover:bg-surface-hover transition-colors">
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-surface relative">
        {isNote ? (
          // Note thumbnail - icon
          <div className="w-full h-full flex items-center justify-center bg-surface-soft">
            <FileText size={28} className="text-accent" strokeWidth={1.5} />
          </div>
        ) : isPending ? (
          // Loading state
          <div className="w-full h-full flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-gray-600 border-t-accent animate-spin"></div>
          </div>
        ) : isError ? (
          // Error state
          <div className="w-full h-full flex items-center justify-center bg-rose-900/20">
            <span className="text-lg">⚠️</span>
          </div>
        ) : card.image ? (
          // Card with image
          <img
            src={card.image}
            alt={displayTitle}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = "/images/logo.png";
              target.className = "w-8 h-8 opacity-50";
            }}
          />
        ) : (
          // Card without image - bookmark icon
          <div className="w-full h-full flex items-center justify-center bg-surface-soft">
            <Bookmark size={28} className="text-gray-500" />
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-foreground line-clamp-2">
          {displayTitle}
        </h3>
        {!isNote && card.domain && (
          <p className="text-xs text-muted-foreground truncate">
            {card.domain}
          </p>
        )}
        {isNote && (
          <p className="text-xs text-accent">
            {card.type === "md-note" ? "Markdown" : "Text Note"}
          </p>
        )}
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-1 rounded-md hover:bg-surface transition-colors text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
        aria-label="Remove from selection"
      >
        <X size={16} />
      </button>
    </div>
  );
}
