/**
 * Tag Store
 * Manages tag state including unique tags, counts, and recent usage
 * Recent tags are synced across devices via workspace preferences
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { db } from '@/lib/db';
import type { WorkspacePreferences } from '@/lib/db';
import { buildTagStats, type TagTreeNode, type TagStats } from '@/lib/utils/tag-hierarchy';
import { triggerSync, addToQueue } from '@/lib/services/sync-queue';

interface TagState {
  // Computed from Dexie (not persisted)
  uniqueTags: string[];
  tagCounts: Record<string, number>;
  tagTree: TagTreeNode[];
  isLoading: boolean;
  lastRefreshed: Date | null;

  // Synced via workspace preferences
  recentTags: string[];
  pendingTags: string[]; // Tags created but not yet assigned to any card

  // Current workspace ID for sync operations
  currentWorkspaceId: string | null;

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

  // Internal: persist recentTags to workspace
  _persistRecentTags: () => Promise<void>;
  // Internal: load recentTags from workspace
  _loadRecentTags: (workspaceId: string) => Promise<void>;
}

// Race condition prevention: tracks the latest refresh request
let currentRefreshId = 0;

// Debounce timer for persisting recent tags
let persistDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useTagStore = create<TagState>()((set, get) => ({
  // Initial state
  uniqueTags: [],
  tagCounts: {},
  tagTree: [],
  isLoading: false,
  lastRefreshed: null,
  recentTags: [],
  pendingTags: [],
  currentWorkspaceId: null,

  /**
   * Refresh tags from Dexie
   * Aggregates all tags from cards in the workspace
   * Also merges in pending tags (created but not yet assigned)
   * Loads recentTags from workspace preferences
   */
  refreshTags: async (workspaceId: string) => {
    const refreshId = ++currentRefreshId;
    set({ isLoading: true, currentWorkspaceId: workspaceId });

    try {
      // Load recent tags from workspace preferences (if workspace changed)
      const currentWs = get().currentWorkspaceId;
      if (currentWs !== workspaceId) {
        await get()._loadRecentTags(workspaceId);
      }

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
        currentWorkspaceId: workspaceId,
      });
    } catch (error) {
      console.error('Failed to refresh tags:', error);
      set({ isLoading: false });
    }
  },

  /**
   * Load recent tags from workspace preferences in Dexie
   */
  _loadRecentTags: async (workspaceId: string) => {
    try {
      const workspace = await db.workspaces.get(workspaceId);
      if (workspace?.preferences?.recentTags) {
        set({ recentTags: workspace.preferences.recentTags });
      } else {
        set({ recentTags: [] });
      }
    } catch (error) {
      console.error('Failed to load recent tags:', error);
    }
  },

  /**
   * Persist recent tags to workspace preferences in Dexie
   * Debounced to avoid excessive writes
   */
  _persistRecentTags: async () => {
    const { recentTags, currentWorkspaceId } = get();
    if (!currentWorkspaceId) return;

    try {
      const workspace = await db.workspaces.get(currentWorkspaceId);
      if (!workspace) return;

      // Merge with existing preferences
      const updatedPreferences: WorkspacePreferences = {
        ...workspace.preferences,
        recentTags,
      };

      // Update workspace in Dexie
      await db.workspaces.update(currentWorkspaceId, {
        preferences: updatedPreferences,
        updatedAt: new Date(),
        _lastModified: new Date(),
        _synced: false,
      });

      // Queue workspace for sync (with skipConflictCheck since this is a local preference update)
      await addToQueue('workspace', currentWorkspaceId, 'update', {
        preferences: updatedPreferences,
      }, { skipConflictCheck: true });

      // Trigger sync after a short delay
      triggerSync();
    } catch (error) {
      console.error('Failed to persist recent tags:', error);
    }
  },

  /**
   * Record tag usage for recent tags tracking
   * Syncs to workspace preferences
   */
  recordTagUse: (tag: string) => {
    const { recentTags } = get();
    // Remove existing occurrence and add to front
    const filtered = recentTags.filter((t) => t !== tag);
    const newRecentTags = [tag, ...filtered].slice(0, 10);
    set({ recentTags: newRecentTags });

    // Debounce the persist operation
    if (persistDebounceTimer) {
      clearTimeout(persistDebounceTimer);
    }
    persistDebounceTimer = setTimeout(() => {
      get()._persistRecentTags();
    }, 1000); // 1 second debounce
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
   * Tags are normalized to lowercase for consistent matching
   */
  addTagToCard: async (cardId: string, tag: string) => {
    const card = await db.cards.get(cardId);
    if (!card) return;

    // Normalize tag to lowercase
    const normalizedTag = tag.toLowerCase();

    const currentTags = card.tags || [];
    if (currentTags.includes(normalizedTag)) return;

    const newTags = [...currentTags, normalizedTag];
    await db.cards.update(cardId, {
      tags: newTags,
      updatedAt: new Date(),
      _lastModified: new Date(),
      _synced: false,
    });

    // Record usage (with normalized tag)
    get().recordTagUse(normalizedTag);

    // Update local counts (using normalized tag)
    const { tagCounts } = get();
    set({
      tagCounts: {
        ...tagCounts,
        [normalizedTag]: (tagCounts[normalizedTag] || 0) + 1,
      },
      uniqueTags: tagCounts[normalizedTag]
        ? get().uniqueTags
        : [...get().uniqueTags, normalizedTag].sort((a, b) =>
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

    // Update recentTags if the renamed tag was in there
    const { recentTags } = get();
    if (recentTags.includes(oldTag)) {
      const updatedRecentTags = recentTags.map((t) => (t === oldTag ? newTag : t));
      set({ recentTags: updatedRecentTags });
      get()._persistRecentTags();
    }

    // Refresh to get accurate counts
    await get().refreshTags(workspaceId);

    triggerSync();

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

    // Remove from recentTags if present
    const { recentTags } = get();
    if (recentTags.includes(tag)) {
      const updatedRecentTags = recentTags.filter((t) => t !== tag);
      set({ recentTags: updatedRecentTags });
      get()._persistRecentTags();
    }

    // Refresh to get accurate counts
    await get().refreshTags(workspaceId);

    triggerSync();

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

    // Update recentTags: remove source tags, add target tag if any source tag was recent
    const { recentTags } = get();
    const hasSourceInRecent = recentTags.some((t) => sourceTags.includes(t));
    if (hasSourceInRecent) {
      let updatedRecentTags = recentTags.filter((t) => !sourceTags.includes(t));
      if (!updatedRecentTags.includes(targetTag)) {
        updatedRecentTags = [targetTag, ...updatedRecentTags];
      }
      set({ recentTags: updatedRecentTags.slice(0, 10) });
      get()._persistRecentTags();
    }

    // Refresh to get accurate counts
    await get().refreshTags(workspaceId);

    triggerSync();

    return cards.length;
  },
}));

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
