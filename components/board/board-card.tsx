"use client";

import { CardDTO } from "@/lib/server/cards";
import { Link2, FileText, StickyNote } from "lucide-react";

interface BoardCardProps {
  card: CardDTO;
  onClick?: () => void;
}

export function BoardCard({ card, onClick }: BoardCardProps) {
  // Get card type icon
  const getCardIcon = () => {
    if (card.type === "md-note" || card.type === "text-note") {
      return <StickyNote size={12} className="text-purple-400" />;
    }
    if (card.type === "url") {
      return <Link2 size={12} className="text-blue-400" />;
    }
    return <FileText size={12} className="text-muted-foreground" />;
  };

  // Get display title
  const displayTitle = card.title || card.url || "Untitled";

  // Get preview text (from notes or description)
  const previewText = card.notes || card.description;

  return (
    <div
      onClick={onClick}
      className="bg-surface border border-subtle rounded-lg p-3 cursor-pointer hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 transition-all group"
    >
      {/* Card Header */}
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex-shrink-0">
          {getCardIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
            {displayTitle}
          </h4>
        </div>
      </div>

      {/* Preview Text */}
      {previewText && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
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
          {new URL(card.url).hostname}
        </div>
      )}
    </div>
  );
}
