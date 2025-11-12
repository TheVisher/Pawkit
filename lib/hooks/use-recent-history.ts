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
 *
 * LOCAL-FIRST IMPLEMENTATION:
 * 1. Tracks in recent history (localStorage)
 * 2. Updates IndexedDB immediately (10-50ms)
 * 3. UI updates instantly from Zustand state
 * 4. Syncs to Supabase in background (handled by data store)
 */
export function useTrackCardView(card: CardModel | null, accessType: 'modal' | 'external' | 'rediscover' = 'modal') {
  const { addToHistory } = useRecentHistory();

  useEffect(() => {
    if (!card) return;

    const isNote = card.type === "md-note" || card.type === "text-note";

    // Track in recent history (localStorage)
    addToHistory({
      id: card.id,
      title: card.title || card.url || "Untitled",
      type: isNote ? "note" : "card",
      url: card.url,
      image: card.image || undefined,
    });

    // LOCAL-FIRST: Update IndexedDB immediately
    // Fire-and-forget pattern - don't await to keep UI responsive
    const updateTracking = async () => {
      try {
        // Dynamically import to avoid circular dependencies
        const { useDataStore } = await import('@/lib/stores/data-store');
        const dataStore = useDataStore.getState();

        // Update card tracking in IndexedDB (instant, ~10-50ms)
        // dataStore.updateCard automatically handles:
        //   1. Save to IndexedDB (synchronous, instant)
        //   2. Update Zustand state (instant UI update)
        //   3. Background sync to Supabase (non-blocking)
        await dataStore.updateCard(card.id, {
          lastOpenedAt: new Date().toISOString(),
          openCount: (card.openCount || 0) + 1,
          lastAccessType: accessType
        });
      } catch (err) {
        console.error('[useTrackCardView] Failed to track card view:', err);
      }
    };

    // Fire and forget - don't block UI
    updateTracking();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id]); // Only track when card ID changes
}
