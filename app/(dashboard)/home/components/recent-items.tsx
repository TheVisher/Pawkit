"use client";

import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
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

  // Limit to 6 items (2 rows x 3 columns)
  const displayItems = items.slice(0, 6);

  return (
    <div
      className="rounded-xl p-5 h-full flex flex-col"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
        borderTopColor: 'var(--border-highlight-top)',
        borderLeftColor: 'var(--border-highlight-left)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">Recent Items</h2>
        <Link
          href="/library"
          className="text-xs text-muted-foreground hover:text-accent transition-colors flex items-center gap-0.5"
        >
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 flex-1">
        {displayItems.map((item) => {
          const isNote = item.type === 'md-note' || item.type === 'text-note';
          const isFileCard = item.type === 'file';
          const domain = item.domain || (item.url ? new URL(item.url).hostname : null);

          return (
            <button
              key={item.id}
              onClick={() => openCardDetails(item.id)}
              className="card-hover group relative cursor-pointer rounded-xl overflow-hidden text-left"
              style={{
                background: 'var(--bg-surface-1)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              {/* Image/Preview area - slightly taller */}
              <div className="aspect-[16/10] overflow-hidden relative bg-surface">
                {isNote ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface-soft">
                    <FileText className="w-10 h-10 text-accent/50" />
                  </div>
                ) : isFileCard ? (
                  <CardImage
                    card={item}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                    loading="lazy"
                  />
                ) : item.image ? (
                  <img
                    src={item.image}
                    alt={item.title ?? ''}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface-soft text-muted-foreground/50 text-xs">
                    No preview
                  </div>
                )}
              </div>

              {/* Content - slightly more padding */}
              <div className="p-3">
                <h3 className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-accent transition-colors">
                  {item.title || domain || item.url}
                </h3>
                {domain && !isNote && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {domain}
                  </p>
                )}
                {isNote && item.content && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {item.content.replace(/[#*_~`\[\]]/g, '').substring(0, 50)}
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
