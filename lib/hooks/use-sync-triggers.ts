"use client";

import { useEffect } from "react";
import { syncQueue } from "@/lib/services/sync-queue";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { useViewSettingsStore } from "@/lib/hooks/view-settings-store";

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
  const syncViewSettings = useViewSettingsStore((state) => state.syncSettings);

  useEffect(() => {
    // Don't set up triggers if server sync is disabled
    if (!serverSync) {
      return;
    }

    // 1. Periodic sync every 60 seconds
    const intervalId = setInterval(async () => {
      if (navigator.onLine) {
        try {
          // Sync card/collection queue
          await syncQueue.process();
          // Sync view settings (bi-directional with timestamps)
          await syncViewSettings();
        } catch (error) {
          // Silently ignore - non-critical
        }
      }
    }, 60000); // 60 seconds

    // 2. Sync when internet connection is restored
    const handleOnline = async () => {
      try {
        await syncQueue.process();
        await syncViewSettings();
      } catch (error) {
        // Silently ignore
      }
    };

    // 3. Sync before page unload
    const handleBeforeUnload = async () => {
      try {
        // This is best-effort - browser may kill the request
        await syncQueue.process();
        // Skip view settings sync on unload - too slow
      } catch (error) {
        // Silently ignore
      }
    };

    // 4. Sync when tab becomes visible again
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        const pending = await syncQueue.getPendingCount();
        if (pending > 0) {
          try {
            await syncQueue.process();
          } catch (error) {
            // Silently ignore
          }
        }
        // Also sync view settings when tab becomes visible (may have changes from other devices)
        try {
          await syncViewSettings();
        } catch (error) {
          // Silently ignore
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
    };
  }, [serverSync, syncViewSettings]);
}
