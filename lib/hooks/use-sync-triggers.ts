"use client";

import { useEffect } from "react";
import { syncQueue } from "@/lib/services/sync-queue";
import { useSettingsStore } from "@/lib/hooks/settings-store";

/**
 * Hook to manage sync triggers
 *
 * Syncs happen on:
 * - Periodic interval (every 60 seconds)
 * - Internet reconnection
 * - Before page unload
 * - Manual trigger (via Sync Status component)
 *
 * Does NOT sync on:
 * - Page load (prevents race conditions)
 * - After every action (too aggressive)
 */
export function useSyncTriggers() {
  const serverSync = useSettingsStore((state) => state.serverSync);

  useEffect(() => {
    // Don't set up triggers if server sync is disabled
    if (!serverSync) {
      console.log('[SyncTriggers] Server sync disabled, skipping triggers');
      return;
    }

    console.log('[SyncTriggers] Setting up sync triggers');

    // 1. Periodic sync every 60 seconds
    const intervalId = setInterval(async () => {
      if (navigator.onLine) {
        console.log('[SyncTriggers] Periodic sync triggered');
        try {
          await syncQueue.process();
        } catch (error) {
          console.error('[SyncTriggers] Periodic sync failed:', error);
        }
      }
    }, 60000); // 60 seconds

    // 2. Sync when internet connection is restored
    const handleOnline = async () => {
      console.log('[SyncTriggers] Internet reconnected, syncing...');
      try {
        await syncQueue.process();
      } catch (error) {
        console.error('[SyncTriggers] Reconnection sync failed:', error);
      }
    };

    // 3. Sync before page unload
    const handleBeforeUnload = async () => {
      console.log('[SyncTriggers] Page unloading, syncing...');
      try {
        // This is best-effort - browser may kill the request
        await syncQueue.process();
      } catch (error) {
        console.error('[SyncTriggers] Unload sync failed:', error);
      }
    };

    // 4. Sync when tab becomes visible again
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        console.log('[SyncTriggers] Tab visible again, checking for pending changes...');
        const pending = await syncQueue.getPendingCount();
        if (pending > 0) {
          console.log(`[SyncTriggers] Found ${pending} pending changes, syncing...`);
          try {
            await syncQueue.process();
          } catch (error) {
            console.error('[SyncTriggers] Visibility sync failed:', error);
          }
        }
      }
    };

    // Register event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      console.log('[SyncTriggers] Cleaned up sync triggers');
    };
  }, [serverSync]);
}
