"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CardDTO } from "@/lib/server/cards";

type QuickAccessCardProps = {
  card: CardDTO;
};

export function QuickAccessCard({ card }: QuickAccessCardProps) {
  const [isPinned, setIsPinned] = useState(card.pinned);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handlePinToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !isPinned })
      });

      if (response.ok) {
        setIsPinned(!isPinned);
        // Refresh the page to show updated card order
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = () => {
    window.open(card.url, "_blank");
  };

  return (
    <article
      onClick={handleCardClick}
      className="group relative flex h-full cursor-pointer flex-col justify-between rounded border border-gray-800 bg-gray-900 p-4 transition hover:border-accent/60"
    >
      <button
        onClick={handlePinToggle}
        disabled={isLoading}
        className="absolute top-2 right-2 z-10 rounded bg-gray-800/80 p-1.5 text-gray-400 opacity-0 transition hover:bg-gray-700 hover:text-accent group-hover:opacity-100"
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
        <div className="mb-3 overflow-hidden rounded bg-gray-800">
          <img src={card.image} alt={card.title ?? card.url} className="h-24 w-full object-cover" loading="lazy" />
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-gray-100 truncate" title={card.title ?? card.url}>
          {card.title || card.domain || card.url}
        </p>
        <p className="mt-1 text-xs text-gray-500 truncate">{card.url}</p>
      </div>
      <p className="mt-4 text-xs text-gray-500">Updated {formatDate(card.updatedAt)}</p>
    </article>
  );
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
