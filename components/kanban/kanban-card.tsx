"use client";

import { MouseEvent, forwardRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CardModel } from "@/lib/types";
import { CardContextMenuWrapper } from "@/components/cards/card-context-menu";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { useDataStore } from "@/lib/stores/data-store";
import { useToastStore } from "@/lib/stores/toast-store";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { FileText, Bookmark, ExternalLink, GripVertical } from "lucide-react";
import { PRIORITY_COLORS, CardPriority } from "./kanban-types";

type KanbanCardProps = {
  card: CardModel;
  columnId: string;
  onMoveToColumn?: (cardId: string, columnId: string) => void;
  availableColumns?: { id: string; title: string }[];
  isDragOverlay?: boolean;
};

export const KanbanCard = forwardRef<HTMLDivElement, KanbanCardProps>(
  function KanbanCard(
    { card, columnId, onMoveToColumn, availableColumns = [], isDragOverlay = false },
    ref
  ) {
    const openCardDetails = usePanelStore((state) => state.openCardDetails);
    const { updateCard, deleteCard } = useDataStore();
    const pinnedNoteIds = useSettingsStore((state) => state.pinnedNoteIds);
    const pinNote = useSettingsStore((state) => state.pinNote);
    const unpinNote = useSettingsStore((state) => state.unpinNote);

    const isNote = card.type === "md-note" || card.type === "text-note";
    const isPinned = pinnedNoteIds.includes(card.id);

    // Get priority from card metadata
    const priority = (card.metadata?.priority as CardPriority) || "none";

    // Handle card click - open detail panel
    const handleClick = (e: MouseEvent) => {
      // Don't open if clicking on drag handle or during drag
      if ((e.target as HTMLElement).closest("[data-drag-handle]")) {
        return;
      }
      openCardDetails(card.id);
    };

    // Get content preview for notes
    const getContentPreview = () => {
      if (!isNote || !card.content) return null;
      // Strip markdown symbols but keep text
      const plainText = card.content
        .replace(/[#*_~`]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Convert links to text
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // Remove images
        .trim();
      // Return first ~100 characters or 2-3 lines
      const lines = plainText.split("\n").filter((line) => line.trim());
      const preview = lines.slice(0, 3).join("\n");
      return preview.length > 150 ? preview.substring(0, 150) + "..." : preview;
    };

    // Get description or content preview based on card type
    const getPreviewText = () => {
      if (isNote) {
        return getContentPreview();
      }
      return card.description;
    };

    const previewText = getPreviewText();

    // Context menu handlers
    const handleAddToPawkit = async (slug: string) => {
      const collections = card.collections?.includes(slug)
        ? card.collections
        : [...(card.collections || []), slug];
      await updateCard(card.id, { collections });
      useToastStore.getState().success("Added to Pawkit");
    };

    const handleDelete = async () => {
      await deleteCard(card.id);
      useToastStore.getState().success("Card deleted");
    };

    const handleRemoveFromPawkit = async (slug: string) => {
      const collections = (card.collections || []).filter((c) => c !== slug);
      await updateCard(card.id, { collections });
    };

    const handleRemoveFromAllPawkits = async () => {
      await updateCard(card.id, { collections: [] });
    };

    const handleFetchMetadata = async () => {
      try {
        const response = await fetch(`/api/cards/${card.id}/fetch-metadata`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: card.url }),
        });
        if (response.ok) {
          useToastStore.getState().success("Metadata refreshed");
        }
      } catch (error) {
        useToastStore.getState().error("Failed to fetch metadata");
      }
    };

    const handlePinToSidebar = () => pinNote(card.id);
    const handleUnpinFromSidebar = () => unpinNote(card.id);

    const handleMoveToFolder = async (folderId: string | null) => {
      await updateCard(card.id, { noteFolderId: folderId });
      useToastStore
        .getState()
        .success(folderId ? "Moved to folder" : "Removed from folder");
    };

    // For drag overlay, render a simplified version
    if (isDragOverlay) {
      return (
        <div
          ref={ref}
          className="w-64 rounded-lg border border-accent bg-surface p-3 shadow-xl opacity-90"
          style={{
            borderLeftWidth: "3px",
            borderLeftColor: PRIORITY_COLORS[priority],
          }}
        >
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground mt-0.5">
              {isNote ? <FileText size={14} /> : <Bookmark size={14} />}
            </span>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-foreground truncate">
                {card.title || "Untitled"}
              </h4>
            </div>
          </div>
        </div>
      );
    }

    return (
      <CardContextMenuWrapper
        onAddToPawkit={handleAddToPawkit}
        onDelete={handleDelete}
        cardCollections={card.collections || []}
        onRemoveFromPawkit={handleRemoveFromPawkit}
        onRemoveFromAllPawkits={handleRemoveFromAllPawkits}
        onFetchMetadata={!isNote ? handleFetchMetadata : undefined}
        cardId={card.id}
        cardType={card.type}
        isPinned={isPinned}
        onPinToSidebar={isNote ? handlePinToSidebar : undefined}
        onUnpinFromSidebar={isNote ? handleUnpinFromSidebar : undefined}
        currentFolderId={card.noteFolderId}
        onMoveToFolder={isNote ? handleMoveToFolder : undefined}
      >
        <div
          ref={ref}
          onClick={handleClick}
          className="group relative rounded-lg border border-subtle bg-surface p-3 cursor-pointer hover:border-accent/50 hover:shadow-md transition-all"
          style={{
            borderLeftWidth: "3px",
            borderLeftColor: PRIORITY_COLORS[priority],
          }}
        >
          {/* Drag handle */}
          <div
            data-drag-handle
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical size={14} />
          </div>

          {/* Card content */}
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground mt-0.5 flex-shrink-0">
              {isNote ? <FileText size={14} /> : <Bookmark size={14} />}
            </span>
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h4 className="text-sm font-medium text-foreground line-clamp-2 pr-6">
                {card.title || "Untitled"}
              </h4>

              {/* Thumbnail for URL cards */}
              {!isNote && card.image && (
                <div className="mt-2 rounded-md overflow-hidden bg-surface-soft">
                  <img
                    src={card.image}
                    alt=""
                    className="w-full h-24 object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Content preview - for notes show content, for URLs show description */}
              {previewText && (
                <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">
                  {previewText}
                </p>
              )}

              {/* Domain for URL cards */}
              {!isNote && card.domain && (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <ExternalLink size={10} />
                  <span className="truncate">{card.domain}</span>
                </div>
              )}

              {/* Tags/Collections */}
              {card.collections && card.collections.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {card.collections.slice(0, 2).map((collection) => (
                    <span
                      key={collection}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-surface-soft text-muted-foreground"
                    >
                      {collection}
                    </span>
                  ))}
                  {card.collections.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{card.collections.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContextMenuWrapper>
    );
  }
);

// Draggable wrapper for kanban cards
export function DraggableKanbanCard({
  card,
  columnId,
  onMoveToColumn,
  availableColumns,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: card.id,
      data: {
        type: "card",
        card,
        columnId,
      },
    });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <KanbanCard
        card={card}
        columnId={columnId}
        onMoveToColumn={onMoveToColumn}
        availableColumns={availableColumns}
      />
    </div>
  );
}
