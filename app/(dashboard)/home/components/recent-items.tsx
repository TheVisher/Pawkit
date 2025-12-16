"use client";

import Link from "next/link";
import { FileText, Link2, Clipboard } from "lucide-react";
import { CardModel } from "@/lib/types";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { CardImage } from "@/components/cards/card-image";

interface RecentItemsProps {
  items: CardModel[];
}

const MAX_VISIBLE = 5;

export function RecentItems({ items }: RecentItemsProps) {
  const openCardDetails = usePanelStore((state) => state.openCardDetails);

  const displayItems = items.slice(0, MAX_VISIBLE);

  // Empty state for new users
  if (items.length === 0) {
    return (
      <div className="flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-3 shrink-0">
          <h2 className="font-medium text-sm text-foreground">Recent Items</h2>
        </div>

        {/* Empty state placeholder */}
        <div className="flex items-center justify-center py-6">
          <div className="rounded-xl p-6 border border-dashed border-subtle/50 text-center max-w-sm">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-3">
              <Link2 size={20} className="text-accent" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">
              Save your first bookmark
            </h3>
            <p className="text-xs text-muted-foreground mb-2">
              Paste a URL anywhere in the app
            </p>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/70">
              <Clipboard size={10} />
              <span>Ctrl/Cmd + V to paste</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex justify-between items-center mb-3 shrink-0">
        <h2 className="font-medium text-sm text-foreground">Recent Items</h2>
        <Link
          href="/library"
          className="text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          View all
        </Link>
      </div>

      {/* Horizontal row of cards - fills remaining height and stretches to fill width */}
      <div className="flex gap-3 overflow-hidden flex-1">
        {displayItems.map((item) => {
          const isNote = item.type === 'md-note' || item.type === 'text-note';
          const isFileCard = item.type === 'file';
          const domain = item.domain || (item.url ? new URL(item.url).hostname : null);

          return (
            <button
              key={item.id}
              onClick={() => openCardDetails(item.id)}
              className="group flex-1 min-w-0 text-left rounded-xl overflow-hidden transition-all hover:border-accent/30 flex flex-col"
              style={{
                background: 'var(--bg-surface-2)',
                boxShadow: 'var(--shadow-2)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {/* Thumbnail - fills available space */}
              <div className="flex-1 min-h-[120px] overflow-hidden relative bg-surface">
                {isNote ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface-soft">
                    <FileText className="w-8 h-8 text-accent/50" />
                  </div>
                ) : isFileCard ? (
                  <CardImage
                    card={item}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : item.image ? (
                  <img
                    src={item.image}
                    alt={item.title ?? ''}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface-soft text-muted-foreground/50 text-xs">
                    No preview
                  </div>
                )}
              </div>

              {/* Title */}
              <div className="p-3 shrink-0">
                <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-accent transition-colors">
                  {item.title || domain || item.url}
                </p>
                {domain && !isNote && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {domain}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
