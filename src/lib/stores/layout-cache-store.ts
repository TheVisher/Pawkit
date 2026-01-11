/**
 * Layout Cache Store
 * Caches measured card heights for masonry grid layouts
 * Persisted to IndexedDB for instant render on return visits
 */

import { create } from 'zustand';
import { db } from '@/lib/db';

interface CardHeightEntry {
  height: number;
  // Content hash for invalidation - based on fields that affect height
  contentHash: string;
  // Card width when measured (heights vary by width)
  measuredAtWidth: number;
}

interface LayoutCacheState {
  // Map of cardId -> CardHeightEntry
  heights: Map<string, CardHeightEntry>;

  // Cached container width for instant rendering on return navigation
  lastContainerWidth: number;

  // Actions
  getHeight: (cardId: string, currentWidth: number, contentHash: string) => number | null;
  setHeight: (cardId: string, height: number, width: number, contentHash: string) => void;
  setHeights: (entries: Array<{ cardId: string; height: number; width: number; contentHash: string }>) => void;
  removeHeight: (cardId: string) => void;
  clearCache: () => void;
  setLastContainerWidth: (width: number) => void;

  // Bulk operations for efficiency
  getHeightsMap: (cardIds: string[], currentWidth: number, contentHashes: Map<string, string>) => Map<string, number>;
}

// Width tolerance - if width difference is within this range, use cached height
// 20px accommodates scrollbar appearance (15-17px typical on Windows/Linux)
const WIDTH_TOLERANCE = 20;

// =============================================================================
// INDEXEDDB PERSISTENCE
// =============================================================================

// Debounced persist to avoid write storms during rapid scrolling
let persistTimeout: ReturnType<typeof setTimeout> | null = null;
const PERSIST_DEBOUNCE_MS = 1000;

/**
 * Persist heights map to IndexedDB (debounced)
 */
function schedulePersist(heights: Map<string, CardHeightEntry>): void {
  if (persistTimeout) clearTimeout(persistTimeout);
  persistTimeout = setTimeout(() => {
    persistToIndexedDB(heights);
  }, PERSIST_DEBOUNCE_MS);
}

/**
 * Write height entries to IndexedDB
 */
async function persistToIndexedDB(heights: Map<string, CardHeightEntry>): Promise<void> {
  try {
    const entries = Array.from(heights.entries()).map(([cardId, entry]) => ({
      cardId,
      height: entry.height,
      contentHash: entry.contentHash,
      measuredAtWidth: entry.measuredAtWidth,
      cachedAt: new Date(),
    }));

    if (entries.length > 0) {
      await db.layoutCache.bulkPut(entries);
    }
  } catch (error) {
    // Silently fail - cache is a performance optimization, not critical
    console.warn('[LayoutCache] Failed to persist to IndexedDB:', error);
  }
}

/**
 * Hydrate the Zustand store from IndexedDB
 * Call this on app initialization for instant render
 */
export async function hydrateLayoutCache(): Promise<void> {
  try {
    const entries = await db.layoutCache.toArray();
    if (entries.length > 0) {
      const heights = new Map<string, CardHeightEntry>();
      for (const entry of entries) {
        heights.set(entry.cardId, {
          height: entry.height,
          contentHash: entry.contentHash,
          measuredAtWidth: entry.measuredAtWidth,
        });
      }
      useLayoutCacheStore.setState({ heights });
      console.log(`[LayoutCache] Hydrated ${entries.length} entries from IndexedDB`);
    }
  } catch (error) {
    console.warn('[LayoutCache] Failed to hydrate from IndexedDB:', error);
  }
}

/**
 * Clean up stale cache entries for cards that no longer exist
 */
export async function cleanupLayoutCache(validCardIds: Set<string>): Promise<number> {
  try {
    const allEntries = await db.layoutCache.toArray();
    const staleIds = allEntries
      .filter(entry => !validCardIds.has(entry.cardId))
      .map(entry => entry.cardId);

    if (staleIds.length > 0) {
      await db.layoutCache.bulkDelete(staleIds);
      console.log(`[LayoutCache] Cleaned up ${staleIds.length} stale entries`);
    }
    return staleIds.length;
  } catch (error) {
    console.warn('[LayoutCache] Failed to cleanup:', error);
    return 0;
  }
}

export const useLayoutCacheStore = create<LayoutCacheState>((set, get) => ({
  heights: new Map(),
  lastContainerWidth: 0,

  getHeight: (cardId, currentWidth, contentHash) => {
    const entry = get().heights.get(cardId);
    if (!entry) return null;

    // Invalidate if content changed or width is significantly different
    if (entry.contentHash !== contentHash) return null;
    if (Math.abs(entry.measuredAtWidth - currentWidth) > WIDTH_TOLERANCE) return null;

    return entry.height;
  },

  setHeight: (cardId, height, width, contentHash) => {
    set((state) => {
      const newHeights = new Map(state.heights);
      newHeights.set(cardId, { height, contentHash, measuredAtWidth: width });
      return { heights: newHeights };
    });
  },

  setHeights: (entries) => {
    set((state) => {
      const newHeights = new Map(state.heights);
      for (const entry of entries) {
        newHeights.set(entry.cardId, {
          height: entry.height,
          contentHash: entry.contentHash,
          measuredAtWidth: entry.width,
        });
      }
      // Schedule debounced persist to IndexedDB
      schedulePersist(newHeights);
      return { heights: newHeights };
    });
  },

  removeHeight: (cardId) => {
    set((state) => {
      const newHeights = new Map(state.heights);
      newHeights.delete(cardId);
      return { heights: newHeights };
    });
  },

  clearCache: () => {
    set({ heights: new Map(), lastContainerWidth: 0 });
  },

  setLastContainerWidth: (width) => {
    set({ lastContainerWidth: width });
  },

  getHeightsMap: (cardIds, currentWidth, contentHashes) => {
    const result = new Map<string, number>();
    const state = get();

    for (const id of cardIds) {
      const contentHash = contentHashes.get(id);
      if (contentHash) {
        const height = state.getHeight(id, currentWidth, contentHash);
        if (height !== null) {
          result.set(id, height);
        }
      }
    }

    return result;
  },
}));

/**
 * Simple hash function - converts string to 32-bit integer hash
 * Used for fast comparison of content changes
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Content hash generator - creates a hash based on fields that affect card height
 * Used for cache invalidation when card content changes
 *
 * FIXED: Previously used content LENGTH which missed same-length edits
 * Now uses actual content for proper invalidation
 */
export function generateCardContentHash(card: {
  id: string;
  title?: string;
  image?: string;
  tags?: string[];
  type: string;
  content?: string;
  aspectRatio?: number;
}): string {
  // Use actual content for height-affecting fields (not just length)
  // This ensures cache invalidation when content changes without length change
  const parts = [
    card.type,
    card.image || '',  // URL change = new image = potentially new aspect ratio
    card.title || '',  // Full title - affects line wrapping/height
    (card.tags || []).join(','),  // Tag list affects footer height
    // AspectRatio affects image height calculations - invalidate if it changes
    String(card.aspectRatio || 0),
  ];
  return simpleHash(parts.join('|'));
}
