/**
 * Tag Store
 * Manages tag state including unique tags, counts, and recent usage
 * Uses Zustand with persistence for recent tags
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { db } from '@/lib/db';
import { buildTagStats, type TagTreeNode, type TagStats } from '@/lib/utils/tag-hierarchy';

interface TagState {
  // Computed from Dexie (not persisted)
  uniqueTags: string[];
  tagCounts: Record<string, number>;
  tagTree: TagTreeNode[];
  isLoading: boolean;
  lastRefreshed: Date | null;

  // Persisted state
  recentTags: string[];
  pendingTags: string[]; // Tags created but not yet assigned to any card

  // Actions
  refreshTags: (workspaceId: string) => Promise<void>;
  recordTagUse: (tag: string) => void;
  getRecentTags: (limit?: number) => string[];
  createTag: (tag: string) => void;
  addTagToCard: (cardId: string, tag: string) => Promise<void>;
  removeTagFromCard: (cardId: string, tag: string) => Promise<void>;
  renameTag: (workspaceId: string, oldTag: string, newTag: string) => Promise<number>;
  deleteTag: (workspaceId: string, tag: string) => Promise<number>;
  mergeTags: (workspaceId: string, sourceTags: string[], targetTag: string) => Promise<number>;
}

// Race condition prevention: tracks the latest refresh request
let currentRefreshId = 0;

export const useTagStore = create<TagState>()(
  persist(
    (set, get) => ({
      // Initial state
      uniqueTags: [],
      tagCounts: {},
      tagTree: [],
      isLoading: false,
      lastRefreshed: null,
      recentTags: [],
      pendingTags: [],

      /**
       * Refresh tags from Dexie
       * Aggregates all tags from cards in the workspace
       * Also merges in pending tags (created but not yet assigned)
       */
      refreshTags: async (workspaceId: string) => {
        const refreshId = ++currentRefreshId;
        set({ isLoading: true });

        try {
          // Get all non-deleted cards
          const cards = await db.cards
            .where('workspaceId')
            .equals(workspaceId)
            .filter((c) => !c._deleted)
            .toArray();

          // Bail out if a newer refresh was started
          if (refreshId !== currentRefreshId) return;

          // Collect all tags from cards
          const allTags = cards.flatMap((card) => card.tags || []);

          // Build stats including tree
          const stats: TagStats = buildTagStats(allTags);

          // Get pending tags and filter out any that are now in use
          const { pendingTags } = get();
          const stillPendingTags = pendingTags.filter(
            (t) => !stats.uniqueTags.includes(t)
          );

          // Merge pending tags into unique tags (with count 0)
          const mergedUniqueTags = [...stats.uniqueTags];
          const mergedCounts = { ...stats.tagCounts };
          for (const tag of stillPendingTags) {
            if (!mergedUniqueTags.includes(tag)) {
              mergedUniqueTags.push(tag);
              mergedCounts[tag] = 0;
            }
          }

          // Sort alphabetically
          mergedUniqueTags.sort((a, b) =>
            a.toLowerCase().localeCompare(b.toLowerCase())
          );

          set({
            uniqueTags: mergedUniqueTags,
            tagCounts: mergedCounts,
            tagTree: stats.tree,
            isLoading: false,
            lastRefreshed: new Date(),
            pendingTags: stillPendingTags,
          });
        } catch (error) {
          console.error('Failed to refresh tags:', error);
          set({ isLoading: false });
        }
      },

      /**
       * Record tag usage for recent tags tracking
       */
      recordTagUse: (tag: string) => {
        const { recentTags } = get();
        // Remove existing occurrence and add to front
        const filtered = recentTags.filter((t) => t !== tag);
        set({ recentTags: [tag, ...filtered].slice(0, 10) });
      },

      /**
       * Get recent tags (filtered to still-existing tags)
       */
      getRecentTags: (limit = 5) => {
        const { recentTags, uniqueTags } = get();
        // Only return tags that still exist
        return recentTags
          .filter((t) => uniqueTags.includes(t))
          .slice(0, limit);
      },

      /**
       * Create a new tag (adds to pending until assigned to a card)
       */
      createTag: (tag: string) => {
        const trimmedTag = tag.trim();
        if (!trimmedTag) return;

        const { uniqueTags, pendingTags, tagCounts } = get();

        // Check if tag already exists (case-insensitive)
        const normalizedNew = trimmedTag.toLowerCase();
        const existingTag = uniqueTags.find(
          (t) => t.toLowerCase() === normalizedNew
        );
        if (existingTag) return;

        // Add to pending tags and update uniqueTags
        const newPendingTags = [...pendingTags, trimmedTag];
        const newUniqueTags = [...uniqueTags, trimmedTag].sort((a, b) =>
          a.toLowerCase().localeCompare(b.toLowerCase())
        );

        set({
          pendingTags: newPendingTags,
          uniqueTags: newUniqueTags,
          tagCounts: { ...tagCounts, [trimmedTag]: 0 },
        });
      },

      /**
       * Add a tag to a card
       */
      addTagToCard: async (cardId: string, tag: string) => {
        const card = await db.cards.get(cardId);
        if (!card) return;

        const currentTags = card.tags || [];
        if (currentTags.includes(tag)) return;

        const newTags = [...currentTags, tag];
        await db.cards.update(cardId, {
          tags: newTags,
          updatedAt: new Date(),
          _lastModified: new Date(),
          _synced: false,
        });

        // Record usage
        get().recordTagUse(tag);

        // Update local counts
        const { tagCounts } = get();
        set({
          tagCounts: {
            ...tagCounts,
            [tag]: (tagCounts[tag] || 0) + 1,
          },
          uniqueTags: tagCounts[tag]
            ? get().uniqueTags
            : [...get().uniqueTags, tag].sort((a, b) =>
                a.toLowerCase().localeCompare(b.toLowerCase())
              ),
        });
      },

      /**
       * Remove a tag from a card
       */
      removeTagFromCard: async (cardId: string, tag: string) => {
        const card = await db.cards.get(cardId);
        if (!card) return;

        const currentTags = card.tags || [];
        if (!currentTags.includes(tag)) return;

        const newTags = currentTags.filter((t) => t !== tag);
        await db.cards.update(cardId, {
          tags: newTags,
          updatedAt: new Date(),
          _lastModified: new Date(),
          _synced: false,
        });

        // Update local counts
        const { tagCounts, uniqueTags } = get();
        const newCount = (tagCounts[tag] || 1) - 1;

        if (newCount <= 0) {
          const { [tag]: _, ...restCounts } = tagCounts;
          set({
            tagCounts: restCounts,
            uniqueTags: uniqueTags.filter((t) => t !== tag),
          });
        } else {
          set({
            tagCounts: { ...tagCounts, [tag]: newCount },
          });
        }
      },

      /**
       * Rename a tag across all cards
       * Returns number of cards updated
       */
      renameTag: async (workspaceId: string, oldTag: string, newTag: string) => {
        if (oldTag === newTag) return 0;

        const cards = await db.cards
          .where('workspaceId')
          .equals(workspaceId)
          .filter((c) => !c._deleted && c.tags?.includes(oldTag))
          .toArray();

        if (cards.length === 0) return 0;

        // Batch update
        await db.cards.bulkUpdate(
          cards.map((card) => ({
            key: card.id,
            changes: {
              tags: card.tags.map((t) => (t === oldTag ? newTag : t)),
              updatedAt: new Date(),
              _lastModified: new Date(),
              _synced: false,
            },
          }))
        );

        // Refresh to get accurate counts
        await get().refreshTags(workspaceId);

        return cards.length;
      },

      /**
       * Delete a tag from all cards
       * Returns number of cards updated
       */
      deleteTag: async (workspaceId: string, tag: string) => {
        const cards = await db.cards
          .where('workspaceId')
          .equals(workspaceId)
          .filter((c) => !c._deleted && c.tags?.includes(tag))
          .toArray();

        if (cards.length === 0) return 0;

        // Batch update
        await db.cards.bulkUpdate(
          cards.map((card) => ({
            key: card.id,
            changes: {
              tags: card.tags.filter((t) => t !== tag),
              updatedAt: new Date(),
              _lastModified: new Date(),
              _synced: false,
            },
          }))
        );

        // Refresh to get accurate counts
        await get().refreshTags(workspaceId);

        return cards.length;
      },

      /**
       * Merge multiple tags into one
       * Returns number of cards updated
       */
      mergeTags: async (
        workspaceId: string,
        sourceTags: string[],
        targetTag: string
      ) => {
        const cards = await db.cards
          .where('workspaceId')
          .equals(workspaceId)
          .filter(
            (c) => !c._deleted && c.tags?.some((t) => sourceTags.includes(t))
          )
          .toArray();

        if (cards.length === 0) return 0;

        // Helper to compute merged tags
        const getMergedTags = (tags: string[]) => {
          let newTags = tags.filter((t) => !sourceTags.includes(t));
          if (!newTags.includes(targetTag)) {
            newTags = [...newTags, targetTag];
          }
          return newTags;
        };

        // Batch update
        await db.cards.bulkUpdate(
          cards.map((card) => ({
            key: card.id,
            changes: {
              tags: getMergedTags(card.tags),
              updatedAt: new Date(),
              _lastModified: new Date(),
              _synced: false,
            },
          }))
        );

        // Refresh to get accurate counts
        await get().refreshTags(workspaceId);

        return cards.length;
      },
    }),
    {
      name: 'pawkit-tags',
      // Only persist recent tags and pending tags, not computed data
      partialize: (state) => ({
        recentTags: state.recentTags,
        pendingTags: state.pendingTags,
      }),
    }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

export const selectUniqueTags = (state: TagState) => state.uniqueTags;
export const selectTagCounts = (state: TagState) => state.tagCounts;
export const selectTagTree = (state: TagState) => state.tagTree;
export const selectIsLoading = (state: TagState) => state.isLoading;
export const selectRecentTags = (state: TagState) => state.recentTags;

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook for tag input components
 */
export function useTagInput() {
  return useTagStore(
    useShallow((state) => ({
      uniqueTags: state.uniqueTags,
      tagCounts: state.tagCounts,
      recentTags: state.getRecentTags(5),
      isLoading: state.isLoading,
      recordTagUse: state.recordTagUse,
    }))
  );
}

/**
 * Hook for tag tree display
 */
export function useTagTree() {
  return useTagStore(
    useShallow((state) => ({
      tree: state.tagTree,
      tagCounts: state.tagCounts,
      isLoading: state.isLoading,
      refresh: state.refreshTags,
    }))
  );
}

/**
 * Hook for tag management operations
 */
export function useTagManagement() {
  return useTagStore(
    useShallow((state) => ({
      uniqueTags: state.uniqueTags,
      tagCounts: state.tagCounts,
      isLoading: state.isLoading,
      renameTag: state.renameTag,
      deleteTag: state.deleteTag,
      mergeTags: state.mergeTags,
      refresh: state.refreshTags,
    }))
  );
}
