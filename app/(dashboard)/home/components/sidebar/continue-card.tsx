"use client";

import { ExternalLink } from "lucide-react";
import { CardModel } from "@/lib/types";
import { usePanelStore } from "@/lib/hooks/use-panel-store";

interface ContinueCardProps {
  items: CardModel[];
}

export function ContinueCard({ items }: ContinueCardProps) {
  const openCardDetails = usePanelStore((state) => state.openCardDetails);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-subtle bg-surface p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center">
          <ExternalLink className="w-3.5 h-3.5 text-green-400" />
        </div>
        <h2 className="font-semibold text-sm text-foreground">Continue</h2>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const domain = item.domain || (item.url ? new URL(item.url).hostname : null);
          // For now, use a placeholder progress (can be enhanced with actual tracking)
          const progress = Math.floor(Math.random() * 60) + 20;

          return (
            <button
              key={item.id}
              onClick={() => openCardDetails(item.id)}
              className="w-full text-left p-2 rounded-lg bg-surface-soft hover:bg-surface group transition-colors"
            >
              <p className="text-xs font-medium text-foreground line-clamp-1 mb-1 group-hover:text-green-400 transition-colors">
                {item.title || domain || item.url}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{domain}</span>
                <span className="text-[10px] text-muted-foreground">{progress}%</span>
              </div>
              <div className="mt-1.5 h-0.5 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
