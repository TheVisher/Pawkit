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

  // Actions
  setStatus: (status: SyncStatus) => void;
  setLastSyncTime: (time: Date | null) => void;
  setPendingCount: (count: number) => void;
  setLastError: (error: string | null) => void;

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

  // Setters
  setStatus: (status) => set({ status }),
  setLastSyncTime: (time) => set({ lastSyncTime: time }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setLastError: (error) => set({ lastError: error }),

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
