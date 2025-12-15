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

  return (
    <div className="rounded-xl border border-subtle bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-foreground">Recent Items</h2>
        <Link
          href="/library"
          className="text-xs text-muted-foreground hover:text-accent transition-colors flex items-center gap-0.5"
        >
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {items.map((item) => {
          const isNote = item.type === 'md-note' || item.type === 'text-note';
          const isFileCard = item.type === 'file';
          const domain = item.domain || (item.url ? new URL(item.url).hostname : null);

          return (
            <button
              key={item.id}
              onClick={() => openCardDetails(item.id)}
              className="group text-left bg-surface-soft rounded-xl overflow-hidden hover:ring-1 hover:ring-accent/30 transition-all"
            >
              {/* Image/Preview area */}
              <div className="aspect-video overflow-hidden relative bg-surface">
                {isNote ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface-soft">
                    <FileText className="w-8 h-8 text-accent/50" />
                  </div>
                ) : isFileCard ? (
                  <CardImage
                    card={item}
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all"
                    loading="lazy"
                  />
                ) : item.image ? (
                  <img
                    src={item.image}
                    alt={item.title ?? ''}
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface-soft text-muted-foreground/50 text-xs">
                    No preview
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-2.5">
                <h3 className="text-xs font-medium text-foreground line-clamp-1 group-hover:text-accent transition-colors">
                  {item.title || domain || item.url}
                </h3>
                {domain && !isNote && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {domain}
                  </p>
                )}
                {isNote && item.content && (
                  <p className="text-[10px] text-muted-foreground line-clamp-1">
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
