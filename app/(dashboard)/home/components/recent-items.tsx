"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { CardModel } from "@/lib/types";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { CardImage } from "@/components/cards/card-image";

interface RecentItemsProps {
  items: CardModel[];
}

export function RecentItems({ items }: RecentItemsProps) {
  const openCardDetails = usePanelStore((state) => state.openCardDetails);

  if (items.length === 0) {
    return null;
  }

  // Show 6 items (2 rows x 3 columns)
  const displayItems = items.slice(0, 6);

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-2 shrink-0">
        <h2 className="font-medium text-sm text-foreground">Recent Items</h2>
        <Link
          href="/library"
          className="text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          View all
        </Link>
      </div>

      {/* 3x2 grid that fills available space */}
      <div className="flex-1 min-h-0 grid grid-cols-3 grid-rows-2 gap-2">
        {displayItems.map((item) => {
          const isNote = item.type === 'md-note' || item.type === 'text-note';
          const isFileCard = item.type === 'file';
          const domain = item.domain || (item.url ? new URL(item.url).hostname : null);

          return (
            <button
              key={item.id}
              onClick={() => openCardDetails(item.id)}
              className="group text-left rounded-xl overflow-hidden transition-all hover:border-accent/30 flex flex-col min-h-0"
              style={{
                background: 'var(--bg-surface-2)',
                boxShadow: 'var(--shadow-2)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {/* Image fills available space */}
              <div className="flex-1 min-h-0 overflow-hidden relative bg-surface">
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
              <div className="p-2 shrink-0">
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
