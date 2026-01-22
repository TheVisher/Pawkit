/**
 * Layout Cache Store
 * Caches measured card heights for masonry grid layouts.
 * In-memory only (no IndexedDB/Dexie persistence).
 */

import { create } from 'zustand';

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

export async function hydrateLayoutCache(): Promise<void> {
  // No-op (in-memory only)
}

export async function cleanupLayoutCache(): Promise<number> {
  return 0;
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
 * Used for contentHash generation
 */
export function generateCardContentHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(16);
}
