/**
 * Stores Index
 * Re-exports all Zustand stores and hooks
 */

// Auth
export {
  useAuthStore,
  useUser,
  useSession,
  useIsAuthenticated,
  useUserId,
  useAuthLoading,
  selectUser,
  selectSession,
  selectIsAuthenticated,
  selectIsLoading,
  selectUserId,
} from './auth-store';

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

// Data (cards, collections)
export {
  useDataStore,
  useCards,
  useCollections,
  useDataLoading,
  selectCards,
  selectCollections,
  selectCardById,
  selectCollectionBySlug,
  selectCardsByCollection,
  selectCardsByType,
  selectPinnedCards,
} from './data-store';

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

// Sync
export {
  useSyncStore,
  selectSyncStatus,
  selectLastSyncTime,
  selectPendingCount,
  selectLastError,
  selectIsSyncing,
  selectIsOffline,
} from './sync-store';
export type { SyncStatus } from './sync-store';

// Tags
export {
  useTagStore,
  useTagInput,
  useTagTree,
  useTagManagement,
  selectUniqueTags,
  selectTagCounts,
  selectTagTree,
  selectRecentTags,
} from './tag-store';

// Layout Cache
export {
  useLayoutCacheStore,
  generateCardContentHash,
} from './layout-cache-store';
