"use client";

import { CardModel } from "@/lib/types";
import { Heart, Trash2, Clock, FolderPlus, EyeOff } from "lucide-react";
import Image from "next/image";

type SessionStats = {
  kept: number;
  deleted: number;
  snoozed: number;
  addedToPawkit: number;
  neverShow: number;
};

type RediscoverRightSidebarProps = {
  keptCards: CardModel[];
  stats: SessionStats;
};

export function RediscoverRightSidebar({ keptCards, stats }: RediscoverRightSidebarProps) {
  const totalActions = stats.kept + stats.deleted + stats.snoozed + stats.addedToPawkit + stats.neverShow;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-black/40 backdrop-blur-xl border-l border-white/10 flex flex-col z-50">
      {/* Kept Cards Section */}
      <div className="flex-1 overflow-y-auto p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Heart className="h-5 w-5 text-accent" />
          Kept Cards
        </h2>

        {keptCards.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            No cards kept yet
          </div>
        ) : (
          <div className="space-y-3">
            {keptCards.map((card) => (
              <div
                key={card.id}
                className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
              >
                {/* Thumbnail */}
                <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-white/5">
                  {card.image ? (
                    <Image
                      src={card.image}
                      alt={card.title || "Card"}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-accent/20 to-pink-500/20" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {card.title || "Untitled"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {card.domain || (card.url ? new URL(card.url).hostname : "")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Stats Section */}
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Session Stats</h2>

        <div className="space-y-2">
          {/* Kept */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-center gap-2 text-sm">
              <Heart className="h-4 w-4 text-accent" />
              <span className="text-foreground">Kept</span>
            </div>
            <span className="text-sm font-semibold text-accent">{stats.kept}</span>
          </div>

          {/* Added to Pawkit */}
          {stats.addedToPawkit > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-sm">
                <FolderPlus className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">Added to Pawkit</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{stats.addedToPawkit}</span>
            </div>
          )}

          {/* Deleted */}
          {stats.deleted > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 text-sm">
                <Trash2 className="h-4 w-4 text-red-400" />
                <span className="text-foreground">Deleted</span>
              </div>
              <span className="text-sm font-semibold text-red-400">{stats.deleted}</span>
            </div>
          )}

          {/* Snoozed */}
          {stats.snoozed > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">Snoozed</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{stats.snoozed}</span>
            </div>
          )}

          {/* Never Show */}
          {stats.neverShow > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-sm">
                <EyeOff className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">Hidden</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{stats.neverShow}</span>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Actions</span>
            <span className="font-semibold text-foreground">{totalActions}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
