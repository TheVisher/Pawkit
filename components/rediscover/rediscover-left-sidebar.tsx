"use client";

import { CardModel } from "@/lib/types";
import { ChevronDown } from "lucide-react";
import Image from "next/image";

type RediscoverLeftSidebarProps = {
  queue: CardModel[];
  currentIndex: number;
  filter: "uncategorized" | "all" | "untagged" | "never-opened";
  onFilterChange: (filter: "uncategorized" | "all" | "untagged" | "never-opened") => void;
};

export function RediscoverLeftSidebar({ queue, currentIndex, filter, onFilterChange }: RediscoverLeftSidebarProps) {
  const remainingCards = queue.slice(currentIndex + 1);
  const remainingCount = remainingCards.length;

  return (
    <div className="fixed left-0 top-0 bottom-0 w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col z-50">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-foreground mb-4">Queue</h2>

        {/* Filter Dropdown */}
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => onFilterChange(e.target.value as any)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground appearance-none cursor-pointer hover:bg-white/10 transition-colors"
          >
            <option value="uncategorized">Uncategorized</option>
            <option value="all">All Bookmarks</option>
            <option value="untagged">Untagged</option>
            <option value="never-opened">Never Opened</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>

        {/* Counter */}
        <div className="mt-3 text-sm text-muted-foreground">
          {remainingCount} {remainingCount === 1 ? 'card' : 'cards'} remaining
        </div>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {remainingCards.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            No more cards in queue
          </div>
        ) : (
          remainingCards.slice(0, 10).map((card, index) => (
            <div
              key={card.id}
              className="flex gap-3 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              {/* Thumbnail */}
              <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-white/5">
                {card.image ? (
                  <Image
                    src={card.image}
                    alt={card.title || "Card"}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {card.title || "Untitled"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {card.domain || new URL(card.url || "").hostname}
                </div>
              </div>
            </div>
          ))
        )}

        {remainingCards.length > 10 && (
          <div className="text-center text-xs text-muted-foreground pt-2">
            +{remainingCards.length - 10} more
          </div>
        )}
      </div>
    </div>
  );
}
