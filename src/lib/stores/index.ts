/**
 * Stores Index
 * Re-exports all Zustand stores and hooks
 */

// Workspace
export {
  useWorkspaceStore,
  useCurrentWorkspace,
  useWorkspaces,
  useCurrentWorkspaceId,
  selectCurrentWorkspace,
  selectWorkspaces,
  selectCurrentWorkspaceId,
} from './workspace-store';

// Data (cards, collections) - now provided by ConvexDataProvider
// Use: import { useCards, useCollections, useMutations } from '@/lib/contexts/convex-data-context';

// UI
export {
  useUIStore,
  useLeftSidebar,
  useRightSidebar,
  useCardSize,
  useModal,
  useCommandPalette,
  selectLeftSidebarOpen,
  selectRightSidebarOpen,
  selectLeftSidebarAnchored,
  selectRightSidebarAnchored,
  selectCardSize,
  selectActiveModal,
  selectModalData,
  selectCommandPaletteOpen,
} from './ui-store';

// View
export {
  useViewStore,
  useViewSettings,
  useViewActions,
  useContentFilter,
  useLayout,
  useSorting,
  selectCurrentView,
  selectLayout,
  selectSortBy,
  selectSortOrder,
  selectContentTypeFilters,
  selectViewIsLoading,
  selectDisplaySettings,
} from './view-store';

// Tags - computed from cards, use useCards() and derive tags from card.tags

// Layout Cache
export {
  useLayoutCacheStore,
  generateCardContentHash,
} from './layout-cache-store';
