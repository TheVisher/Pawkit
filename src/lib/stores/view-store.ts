/**
 * View Store
 * Manages view settings that are persisted to Dexie
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { db, createSyncMetadata, markModified } from '@/lib/db';
import type { LocalViewSettings } from '@/lib/db';

export type Layout = 'grid' | 'masonry' | 'list' | 'timeline' | 'board';
export type SortOrder = 'asc' | 'desc';
// Content type filters - matches V1 categories
export type ContentType = 'bookmarks' | 'notes' | 'quick-notes' | 'video' | 'images' | 'docs' | 'audio' | 'other';
export type CardSize = 'small' | 'medium' | 'large' | 'xl';
export type SubPawkitSize = 'compact' | 'normal' | 'large';
export type PawkitOverviewSize = 'small' | 'medium' | 'large';
export type PawkitOverviewSortBy = 'manual' | 'alphabetical' | 'dateCreated' | 'dateModified' | 'itemCount';
// Grouping options
export type GroupBy = 'none' | 'date' | 'tags' | 'type' | 'domain';
export type DateGrouping = 'smart' | 'day' | 'week' | 'month' | 'year'; // smart = Today/Yesterday/This Week/etc
// Unsorted/Quick filters
export type UnsortedFilter = 'none' | 'no-pawkits' | 'no-tags' | 'both';
// Reading status filter
export type ReadingFilter = 'all' | 'unread' | 'in-progress' | 'read';
// Link status filter
export type LinkStatusFilter = 'all' | 'ok' | 'broken' | 'redirect' | 'unchecked';
// Scheduled status filter
export type ScheduledFilter = 'all' | 'scheduled' | 'overdue' | 'not-scheduled';

// File extensions for uploaded files
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
const DOC_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.csv'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma'];

/**
 * Get the content type category for a card
 */
function getCardContentType(card: { type: string; url: string; domain?: string }): ContentType {
  const url = card.url?.toLowerCase() || '';

  // Quick Notes (separate from full notes)
  if (card.type === 'quick-note') {
    return 'quick-notes';
  }

  // Notes (full notes)
  if (['md-note', 'text-note', 'note'].includes(card.type)) {
    return 'notes';
  }

  // File uploads - check extensions
  if (card.type === 'file' || VIDEO_EXTENSIONS.some(ext => url.endsWith(ext))) {
    if (VIDEO_EXTENSIONS.some(ext => url.endsWith(ext))) return 'video';
    if (AUDIO_EXTENSIONS.some(ext => url.endsWith(ext))) return 'audio';
    if (IMAGE_EXTENSIONS.some(ext => url.endsWith(ext))) return 'images';
    if (DOC_EXTENSIONS.some(ext => url.endsWith(ext))) return 'docs';
    return 'other'; // Unknown file type
  }

  // URL bookmarks - check if it's a direct media link
  if (card.type === 'url') {
    if (VIDEO_EXTENSIONS.some(ext => url.endsWith(ext))) return 'video';
    if (AUDIO_EXTENSIONS.some(ext => url.endsWith(ext))) return 'audio';
    if (IMAGE_EXTENSIONS.some(ext => url.endsWith(ext))) return 'images';
    if (DOC_EXTENSIONS.some(ext => url.endsWith(ext))) return 'docs';
    return 'bookmarks'; // Regular web bookmark
  }

  return 'other';
}

/**
 * Check if a card matches any of the selected content type filters
 */
export function cardMatchesContentTypes(
  card: { type: string; url: string; domain?: string },
  filters: ContentType[]
): boolean {
  // No filters selected = show all
  if (filters.length === 0) return true;

  const cardType = getCardContentType(card);
  return filters.includes(cardType);
}

/**
 * Check if a card matches the unsorted filter criteria
 */
export function cardMatchesUnsortedFilter(
  card: { tags?: string[]; collections?: string[] },
  filter: UnsortedFilter
): boolean {
  if (filter === 'none') return true;

  const hasTags = (card.tags || []).length > 0;
  const hasPawkits = (card.collections || []).length > 0;

  switch (filter) {
    case 'no-pawkits': return !hasPawkits;
    case 'no-tags': return !hasTags;
    case 'both': return !hasTags && !hasPawkits;
    default: return true;
  }
}

/**
 * Check if a card matches the reading status filter
 * Note: Only applies to bookmark cards (type === 'url'), not notes
 */
export function cardMatchesReadingFilter(
  card: { type: string; isRead?: boolean; readProgress?: number },
  filter: ReadingFilter
): boolean {
  if (filter === 'all') return true;

  // Notes don't have reading status, so show them in 'all' mode only
  if (['md-note', 'text-note', 'quick-note'].includes(card.type)) {
    return false; // Exclude notes when filtering by reading status
  }

  switch (filter) {
    case 'unread':
      return !card.isRead && (!card.readProgress || card.readProgress === 0);
    case 'in-progress':
      return !card.isRead && card.readProgress !== undefined && card.readProgress > 0;
    case 'read':
      return card.isRead === true;
    default:
      return true;
  }
}

/**
 * Check if a card matches the link status filter
 * Note: Only applies to bookmark cards (type === 'url'), not notes
 */
export function cardMatchesLinkStatusFilter(
  card: { type: string; linkStatus?: string },
  filter: LinkStatusFilter
): boolean {
  if (filter === 'all') return true;

  // Notes don't have link status, so show them in 'all' mode only
  if (['md-note', 'text-note', 'quick-note'].includes(card.type)) {
    return false; // Exclude notes when filtering by link status
  }

  const cardStatus = card.linkStatus || 'unchecked';
  return cardStatus === filter;
}

/**
 * Find duplicate cards in a list based on normalized URLs
 * Returns a Set of card IDs that have at least one duplicate
 */
export function findDuplicateCardIds(
  cards: Array<{ id: string; url: string; type: string; _deleted?: boolean }>
): Set<string> {
  // Import dynamically to avoid circular deps - we'll use inline normalization
  const normalizeUrl = (url: string): string => {
    try {
      const parsed = new URL(url);
      let hostname = parsed.hostname.toLowerCase();
      if (hostname.startsWith('www.')) hostname = hostname.slice(4);
      let pathname = parsed.pathname;
      if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
      return `${parsed.protocol}//${hostname}${pathname}`;
    } catch {
      return url.toLowerCase().trim();
    }
  };

  const duplicateIds = new Set<string>();
  const urlToCards = new Map<string, string[]>();

  // Group cards by normalized URL
  for (const card of cards) {
    if (card._deleted || card.type !== 'url' || !card.url) continue;

    const normalizedUrl = normalizeUrl(card.url);
    const existing = urlToCards.get(normalizedUrl) || [];
    existing.push(card.id);
    urlToCards.set(normalizedUrl, existing);
  }

  // Mark all cards that have duplicates
  for (const [, cardIds] of urlToCards) {
    if (cardIds.length > 1) {
      for (const id of cardIds) {
        duplicateIds.add(id);
      }
    }
  }

  return duplicateIds;
}

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
  cardPadding: number; // 0-40 pixels
  cardSpacing: number; // 0-40 pixels (gap between cards)

  // Card display settings
  cardSize: CardSize; // small, medium, large, xl
  showMetadataFooter: boolean; // Toggle card footer (title, tags inside card)

  // Manual card order (per-view, stored as array of card IDs)
  cardOrder: string[];

  // List view column settings (persisted)
  listColumnOrder: string[];
  listColumnWidths: Record<string, number>;
  listColumnVisibility: Record<string, boolean>;

  // Local-only filters (not persisted)
  contentTypeFilters: ContentType[]; // Multi-select, OR logic
  selectedTags: string[]; // Filter by these tags (AND logic)
  unsortedFilter: UnsortedFilter; // Quick filter for unorganized items (legacy, kept for compat)
  readingFilter: ReadingFilter; // Filter by reading status (legacy, kept for compat)
  showNoTagsOnly: boolean; // Filter to show only cards with no tags
  showNoPawkitsOnly: boolean; // Filter to show only cards not in any Pawkit
  linkStatusFilter: LinkStatusFilter; // Filter by link health status
  scheduledFilter: ScheduledFilter; // Filter by scheduled status
  showDuplicatesOnly: boolean; // Show only cards with duplicate URLs

  // Grouping (persisted)
  groupBy: GroupBy;
  dateGrouping: DateGrouping; // Only used when groupBy === 'date'

  // Sub-Pawkits display (persisted, for pawkit views)
  subPawkitSize: SubPawkitSize;
  subPawkitColumns: number; // 2-6 columns

  // Pawkits Overview display (persisted, for /pawkits main page)
  pawkitOverviewSize: PawkitOverviewSize;
  pawkitOverviewColumns: number; // 2-6 columns
  pawkitOverviewShowThumbnails: boolean;
  pawkitOverviewShowItemCount: boolean;
  pawkitOverviewSortBy: PawkitOverviewSortBy;

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
  setCardSpacing: (spacing: number) => void;
  setCardSize: (size: CardSize) => void;
  setShowMetadataFooter: (show: boolean) => void;
  toggleContentType: (type: ContentType) => void; // Add/remove content type from selection
  clearContentTypes: () => void;
  setGroupBy: (groupBy: GroupBy) => void;
  setDateGrouping: (grouping: DateGrouping) => void;
  setSubPawkitSize: (size: SubPawkitSize) => void;
  setSubPawkitColumns: (columns: number) => void;
  setPawkitOverviewSize: (size: PawkitOverviewSize) => void;
  setPawkitOverviewColumns: (columns: number) => void;
  setPawkitOverviewShowThumbnails: (show: boolean) => void;
  setPawkitOverviewShowItemCount: (show: boolean) => void;
  setPawkitOverviewSortBy: (sortBy: PawkitOverviewSortBy) => void;
  setSelectedTags: (tags: string[]) => void;
  toggleTag: (tag: string) => void; // Add/remove tag from selection
  clearTags: () => void;
  setUnsortedFilter: (filter: UnsortedFilter) => void;
  setReadingFilter: (filter: ReadingFilter) => void;
  setShowNoTagsOnly: (show: boolean) => void;
  setShowNoPawkitsOnly: (show: boolean) => void;
  setLinkStatusFilter: (filter: LinkStatusFilter) => void;
  setScheduledFilter: (filter: ScheduledFilter) => void;
  setShowDuplicatesOnly: (show: boolean) => void;

  // Manual ordering
  setCardOrder: (ids: string[]) => void;
  reorderCards: (ids: string[]) => void; // Updates order and switches to manual sort

  // List column settings
  setListColumnOrder: (order: string[]) => void;
  setListColumnWidth: (columnId: string, width: number) => void;
  setListColumnVisibility: (columnId: string, visible: boolean) => void;

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
  cardPadding: 10, // 0-40 pixels
  cardSpacing: 16, // 0-40 pixels (gap between cards)
  cardSize: 'medium' as CardSize,
  showMetadataFooter: true,
  cardOrder: [] as string[],
  // Grouping
  groupBy: 'none' as GroupBy,
  dateGrouping: 'smart' as DateGrouping,
  // Sub-Pawkits display
  subPawkitSize: 'normal' as SubPawkitSize,
  subPawkitColumns: 4,
  // Pawkits Overview display
  pawkitOverviewSize: 'medium' as PawkitOverviewSize,
  pawkitOverviewColumns: 4,
  pawkitOverviewShowThumbnails: true,
  pawkitOverviewShowItemCount: true,
  pawkitOverviewSortBy: 'manual' as PawkitOverviewSortBy,
  // List view column settings
  listColumnOrder: [] as string[],
  listColumnWidths: {} as Record<string, number>,
  listColumnVisibility: {} as Record<string, boolean>,
};

export const useViewStore = create<ViewState>((set, get) => ({
  // Initial state
  currentView: 'library',
  ...DEFAULT_VIEW_SETTINGS,
  contentTypeFilters: [], // Empty = show all
  selectedTags: [],
  unsortedFilter: 'none' as UnsortedFilter,
  readingFilter: 'all' as ReadingFilter,
  showNoTagsOnly: false,
  showNoPawkitsOnly: false,
  linkStatusFilter: 'all' as LinkStatusFilter,
  scheduledFilter: 'all' as ScheduledFilter,
  showDuplicatesOnly: false,
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

  setCardPadding: (padding) => set({ cardPadding: Math.max(0, Math.min(40, padding)) }),

  setCardSpacing: (spacing) => set({ cardSpacing: Math.max(0, Math.min(40, spacing)) }),

  setCardSize: (size) => set({ cardSize: size }),

  setShowMetadataFooter: (show) => set({ showMetadataFooter: show }),

  toggleContentType: (type) => set((state) => {
    const current = state.contentTypeFilters;
    if (current.includes(type)) {
      return { contentTypeFilters: current.filter(t => t !== type) };
    } else {
      return { contentTypeFilters: [...current, type] };
    }
  }),

  clearContentTypes: () => set({ contentTypeFilters: [] }),

  setSelectedTags: (tags) => set({ selectedTags: tags }),

  toggleTag: (tag) => set((state) => {
    const current = state.selectedTags;
    if (current.includes(tag)) {
      return { selectedTags: current.filter(t => t !== tag) };
    } else {
      return { selectedTags: [...current, tag] };
    }
  }),

  clearTags: () => set({ selectedTags: [] }),

  setUnsortedFilter: (filter) => set({ unsortedFilter: filter }),

  setReadingFilter: (filter) => set({ readingFilter: filter }),

  setShowNoTagsOnly: (show) => set({ showNoTagsOnly: show }),

  setShowNoPawkitsOnly: (show) => set({ showNoPawkitsOnly: show }),

  setLinkStatusFilter: (filter) => set({ linkStatusFilter: filter }),

  setScheduledFilter: (filter) => set({ scheduledFilter: filter }),

  setShowDuplicatesOnly: (show) => set({ showDuplicatesOnly: show }),

  setGroupBy: (groupBy) => set({ groupBy }),

  setDateGrouping: (grouping) => set({ dateGrouping: grouping }),

  setSubPawkitSize: (size) => set({ subPawkitSize: size }),

  setSubPawkitColumns: (columns) => set({ subPawkitColumns: Math.max(2, Math.min(6, columns)) }),

  setPawkitOverviewSize: (size) => set({ pawkitOverviewSize: size }),

  setPawkitOverviewColumns: (columns) => set({ pawkitOverviewColumns: Math.max(2, Math.min(6, columns)) }),

  setPawkitOverviewShowThumbnails: (show) => set({ pawkitOverviewShowThumbnails: show }),

  setPawkitOverviewShowItemCount: (show) => set({ pawkitOverviewShowItemCount: show }),

  setPawkitOverviewSortBy: (sortBy) => set({ pawkitOverviewSortBy: sortBy }),

  // Manual ordering actions
  setCardOrder: (ids) => set({ cardOrder: ids }),

  reorderCards: (ids) => {
    // Update card order and switch to manual sort mode
    set({ cardOrder: ids, sortBy: 'manual' });
  },

  // List column settings actions
  setListColumnOrder: (order) => set({ listColumnOrder: order }),

  setListColumnWidth: (columnId, width) =>
    set((state) => ({
      listColumnWidths: { ...state.listColumnWidths, [columnId]: width },
    })),

  setListColumnVisibility: (columnId, visible) =>
    set((state) => ({
      listColumnVisibility: { ...state.listColumnVisibility, [columnId]: visible },
    })),

  // Load view settings from Dexie
  loadViewSettings: async (workspaceId, viewKey) => {
    set({ isLoading: true, currentView: viewKey });

    try {
      const settings = await db.viewSettings
        .where('[workspaceId+viewKey]')
        .equals([workspaceId, viewKey])
        .first();

      if (settings) {
        // Cast to access optional new fields that may not exist in old data
        const s = settings as LocalViewSettings & {
          cardOrder?: string[];
          cardSize?: CardSize;
          showMetadataFooter?: boolean;
          listColumnOrder?: string[];
          listColumnWidths?: Record<string, number>;
          listColumnVisibility?: Record<string, boolean>;
          groupBy?: GroupBy;
          dateGrouping?: DateGrouping;
          subPawkitSize?: SubPawkitSize;
          subPawkitColumns?: number;
          pawkitOverviewSize?: PawkitOverviewSize;
          pawkitOverviewColumns?: number;
          pawkitOverviewShowThumbnails?: boolean;
          pawkitOverviewShowItemCount?: boolean;
          pawkitOverviewSortBy?: PawkitOverviewSortBy;
        };
        set({
          layout: s.layout as Layout,
          sortBy: s.sortBy,
          sortOrder: s.sortOrder as SortOrder,
          showTitles: s.showTitles,
          showUrls: s.showUrls,
          showTags: s.showTags,
          cardPadding: s.cardPadding,
          cardSpacing: s.cardSpacing ?? DEFAULT_VIEW_SETTINGS.cardSpacing,
          cardSize: s.cardSize || DEFAULT_VIEW_SETTINGS.cardSize,
          showMetadataFooter: s.showMetadataFooter ?? DEFAULT_VIEW_SETTINGS.showMetadataFooter,
          cardOrder: s.cardOrder || [],
          listColumnOrder: s.listColumnOrder || [],
          listColumnWidths: s.listColumnWidths || {},
          listColumnVisibility: s.listColumnVisibility || {},
          groupBy: s.groupBy || DEFAULT_VIEW_SETTINGS.groupBy,
          dateGrouping: s.dateGrouping || DEFAULT_VIEW_SETTINGS.dateGrouping,
          subPawkitSize: s.subPawkitSize || DEFAULT_VIEW_SETTINGS.subPawkitSize,
          subPawkitColumns: s.subPawkitColumns ?? DEFAULT_VIEW_SETTINGS.subPawkitColumns,
          pawkitOverviewSize: s.pawkitOverviewSize || DEFAULT_VIEW_SETTINGS.pawkitOverviewSize,
          pawkitOverviewColumns: s.pawkitOverviewColumns ?? DEFAULT_VIEW_SETTINGS.pawkitOverviewColumns,
          pawkitOverviewShowThumbnails: s.pawkitOverviewShowThumbnails ?? DEFAULT_VIEW_SETTINGS.pawkitOverviewShowThumbnails,
          pawkitOverviewShowItemCount: s.pawkitOverviewShowItemCount ?? DEFAULT_VIEW_SETTINGS.pawkitOverviewShowItemCount,
          pawkitOverviewSortBy: s.pawkitOverviewSortBy || DEFAULT_VIEW_SETTINGS.pawkitOverviewSortBy,
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
    const {
      currentView, layout, sortBy, sortOrder, showTitles, showUrls, showTags,
      cardPadding, cardSpacing, cardSize, showMetadataFooter, cardOrder,
      listColumnOrder, listColumnWidths, listColumnVisibility, groupBy, dateGrouping,
      subPawkitSize, subPawkitColumns,
      pawkitOverviewSize, pawkitOverviewColumns, pawkitOverviewShowThumbnails,
      pawkitOverviewShowItemCount, pawkitOverviewSortBy
    } = get();

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
          cardSpacing,
          cardSize,
          showMetadataFooter,
          cardOrder,
          listColumnOrder,
          listColumnWidths,
          listColumnVisibility,
          groupBy,
          dateGrouping,
          subPawkitSize,
          subPawkitColumns,
          pawkitOverviewSize,
          pawkitOverviewColumns,
          pawkitOverviewShowThumbnails,
          pawkitOverviewShowItemCount,
          pawkitOverviewSortBy,
          updatedAt: new Date(),
        });
        await db.viewSettings.put(updated);
      } else {
        // Create new
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
          cardSpacing,
          cardSize,
          showMetadataFooter,
          cardOrder,
          listColumnOrder,
          listColumnWidths,
          listColumnVisibility,
          groupBy,
          dateGrouping,
          subPawkitSize,
          subPawkitColumns,
          pawkitOverviewSize,
          pawkitOverviewColumns,
          pawkitOverviewShowThumbnails,
          pawkitOverviewShowItemCount,
          pawkitOverviewSortBy,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...createSyncMetadata(),
        } as LocalViewSettings & {
          cardOrder: string[];
          listColumnOrder: string[];
          listColumnWidths: Record<string, number>;
          listColumnVisibility: Record<string, boolean>;
          groupBy: GroupBy;
          dateGrouping: DateGrouping;
          subPawkitSize: SubPawkitSize;
          subPawkitColumns: number;
          pawkitOverviewSize: PawkitOverviewSize;
          pawkitOverviewColumns: number;
          pawkitOverviewShowThumbnails: boolean;
          pawkitOverviewShowItemCount: boolean;
          pawkitOverviewSortBy: PawkitOverviewSortBy;
        };
        await db.viewSettings.add(newSettings);
      }
    } catch (error) {
      console.error('Failed to save view settings:', error);
    }
  },

  // Reset to defaults (without saving)
  resetToDefaults: () => set({ ...DEFAULT_VIEW_SETTINGS, contentTypeFilters: [], selectedTags: [], readingFilter: 'all' as ReadingFilter, linkStatusFilter: 'all' as LinkStatusFilter, scheduledFilter: 'all' as ScheduledFilter, showDuplicatesOnly: false }),
}));

// =============================================================================
// SELECTORS
// =============================================================================

export const selectCurrentView = (state: ViewState) => state.currentView;
export const selectLayout = (state: ViewState) => state.layout;
export const selectSortBy = (state: ViewState) => state.sortBy;
export const selectSortOrder = (state: ViewState) => state.sortOrder;
export const selectContentTypeFilters = (state: ViewState) => state.contentTypeFilters;
export const selectViewIsLoading = (state: ViewState) => state.isLoading;
export const selectCardOrder = (state: ViewState) => state.cardOrder;

export const selectDisplaySettings = (state: ViewState) => ({
  showTitles: state.showTitles,
  showUrls: state.showUrls,
  showTags: state.showTags,
  cardPadding: state.cardPadding,
  cardSpacing: state.cardSpacing,
  cardSize: state.cardSize,
  showMetadataFooter: state.showMetadataFooter,
});

export const selectCardSize = (state: ViewState) => state.cardSize;
export const selectGroupBy = (state: ViewState) => state.groupBy;
export const selectDateGrouping = (state: ViewState) => state.dateGrouping;

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
      cardSpacing: state.cardSpacing,
      cardSize: state.cardSize,
      showMetadataFooter: state.showMetadataFooter,
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
      setCardSpacing: state.setCardSpacing,
      setCardSize: state.setCardSize,
      setShowMetadataFooter: state.setShowMetadataFooter,
      setCardOrder: state.setCardOrder,
      reorderCards: state.reorderCards,
      loadViewSettings: state.loadViewSettings,
      saveViewSettings: state.saveViewSettings,
      resetToDefaults: state.resetToDefaults,
    }))
  );
}

// Hook for card display settings only
export function useCardDisplaySettings() {
  return useViewStore(
    useShallow((state) => ({
      cardPadding: state.cardPadding,
      cardSpacing: state.cardSpacing,
      cardSize: state.cardSize,
      showMetadataFooter: state.showMetadataFooter,
      showTitles: state.showTitles,
      showTags: state.showTags,
    }))
  );
}

export function useContentFilter() {
  return useViewStore(
    useShallow((state) => ({
      filters: state.contentTypeFilters,
      toggleFilter: state.toggleContentType,
      clearFilters: state.clearContentTypes,
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

export function useGrouping() {
  return useViewStore(
    useShallow((state) => ({
      groupBy: state.groupBy,
      dateGrouping: state.dateGrouping,
      setGroupBy: state.setGroupBy,
      setDateGrouping: state.setDateGrouping,
    }))
  );
}

export function useSubPawkitSettings() {
  return useViewStore(
    useShallow((state) => ({
      subPawkitSize: state.subPawkitSize,
      subPawkitColumns: state.subPawkitColumns,
      setSubPawkitSize: state.setSubPawkitSize,
      setSubPawkitColumns: state.setSubPawkitColumns,
    }))
  );
}

export function usePawkitOverviewSettings() {
  return useViewStore(
    useShallow((state) => ({
      pawkitOverviewSize: state.pawkitOverviewSize,
      pawkitOverviewColumns: state.pawkitOverviewColumns,
      pawkitOverviewShowThumbnails: state.pawkitOverviewShowThumbnails,
      pawkitOverviewShowItemCount: state.pawkitOverviewShowItemCount,
      pawkitOverviewSortBy: state.pawkitOverviewSortBy,
      setPawkitOverviewSize: state.setPawkitOverviewSize,
      setPawkitOverviewColumns: state.setPawkitOverviewColumns,
      setPawkitOverviewShowThumbnails: state.setPawkitOverviewShowThumbnails,
      setPawkitOverviewShowItemCount: state.setPawkitOverviewShowItemCount,
      setPawkitOverviewSortBy: state.setPawkitOverviewSortBy,
    }))
  );
}

