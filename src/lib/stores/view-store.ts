/**
 * View Store
 * Manages view settings that are persisted to Dexie
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { db, createSyncMetadata, markModified } from '@/lib/db';
import type { LocalViewSettings } from '@/lib/db';

type Layout = 'grid' | 'masonry' | 'list' | 'timeline' | 'board';
type SortOrder = 'asc' | 'desc';
type ContentType = 'all' | 'url' | 'md-note' | 'text-note' | 'quick-note' | 'file';

interface ViewState {
  // Current view context
  currentView: string; // "library", "library:notes", "pawkit:{slug}", etc.

  // View settings (synced to Dexie)
  layout: Layout;
  sortBy: string; // 'updatedAt', 'createdAt', 'title', 'manual'
  sortOrder: SortOrder;
  showTitles: boolean;
  showUrls: boolean;
  showTags: boolean;
  cardPadding: number;

  // Manual card order (per-view, stored as array of card IDs)
  cardOrder: string[];

  // Local-only filter (not persisted)
  contentTypeFilter: ContentType;

  // Loading state
  isLoading: boolean;

  // Actions
  setCurrentView: (view: string) => void;
  setLayout: (layout: Layout) => void;
  setSortBy: (sortBy: string) => void;
  setSortOrder: (order: SortOrder) => void;
  toggleSortOrder: () => void;
  setShowTitles: (show: boolean) => void;
  setShowUrls: (show: boolean) => void;
  setShowTags: (show: boolean) => void;
  setCardPadding: (padding: number) => void;
  setContentTypeFilter: (filter: ContentType) => void;

  // Manual ordering
  setCardOrder: (ids: string[]) => void;
  reorderCards: (ids: string[]) => void; // Updates order and switches to manual sort

  // Dexie operations
  loadViewSettings: (workspaceId: string, viewKey: string) => Promise<void>;
  saveViewSettings: (workspaceId: string) => Promise<void>;
  resetToDefaults: () => void;
}

const DEFAULT_VIEW_SETTINGS = {
  layout: 'masonry' as Layout,
  sortBy: 'updatedAt',
  sortOrder: 'desc' as SortOrder,
  showTitles: true,
  showUrls: true,
  showTags: true,
  cardPadding: 2,
  cardOrder: [] as string[],
};

export const useViewStore = create<ViewState>((set, get) => ({
  // Initial state
  currentView: 'library',
  ...DEFAULT_VIEW_SETTINGS,
  contentTypeFilter: 'all',
  isLoading: false,

  // View context
  setCurrentView: (view) => set({ currentView: view }),

  // View setting actions (update local state immediately, save to Dexie)
  setLayout: (layout) => set({ layout }),

  setSortBy: (sortBy) => set({ sortBy }),

  setSortOrder: (order) => set({ sortOrder: order }),

  toggleSortOrder: () =>
    set((state) => ({ sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' })),

  setShowTitles: (show) => set({ showTitles: show }),

  setShowUrls: (show) => set({ showUrls: show }),

  setShowTags: (show) => set({ showTags: show }),

  setCardPadding: (padding) => set({ cardPadding: Math.max(0, Math.min(4, padding)) }),

  setContentTypeFilter: (filter) => set({ contentTypeFilter: filter }),

  // Manual ordering actions
  setCardOrder: (ids) => set({ cardOrder: ids }),

  reorderCards: (ids) => {
    // Update card order and switch to manual sort mode
    set({ cardOrder: ids, sortBy: 'manual' });
  },

  // Load view settings from Dexie
  loadViewSettings: async (workspaceId, viewKey) => {
    set({ isLoading: true, currentView: viewKey });

    try {
      const settings = await db.viewSettings
        .where('[workspaceId+viewKey]')
        .equals([workspaceId, viewKey])
        .first();

      if (settings) {
        set({
          layout: settings.layout as Layout,
          sortBy: settings.sortBy,
          sortOrder: settings.sortOrder as SortOrder,
          showTitles: settings.showTitles,
          showUrls: settings.showUrls,
          showTags: settings.showTags,
          cardPadding: settings.cardPadding,
          cardOrder: (settings as { cardOrder?: string[] }).cardOrder || [],
          isLoading: false,
        });
      } else {
        // No saved settings, use defaults
        set({ ...DEFAULT_VIEW_SETTINGS, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load view settings:', error);
      set({ ...DEFAULT_VIEW_SETTINGS, isLoading: false });
    }
  },

  // Save current view settings to Dexie
  saveViewSettings: async (workspaceId) => {
    const { currentView, layout, sortBy, sortOrder, showTitles, showUrls, showTags, cardPadding, cardOrder } =
      get();

    try {
      const existing = await db.viewSettings
        .where('[workspaceId+viewKey]')
        .equals([workspaceId, currentView])
        .first();

      if (existing) {
        // Update existing
        const updated = markModified({
          ...existing,
          layout,
          sortBy,
          sortOrder,
          showTitles,
          showUrls,
          showTags,
          cardPadding,
          cardOrder,
          updatedAt: new Date(),
        });
        await db.viewSettings.put(updated);
      } else {
        // Create new - cast to allow cardOrder field
        const newSettings = {
          id: crypto.randomUUID(),
          workspaceId,
          viewKey: currentView,
          layout,
          sortBy,
          sortOrder,
          showTitles,
          showUrls,
          showTags,
          cardPadding,
          cardOrder,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...createSyncMetadata(),
        } as LocalViewSettings & { cardOrder: string[] };
        await db.viewSettings.add(newSettings);
      }
    } catch (error) {
      console.error('Failed to save view settings:', error);
    }
  },

  // Reset to defaults (without saving)
  resetToDefaults: () => set({ ...DEFAULT_VIEW_SETTINGS, contentTypeFilter: 'all' }),
}));

// =============================================================================
// SELECTORS
// =============================================================================

export const selectCurrentView = (state: ViewState) => state.currentView;
export const selectLayout = (state: ViewState) => state.layout;
export const selectSortBy = (state: ViewState) => state.sortBy;
export const selectSortOrder = (state: ViewState) => state.sortOrder;
export const selectContentTypeFilter = (state: ViewState) => state.contentTypeFilter;
export const selectViewIsLoading = (state: ViewState) => state.isLoading;
export const selectCardOrder = (state: ViewState) => state.cardOrder;

export const selectDisplaySettings = (state: ViewState) => ({
  showTitles: state.showTitles,
  showUrls: state.showUrls,
  showTags: state.showTags,
  cardPadding: state.cardPadding,
});

// =============================================================================
// HOOKS
// =============================================================================

export function useViewSettings() {
  return useViewStore(
    useShallow((state) => ({
      layout: state.layout,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder,
      showTitles: state.showTitles,
      showUrls: state.showUrls,
      showTags: state.showTags,
      cardPadding: state.cardPadding,
      cardOrder: state.cardOrder,
    }))
  );
}

export function useViewActions() {
  return useViewStore(
    useShallow((state) => ({
      setLayout: state.setLayout,
      setSortBy: state.setSortBy,
      setSortOrder: state.setSortOrder,
      toggleSortOrder: state.toggleSortOrder,
      setShowTitles: state.setShowTitles,
      setShowUrls: state.setShowUrls,
      setShowTags: state.setShowTags,
      setCardPadding: state.setCardPadding,
      setCardOrder: state.setCardOrder,
      reorderCards: state.reorderCards,
      loadViewSettings: state.loadViewSettings,
      saveViewSettings: state.saveViewSettings,
      resetToDefaults: state.resetToDefaults,
    }))
  );
}

export function useContentFilter() {
  return useViewStore(
    useShallow((state) => ({
      filter: state.contentTypeFilter,
      setFilter: state.setContentTypeFilter,
    }))
  );
}

export function useLayout() {
  return useViewStore(selectLayout);
}

export function useSorting() {
  return useViewStore(
    useShallow((state) => ({
      sortBy: state.sortBy,
      sortOrder: state.sortOrder,
      setSortBy: state.setSortBy,
      toggleSortOrder: state.toggleSortOrder,
    }))
  );
}
