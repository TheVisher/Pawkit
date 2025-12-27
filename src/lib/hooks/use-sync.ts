/**
 * useSync Hook
 * React hook for sync status and operations
 *
 * Features:
 * - Auto-start sync on mount
 * - Re-sync on online/visibility change
 * - Listen for auth changes (logout)
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSyncStore } from '@/lib/stores/sync-store';
import {
  syncService,
  deltaSync,
  processQueueNow,
  clearLocalData,
  setWorkspace,
} from '@/lib/services/sync-service';
import { triggerSync } from '@/lib/services/sync-queue';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { createClient } from '@/lib/supabase/client';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('useSync');

interface UseSyncOptions {
  /**
   * Whether to auto-sync on mount
   * @default true
   */
  autoSync?: boolean;

  /**
   * Whether to sync on visibility change
   * @default true
   */
  syncOnVisible?: boolean;

  /**
   * Whether to sync when coming online
   * @default true
   */
  syncOnOnline?: boolean;
}

interface UseSyncReturn {
  /** Current sync status */
  status: 'idle' | 'syncing' | 'error' | 'offline';
  /** Number of pending queue items */
  pendingCount: number;
  /** Last successful sync time */
  lastSyncTime: Date | null;
  /** Last error message */
  lastError: string | null;
  /** Whether currently syncing */
  isSyncing: boolean;
  /** Whether offline */
  isOffline: boolean;
  /** Trigger a sync now */
  syncNow: () => Promise<void>;
  /** Process queue immediately */
  processQueue: () => Promise<void>;
}

export function useSync(options: UseSyncOptions = {}): UseSyncReturn {
  const {
    autoSync = true,
    syncOnVisible = true,
    syncOnOnline = true,
  } = options;

  // Get sync state from store
  const status = useSyncStore((state) => state.status);
  const pendingCount = useSyncStore((state) => state.pendingCount);
  const lastSyncTime = useSyncStore((state) => state.lastSyncTime);
  const lastError = useSyncStore((state) => state.lastError);

  // Get workspace
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);

  // Track if component is mounted
  const isMounted = useRef(true);

  // Update sync service with current workspace
  useEffect(() => {
    if (currentWorkspace?.id) {
      setWorkspace(currentWorkspace.id);
    }
  }, [currentWorkspace?.id]);

  // Sync now function
  const syncNow = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    await deltaSync();
  }, [currentWorkspace?.id]);

  // Process queue function
  const processQueue = useCallback(async () => {
    await processQueueNow();
  }, []);

  // Auto-sync on mount
  useEffect(() => {
    if (!autoSync || !currentWorkspace?.id) return;

    // Delay initial sync slightly to let UI settle
    const timer = setTimeout(() => {
      if (isMounted.current) {
        deltaSync();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoSync, currentWorkspace?.id]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      log.debug('Online');
      useSyncStore.getState().goOnline();

      if (syncOnOnline) {
        // Only process queue if there are pending items (no wasted requests)
        triggerSync();
      }
    };

    const handleOffline = () => {
      log.debug('Offline');
      useSyncStore.getState().goOffline();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    if (!navigator.onLine) {
      useSyncStore.getState().goOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOnOnline]);

  // Handle visibility change
  useEffect(() => {
    if (!syncOnVisible) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        log.debug('Tab visible, checking for pending items...');
        // Only push pending changes - don't do a full pull on every tab switch
        // The user can manually refresh if they need latest server data
        triggerSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncOnVisible]);

  // Listen for auth state changes (logout)
  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_OUT') {
          log.info('User signed out, clearing local data');
          clearLocalData();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    status,
    pendingCount,
    lastSyncTime,
    lastError,
    isSyncing: status === 'syncing',
    isOffline: status === 'offline',
    syncNow,
    processQueue,
  };
}

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

/**
 * Simple hook for just the sync status
 */
export function useSyncStatus() {
  return useSyncStore((state) => state.status);
}

/**
 * Hook for pending count
 */
export function usePendingCount() {
  return useSyncStore((state) => state.pendingCount);
}

/**
 * Hook to check if syncing
 */
export function useIsSyncing() {
  return useSyncStore((state) => state.status === 'syncing');
}

/**
 * Hook to check if offline
 */
export function useIsOffline() {
  return useSyncStore((state) => state.status === 'offline');
}
