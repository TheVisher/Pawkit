"use client";

import { CardDTO } from "@/lib/server/cards";
import { Link2, FileText, StickyNote, GripVertical } from "lucide-react";
import { CardContextMenuWrapper } from "@/components/cards/card-context-menu";
import { useDataStore } from "@/lib/stores/data-store";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { useToastStore } from "@/lib/stores/toast-store";

interface BoardCardProps {
  card: CardDTO;
  onClick?: () => void;
  isDragging?: boolean;
  isDragOverlay?: boolean;
}

export function BoardCard({ card, onClick, isDragging, isDragOverlay }: BoardCardProps) {
  const { updateCard, deleteCard } = useDataStore();
  const pinnedNoteIds = useSettingsStore((state) => state.pinnedNoteIds);
  const pinNote = useSettingsStore((state) => state.pinNote);
  const unpinNote = useSettingsStore((state) => state.unpinNote);

  const isNote = card.type === "md-note" || card.type === "text-note";
  const isPinned = pinnedNoteIds.includes(card.id);

  // Get card type icon
  const getCardIcon = () => {
    if (isNote) {
      return <StickyNote size={12} className="text-purple-400" />;
    }
    if (card.type === "url") {
      return <Link2 size={12} className="text-blue-400" />;
    }
    return <FileText size={12} className="text-muted-foreground" />;
  };

  // Get display title
  const displayTitle = card.title || card.url || "Untitled";

  // Get preview text - for notes, use card.content; for URLs, use description
  const getPreviewText = () => {
    if (isNote && card.content) {
      // Strip markdown symbols but keep text
      const plainText = card.content
        .replace(/[#*_~`]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Convert links to text
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // Remove images
        .trim();
      // Return first ~100 characters
      return plainText.length > 100 ? plainText.substring(0, 100) + "..." : plainText;
    }
    // For non-notes, use notes field or description
    return card.notes || card.description;
  };

  const previewText = getPreviewText();

  // Safely parse URL domain
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

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
    } catch {
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

  // For drag overlay, render without context menu wrapper
  const cardContent = (
    <div
      onClick={isDragOverlay ? undefined : onClick}
      className={`bg-surface border border-subtle rounded-lg p-3 cursor-pointer hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 transition-all group ${
        isDragging ? "shadow-2xl ring-2 ring-accent/50 border-accent" : ""
      }`}
    >
      {/* Card Header */}
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex-shrink-0 flex items-center gap-1">
          <GripVertical size={12} className="text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
          {getCardIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
            {displayTitle}
          </h4>
        </div>
      </div>

      {/* Preview Text - now shows note content for notes */}
      {previewText && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">
          {previewText}
        </p>
      )}

      {/* Thumbnail */}
      {card.image && (
        <div className="mt-2 rounded overflow-hidden">
          <img
            src={card.image}
            alt=""
            className="w-full h-20 object-cover"
          />
        </div>
      )}

      {/* Tags (excluding status tags) */}
      {card.tags && card.tags.filter(t => !t.startsWith("status:")).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {card.tags
            .filter(t => !t.startsWith("status:"))
            .slice(0, 3)
            .map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent"
              >
                {tag}
              </span>
            ))}
          {card.tags.filter(t => !t.startsWith("status:")).length > 3 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-soft text-muted-foreground">
              +{card.tags.filter(t => !t.startsWith("status:")).length - 3}
            </span>
          )}
        </div>
      )}

      {/* URL domain for bookmarks */}
      {card.type === "url" && card.url && (
        <div className="mt-2 text-[10px] text-muted-foreground truncate">
          {getDomain(card.url)}
        </div>
      )}
    </div>
  );

  // For drag overlay, skip context menu
  if (isDragOverlay) {
    return cardContent;
  }

  // Wrap with context menu
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
      {cardContent}
    </CardContextMenuWrapper>
  );
}
