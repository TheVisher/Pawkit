"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CardModel } from "@/lib/types";
import { Sparkles } from "lucide-react";

type DailyDigWidgetProps = {
  cards: CardModel[];
};

export function DailyDigWidget({ cards }: DailyDigWidgetProps) {
  const router = useRouter();

  // Get a random never-opened card
  const dailyDigCard = useMemo(() => {
    const neverOpenedCards = cards.filter(
      card =>
        card.type === "url" &&
        (!card.lastOpenedAt || card.openCount === 0) &&
        !card.deleted &&
        !card.collections?.includes('the-den')
    );

    if (neverOpenedCards.length === 0) return null;

    // Get a random card from never-opened cards
    const randomIndex = Math.floor(Math.random() * neverOpenedCards.length);
    return neverOpenedCards[randomIndex];
  }, [cards]);

  // Count total never-opened cards
  const neverOpenedCount = useMemo(() => {
    return cards.filter(
      card =>
        card.type === "url" &&
        (!card.lastOpenedAt || card.openCount === 0) &&
        !card.deleted &&
        !card.collections?.includes('the-den')
    ).length;
  }, [cards]);

  if (!dailyDigCard) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/10 backdrop-blur-sm p-6 relative overflow-hidden group hover:border-accent/50 transition-all cursor-pointer"
      onClick={() => router.push('/library?mode=rediscover')}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-50" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 group-hover:bg-accent/30 transition-colors">
            <Sparkles className="h-5 w-5 text-accent animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Daily Dig</h3>
            <p className="text-sm text-muted-foreground">
              {neverOpenedCount} bookmark{neverOpenedCount !== 1 ? 's' : ''} waiting to be discovered
            </p>
          </div>
        </div>

        {/* Card Preview */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          {dailyDigCard.image && (
            <img
              src={dailyDigCard.image}
              alt={dailyDigCard.title || "Card preview"}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground truncate mb-1">
              {dailyDigCard.title || dailyDigCard.domain || dailyDigCard.url}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              {dailyDigCard.domain || dailyDigCard.url}
            </p>
            <p className="text-xs text-accent/70 mt-2">
              Click to explore in Rediscover mode →
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
