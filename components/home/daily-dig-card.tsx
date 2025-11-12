"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CardModel } from "@/lib/types";
import { Sparkles } from "lucide-react";

type DailyDigCardProps = {
  cards: CardModel[];
};

export function DailyDigCard({ cards }: DailyDigCardProps) {
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
    <div
      className="flex-shrink-0 w-[322px] cursor-pointer"
      onClick={() => router.push('/library?mode=rediscover')}
    >
      <article className="card-hover flex h-full flex-col justify-between rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent backdrop-blur-sm p-4 transition relative overflow-hidden group hover:border-accent/50">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-50" />

        {/* Sparkle icon in top right */}
        <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 group-hover:bg-accent/30 transition-colors">
          <Sparkles className="h-4 w-4 text-accent animate-pulse" />
        </div>

        <div className="relative z-10">
          {/* Title */}
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-accent mb-1">Daily Dig</h3>
            <p className="text-xs text-muted-foreground">
              {neverOpenedCount} bookmark{neverOpenedCount !== 1 ? 's' : ''} waiting
            </p>
          </div>

          {/* Card Preview */}
          {dailyDigCard.image && (
            <div className="mb-3 overflow-hidden rounded-xl bg-surface-soft relative">
              <img
                src={dailyDigCard.image}
                alt={dailyDigCard.title || "Card preview"}
                className="h-32 w-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Card Title */}
          <p className="text-sm font-medium text-foreground line-clamp-2 mb-1" title={dailyDigCard.title ?? dailyDigCard.url}>
            {dailyDigCard.title || dailyDigCard.domain || dailyDigCard.url}
          </p>

          {/* Domain */}
          {dailyDigCard.domain && (
            <p className="text-xs text-muted-foreground truncate">
              {dailyDigCard.domain}
            </p>
          )}
        </div>

        {/* Footer hint */}
        <p className="mt-4 text-xs text-accent/70 relative z-10">
          Click to explore in Rediscover mode →
        </p>
      </article>
    </div>
  );
}
