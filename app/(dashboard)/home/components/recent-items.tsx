"use client";

import Link from "next/link";
import { FileText, Link2, Clipboard } from "lucide-react";
import { CardModel } from "@/lib/types";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { CardImage } from "@/components/cards/card-image";

interface RecentItemsProps {
  items: CardModel[];
}

export function RecentItems({ items }: RecentItemsProps) {
  const openCardDetails = usePanelStore((state) => state.openCardDetails);

  // Show 6 items (2 rows x 3 columns) - keeps layout from scrolling
  const displayItems = items.slice(0, 6);

  // Empty state for new users
  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col min-h-0 overflow-visible">
        <div className="flex justify-between items-center mb-3 shrink-0">
          <h2 className="font-medium text-sm text-foreground">Recent Items</h2>
        </div>

        {/* Empty state placeholder */}
        <div className="flex-1 flex items-center justify-center">
          <div className="rounded-xl p-6 border-2 border-dashed border-subtle/50 text-center max-w-sm">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
              <Link2 size={24} className="text-accent" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">
              Save your first bookmark
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Paste a URL anywhere in the app or use the browser extension
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
    <div className="h-full flex flex-col min-h-0 overflow-visible">
      <div className="flex justify-between items-center mb-3 shrink-0">
        <h2 className="font-medium text-sm text-foreground">Recent Items</h2>
        <Link
          href="/library"
          className="text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          View all
        </Link>
      </div>

      {/* Grid with fixed card sizes - fills available height */}
      <div className="flex-1 grid grid-cols-3 gap-3 auto-rows-max content-start overflow-visible">
        {displayItems.map((item) => {
          const isNote = item.type === 'md-note' || item.type === 'text-note';
          const isFileCard = item.type === 'file';
          const domain = item.domain || (item.url ? new URL(item.url).hostname : null);

          return (
            <button
              key={item.id}
              onClick={() => openCardDetails(item.id)}
              className="group text-left rounded-xl overflow-hidden transition-all hover:border-accent/30"
              style={{
                background: 'var(--bg-surface-2)',
                boxShadow: 'var(--shadow-2)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {/* Fixed aspect ratio image - doesn't grow */}
              <div className="aspect-video overflow-hidden relative bg-surface">
                {isNote ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface-soft">
                    <FileText className="w-6 h-6 text-accent/50" />
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
                  <div className="absolute inset-0 flex items-center justify-center bg-surface-soft text-muted-foreground/50 text-[10px]">
                    No preview
                  </div>
                )}
              </div>

              {/* Title footer - fixed height */}
              <div className="p-2">
                <p className="text-xs font-medium text-foreground line-clamp-1 group-hover:text-accent transition-colors">
                  {item.title || domain || item.url}
                </p>
                {domain && !isNote && (
                  <p className="text-[10px] text-muted-foreground truncate">
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
