"use client";

import { useEffect, useState } from "react";
import { CardModel } from "@/lib/types";
import { useAuth } from "@/lib/contexts/auth-context";

const MAX_RECENT_ITEMS = 10;

export interface RecentItem {
  id: string;
  title: string;
  type: "card" | "note";
  url?: string;
  image?: string;
  timestamp: number;
}

/**
 * Get user-specific storage key for recent history
 * CRITICAL: Each user gets their own recent history to prevent data leakage
 */
function getStorageKey(userId: string | null): string {
  if (!userId) {
    return "pawkit-recent-history"; // Fallback for non-authenticated users
  }
  return `pawkit-recent-history-${userId}`;
}

/**
 * Track and retrieve recently viewed items
 * FIXED: Now user-specific to prevent history leakage between users
 */
export function useRecentHistory() {
  const { user } = useAuth();
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  // Load from localStorage on mount and when user changes
  useEffect(() => {
    const storageKey = getStorageKey(user?.id || null);

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const items = JSON.parse(stored) as RecentItem[];
        setRecentItems(items);
      } else {
        // Clear recent items if no data for this user
        setRecentItems([]);
      }
    } catch (error) {
      console.error("Failed to load recent history:", error);
      setRecentItems([]);
    }
  }, [user?.id]); // Reload when user changes

  const addToHistory = (item: Omit<RecentItem, "timestamp">) => {
    const storageKey = getStorageKey(user?.id || null);

    const newItem: RecentItem = {
      ...item,
      timestamp: Date.now(),
    };

    setRecentItems((prev) => {
      // Remove if already exists
      const filtered = prev.filter((i) => i.id !== item.id);

      // Add to front
      const updated = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);

      // Save to user-specific localStorage
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save recent history:", error);
      }

      return updated;
    });
  };

  const clearHistory = () => {
    const storageKey = getStorageKey(user?.id || null);

    setRecentItems([]);
    try {
      localStorage.removeItem(storageKey);
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
