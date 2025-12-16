"use client";

import { Calendar } from "lucide-react";
import { CardModel } from "@/lib/types";
import { usePanelStore } from "@/lib/hooks/use-panel-store";

interface OnThisDayCardProps {
  item: CardModel | undefined;
}

export function OnThisDayCard({ item }: OnThisDayCardProps) {
  const openCardDetails = usePanelStore((state) => state.openCardDetails);

  return (
    <div
      className="h-full rounded-xl p-3 flex flex-col min-h-0"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-2 shrink-0">
        <Calendar className="w-3 h-3 text-amber-400" />
        <span className="text-xs font-medium text-foreground">On This Day</span>
      </div>

      {item ? (
        <div className="flex-1 flex flex-col min-h-0">
          <p className="text-[10px] text-muted-foreground mb-1.5 shrink-0">1 year ago:</p>
          <button
            onClick={() => openCardDetails(item.id)}
            className="flex-1 text-left p-2 rounded-lg bg-surface-soft hover:bg-surface group transition-colors overflow-hidden"
          >
            <p className="text-xs font-medium text-foreground line-clamp-2 group-hover:text-amber-400 transition-colors">
              {item.title || item.domain || item.url}
            </p>
            {item.domain && (
              <p className="text-[10px] text-muted-foreground mt-1 truncate">{item.domain}</p>
            )}
          </button>
        </div>
      ) : (
        <div className="flex-1 flex items-center">
          <p className="text-xs text-muted-foreground/60">Nothing saved on this day last year</p>
        </div>
      )}
    </div>
  );
}
