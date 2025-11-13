"use client";

import { useEffect } from "react";
import { CardModel } from "@/lib/types";
import { useSettingsStore, RecentItem } from "./settings-store";

/**
 * Track and retrieve recently viewed items
 * Now synced across devices via settings store
 */
export function useRecentHistory() {
  const recentItems = useSettingsStore((state) => state.recentHistory);
  const addToHistory = useSettingsStore((state) => state.addToHistory);
  const clearHistory = useSettingsStore((state) => state.clearHistory);

  return {
    recentItems,
    addToHistory,
    clearHistory,
  };
}

/**
 * Hook to track when a card is viewed
 */
export function useTrackCardView(card: CardModel | null) {
  const { addToHistory } = useRecentHistory();

  useEffect(() => {
    if (!card) return;

    const isNote = card.type === "md-note" || card.type === "text-note";

    addToHistory({
      id: card.id,
      title: card.title || card.url || "Untitled",
      type: isNote ? "note" : "card",
      url: card.url,
      image: card.image || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id]); // Only track when card ID changes
}

// Re-export RecentItem type for backward compatibility
export type { RecentItem };
