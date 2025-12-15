"use client";

import { Calendar } from "lucide-react";
import { CardModel } from "@/lib/types";
import { usePanelStore } from "@/lib/hooks/use-panel-store";

interface OnThisDayProps {
  item: CardModel | undefined;
}

export function OnThisDay({ item }: OnThisDayProps) {
  const openCardDetails = usePanelStore((state) => state.openCardDetails);

  return (
    <div className="rounded-xl border border-subtle bg-surface p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <h2 className="font-semibold text-sm text-foreground">On This Day</h2>
      </div>

      {item ? (
        <>
          <p className="text-xs text-muted-foreground mb-2">1 year ago you saved:</p>
          <button
            onClick={() => openCardDetails(item.id)}
            className="w-full text-left p-2 rounded-lg bg-surface-soft hover:bg-surface group transition-colors"
          >
            <p className="text-xs font-medium text-foreground line-clamp-2 group-hover:text-amber-400 transition-colors">
              {item.title || item.domain || item.url}
            </p>
            {item.domain && (
              <p className="text-[10px] text-muted-foreground mt-1">{item.domain}</p>
            )}
          </button>
        </>
      ) : (
        <p className="text-xs text-muted-foreground/60">Nothing saved on this day last year</p>
      )}
    </div>
  );
}
