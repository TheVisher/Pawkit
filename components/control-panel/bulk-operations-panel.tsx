"use client";

import { useEffect } from "react";
import { CardModel } from "@/lib/types";
import { useSelection } from "@/lib/hooks/selection-store";
import { X, Trash2, FolderInput, FileText, Bookmark } from "lucide-react";

export type BulkOperationsPanelProps = {
  cards: CardModel[];
  onBulkDelete: () => void;
  onBulkMove: () => void;
};

export function BulkOperationsPanel({ cards, onBulkDelete, onBulkMove }: BulkOperationsPanelProps) {
  const selectedIds = useSelection((state) => state.selectedIds);
  const toggle = useSelection((state) => state.toggle);
  const clear = useSelection((state) => state.clear);

  // Handle ESC key to clear selection and close bulk operations
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clear();
        // The useEffect in card-gallery will handle restoring previous content
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [clear]);

  // Get selected cards
  const selectedCards = cards.filter((card) => selectedIds.includes(card.id));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-foreground">
            {selectedIds.length} Selected
          </h2>
          <button
            onClick={clear}
            className="
              p-2 rounded-lg
              hover:bg-white/10
              transition-colors
              text-muted-foreground hover:text-foreground
            "
            aria-label="Clear selection"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          CMD+click to select cards, then choose an action below
        </p>
      </div>

      {/* Selected Items List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {selectedCards.map((card) => (
          <SelectedCardThumbnail
            key={card.id}
            card={card}
            onRemove={() => toggle(card.id)}
          />
        ))}
      </div>

      {/* Action Buttons - Glass Pill Style */}
      <div className="px-4 py-4 border-t border-white/10 space-y-3">
        <button
          onClick={onBulkMove}
          className="
            w-full flex items-center justify-center gap-2
            px-4 py-3 rounded-full
            backdrop-blur-md bg-white/5 border border-white/10
            hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]
            transition-all duration-200
            text-foreground font-medium text-sm
          "
        >
          <FolderInput size={18} />
          Move to Pawkit
        </button>

        <button
          onClick={onBulkDelete}
          className="
            w-full flex items-center justify-center gap-2
            px-4 py-3 rounded-full
            backdrop-blur-md bg-rose-600/20 border border-rose-600/50
            hover:bg-rose-600/30 hover:shadow-[0_0_20px_rgba(225,29,72,0.4)]
            transition-all duration-200
            text-rose-300 font-medium text-sm
          "
        >
            <Trash2 size={18} />
            Move to Trash
          </button>
      </div>
    </div>
  );
}

type SelectedCardThumbnailProps = {
  card: CardModel;
  onRemove: () => void;
};

function SelectedCardThumbnail({ card, onRemove }: SelectedCardThumbnailProps) {
  const isNote = card.type === "md-note" || card.type === "text-note";
  const displayTitle = card.title || (isNote ? "Untitled Note" : card.domain || card.url);
  const isPending = card.status === "PENDING";
  const isError = card.status === "ERROR";

  return (
    <div className="
      group relative flex items-center gap-3 p-2 rounded-xl
      backdrop-blur-md bg-white/5 border border-white/10
      hover:bg-white/10 hover:border-purple-500/30
      transition-all duration-200
    ">
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-white/5 relative">
        {isNote ? (
          // Note thumbnail - icon
          <div className="w-full h-full flex items-center justify-center">
            <FileText size={24} className="text-purple-400" strokeWidth={1.5} />
          </div>
        ) : isPending ? (
          // Loading state
          <div className="w-full h-full flex items-center justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-gray-600 border-t-purple-500 animate-spin"></div>
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
              target.src = "/logo.png";
              target.className = "w-8 h-8 opacity-50";
            }}
          />
        ) : (
          // Card without image - bookmark icon
          <div className="w-full h-full flex items-center justify-center">
            <Bookmark size={24} className="text-gray-500" />
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
          <p className="text-xs text-purple-400">
            {card.type === "md-note" ? "Markdown" : "Text Note"}
          </p>
        )}
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="
          flex-shrink-0 p-1.5 rounded-full
          backdrop-blur-md bg-white/5 border border-white/10
          hover:bg-rose-600/20 hover:border-rose-600/50
          transition-all duration-200
          text-muted-foreground hover:text-rose-300
          opacity-0 group-hover:opacity-100
        "
        aria-label="Remove from selection"
      >
        <X size={14} />
      </button>
    </div>
  );
}
