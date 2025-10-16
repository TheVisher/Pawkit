"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CardDTO } from "@/lib/server/cards";
import { useDataStore } from "@/lib/stores/data-store";
import { useViewSettingsStore } from "@/lib/hooks/view-settings-store";

type QuickAccessCardProps = {
  card: CardDTO;
};

export function QuickAccessCard({ card }: QuickAccessCardProps) {
  const updateCardInStore = useDataStore(state => state.updateCard);
  const [isPinned, setIsPinned] = useState(card.pinned);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  // Get display settings for home view
  const viewSettings = useViewSettingsStore((state) => state.getSettings('home'));
  const { showTitles, showUrls } = viewSettings;

  const handlePinToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);

    const newPinned = !isPinned;
    setIsPinned(newPinned);

    // Update store (optimistic)
    await updateCardInStore(card.id, { pinned: newPinned });

    setIsLoading(false);
    // Refresh the page to show updated card order
    router.refresh();
  };

  const handleCardClick = () => {
    window.open(card.url, "_blank");
  };

  return (
    <article
      onClick={handleCardClick}
      className="card-hover group relative flex h-full cursor-pointer flex-col justify-between rounded-2xl border border-subtle bg-surface p-4 transition"
    >
      <button
        onClick={handlePinToggle}
        disabled={isLoading}
        className="absolute top-2 right-2 z-10 rounded bg-surface-soft/80 p-1.5 text-muted-foreground opacity-0 transition hover:bg-surface-soft hover:text-accent group-hover:opacity-100"
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

      {card.image && (
        <div className="mb-3 overflow-hidden rounded-xl bg-surface-soft">
          <img src={card.image} alt={card.title ?? card.url} className="h-24 w-full object-cover" loading="lazy" />
        </div>
      )}
      <div>
        {showTitles && (
          <p className="text-sm font-semibold text-foreground truncate" title={card.title ?? card.url}>
            {card.title || card.domain || card.url}
          </p>
        )}
        {showUrls && (
          <p className="mt-1 text-xs text-muted-foreground truncate">{card.url}</p>
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground/80">Updated {formatDate(card.updatedAt)}</p>
    </article>
  );
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
