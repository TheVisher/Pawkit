"use client";

import { useEffect, useState } from "react";
import { CardModel } from "@/lib/types";

const MAX_RECENT_ITEMS = 10;
const STORAGE_KEY = "pawkit-recent-history";

export interface RecentItem {
  id: string;
  title: string;
  type: "card" | "note";
  url?: string;
  image?: string;
  timestamp: number;
}

/**
 * Track and retrieve recently viewed items
 */
export function useRecentHistory() {
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored) as RecentItem[];
        setRecentItems(items);
      }
    } catch (error) {
      console.error("Failed to load recent history:", error);
    }
  }, []);

  const addToHistory = (item: Omit<RecentItem, "timestamp">) => {
    const newItem: RecentItem = {
      ...item,
      timestamp: Date.now(),
    };

    setRecentItems((prev) => {
      // Remove if already exists
      const filtered = prev.filter((i) => i.id !== item.id);

      // Add to front
      const updated = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save recent history:", error);
      }

      return updated;
    });
  };

  const clearHistory = () => {
    setRecentItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear recent history:", error);
    }
  };

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
