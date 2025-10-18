"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { CollectionNode } from "@/lib/types";
import { useDataStore } from "@/lib/stores/data-store";

type QuickAccessPawkitCardProps = {
  pawkit: CollectionNode;
};

const previewPositions = [
  "bottom-2 left-8 -rotate-6",
  "bottom-4 right-8 rotate-4",
  "bottom-1 left-1/2 -translate-x-1/2 rotate-2"
];

export function QuickAccessPawkitCard({ pawkit }: QuickAccessPawkitCardProps) {
  const [isPinned, setIsPinned] = useState(pawkit.pinned);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { cards } = useDataStore();

  // Get cards for this pawkit
  const pawkitCards = useMemo(() => {
    return cards
      .filter(card => card.collections.includes(pawkit.slug))
      .slice(0, 3);
  }, [cards, pawkit.slug]);

  const handlePinToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);

    try {
      // Use data store to update collection (local-first)
      const { updateCollection } = useDataStore.getState();
      await updateCollection(pawkit.id, { pinned: !isPinned });
      setIsPinned(!isPinned);
      // No router.refresh() needed - data store handles UI updates
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = () => {
    router.push(`/pawkits/${pawkit.slug}`);
  };

  const cardCount = useMemo(() => {
    return cards.filter(card => card.collections.includes(pawkit.slug)).length;
  }, [cards, pawkit.slug]);

  return (
    <article
      onClick={handleCardClick}
      className="card-hover group relative flex h-56 cursor-pointer flex-col overflow-hidden rounded-2xl border border-subtle bg-surface/80 p-5 transition"
    >
      <button
        onClick={handlePinToggle}
        disabled={isLoading}
        className="absolute top-3 right-3 z-20 rounded bg-surface-soft/80 p-1.5 text-muted-foreground opacity-0 transition hover:bg-surface-soft hover:text-accent group-hover:opacity-100"
        title={isPinned ? "Unpin from Quick Access" : "Pin to Quick Access"}
      >
        {isPinned ? (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
          </svg>
        )}
      </button>

      <div className="relative z-10 flex items-center justify-between pb-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent">📁</span>
          {pawkit.name}
        </span>
        <span className="text-xs text-muted-foreground">{cardCount} item{cardCount === 1 ? "" : "s"}</span>
      </div>

      <div className="relative h-full w-full">
        {pawkitCards.map((card, index) => (
          <PreviewTile 
            key={card.id} 
            card={card} 
            positionClass={previewPositions[index] ?? "bottom-6 right-8 rotate-1"} 
          />
        ))}
        {pawkitCards.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-dashed border-subtle bg-surface-soft/60 text-xs text-muted-foreground">
            No previews yet
          </div>
        )}
      </div>
    </article>
  );
}

type PreviewTileProps = {
  card: {
    id: string;
    title?: string | null;
    url: string;
    image?: string | null;
    domain?: string | null;
  };
  positionClass: string;
};

function PreviewTile({ card, positionClass }: PreviewTileProps) {
  const label = card.title || card.domain || card.url;

  return (
    <div
      className={`absolute flex w-28 flex-col overflow-hidden rounded-xl border border-subtle bg-surface shadow-xl transition group-hover:scale-105 ${positionClass}`}
    >
      {card.image ? (
        <img src={card.image} alt={label ?? "preview"} className="h-20 w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-20 items-center justify-center bg-surface-soft text-xs text-muted-foreground">
          {(label ?? "").slice(0, 18)}
        </div>
      )}
      <span className="px-3 py-2 text-[10px] text-muted-foreground truncate">{label}</span>
    </div>
  );
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
