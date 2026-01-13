/**
 * Sync Store
 * Zustand store for sync status and UI state
 */

import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncState {
  // Status
  status: SyncStatus;
  lastSyncTime: Date | null;
  pendingCount: number;
  lastError: string | null;

  // Track which entities are actively being synced right now
  activelySyncingIds: Set<string>;

  // Track which entities have failed to sync (exceeded retries)
  failedEntityIds: Set<string>;

  // Actions
  setStatus: (status: SyncStatus) => void;
  setLastSyncTime: (time: Date | null) => void;
  setPendingCount: (count: number) => void;
  setLastError: (error: string | null) => void;

  // Active syncing tracking
  addActivelySyncing: (entityId: string) => void;
  removeActivelySyncing: (entityId: string) => void;
  clearActivelySyncing: () => void;

  // Failed entity tracking
  addFailedEntity: (entityId: string) => void;
  removeFailedEntity: (entityId: string) => void;
  clearFailedEntities: () => void;

  // Convenience actions
  startSync: () => void;
  finishSync: (success: boolean, error?: string) => void;
  goOffline: () => void;
  goOnline: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  // Initial state
  status: 'idle',
  lastSyncTime: null,
  pendingCount: 0,
  lastError: null,
  activelySyncingIds: new Set<string>(),
  failedEntityIds: new Set<string>(),

  // Setters
  setStatus: (status) => set({ status }),
  setLastSyncTime: (time) => set({ lastSyncTime: time }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setLastError: (error) => set({ lastError: error }),

  // Active syncing tracking
  addActivelySyncing: (entityId) =>
    set((state) => {
      const newSet = new Set(state.activelySyncingIds);
      newSet.add(entityId);
      return { activelySyncingIds: newSet };
    }),
  removeActivelySyncing: (entityId) =>
    set((state) => {
      const newSet = new Set(state.activelySyncingIds);
      newSet.delete(entityId);
      return { activelySyncingIds: newSet };
    }),
  clearActivelySyncing: () => set({ activelySyncingIds: new Set() }),

  // Failed entity tracking
  addFailedEntity: (entityId) =>
    set((state) => {
      const newSet = new Set(state.failedEntityIds);
      newSet.add(entityId);
      return { failedEntityIds: newSet };
    }),
  removeFailedEntity: (entityId) =>
    set((state) => {
      const newSet = new Set(state.failedEntityIds);
      newSet.delete(entityId);
      return { failedEntityIds: newSet };
    }),
  clearFailedEntities: () => set({ failedEntityIds: new Set() }),

  // Convenience actions
  startSync: () => {
    set({ status: 'syncing', lastError: null });
  },

  finishSync: (success, error) => {
    if (success) {
      set({
        status: 'idle',
        lastSyncTime: new Date(),
        lastError: null,
      });
    } else {
      set({
        status: 'error',
        lastError: error || 'Sync failed',
      });
    }
  },

  goOffline: () => {
    set({ status: 'offline' });
  },

  goOnline: () => {
    const { status } = get();
    if (status === 'offline') {
      set({ status: 'idle' });
    }
  },
}));

// =============================================================================
// SELECTORS
// =============================================================================

export const selectSyncStatus = (state: SyncState) => state.status;
export const selectLastSyncTime = (state: SyncState) => state.lastSyncTime;
export const selectPendingCount = (state: SyncState) => state.pendingCount;
export const selectLastError = (state: SyncState) => state.lastError;
export const selectIsSyncing = (state: SyncState) => state.status === 'syncing';
export const selectIsOffline = (state: SyncState) => state.status === 'offline';
export const selectActivelySyncingIds = (state: SyncState) => state.activelySyncingIds;
export const selectIsActivelySyncing = (entityId: string) => (state: SyncState) =>
  state.activelySyncingIds.has(entityId);
export const selectFailedEntityIds = (state: SyncState) => state.failedEntityIds;
export const selectIsFailedEntity = (entityId: string) => (state: SyncState) =>
  state.failedEntityIds.has(entityId);
