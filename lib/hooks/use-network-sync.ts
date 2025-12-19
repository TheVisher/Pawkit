"use client";

import { useEffect, useRef } from "react";
import { useDataStore } from "@/lib/stores/data-store";
import { useEventStore } from "@/lib/hooks/use-event-store";
import { useSettingsStore } from "@/lib/hooks/settings-store";
import { syncService } from "@/lib/services/sync-service";

/**
 * Network sync hook that automatically retries failed operations when connection is restored
 *
 * LOCAL-FIRST ARCHITECTURE:
 * This hook ONLY drains the sync queue (pending writes to server).
 * It does NOT fetch new data - all reads are from local Zustand store.
 *
 * Features:
 * - Listens for browser online/offline events
 * - Drains sync queue when connection returns
 * - Periodic fallback drain (in case online event is missed)
 * - Prevents duplicate drains with debouncing
 * - Respects serverSync setting (local-only mode when disabled)
 * - Waits for auth to be ready before syncing (prevents 401 errors)
 */
export function useNetworkSync(isAuthReady: boolean = true) {
  const drainQueue = useDataStore((state) => state.drainQueue);
  const retryPendingMetadata = useDataStore((state) => state.retryPendingMetadata);
  const syncEvents = useEventStore((state) => state.sync);
  const serverSync = useSettingsStore((state) => state.serverSync);
  const autoSyncOnReconnect = useSettingsStore((state) => state.autoSyncOnReconnect);
  const isDrainingRef = useRef(false);
  const lastDrainRef = useRef(0);

  useEffect(() => {
    // Skip all syncing if server sync is disabled
    if (!serverSync) {
      return;
    }

    // CRITICAL: Wait for auth to be ready before attempting any sync
    // This prevents 401 errors during initial app load
    if (!isAuthReady) {
      return;
    }

    // If server sync is enabled but autoSyncOnReconnect is disabled, skip automatic draining
    // (User must manually trigger sync)
    if (!autoSyncOnReconnect) {
      return;
    }
    const MIN_DRAIN_INTERVAL = 5000; // Don't drain more than once per 5 seconds

    const safeDrain = async () => {
      const now = Date.now();

      // Prevent duplicate drains
      if (isDrainingRef.current || (now - lastDrainRef.current) < MIN_DRAIN_INTERVAL) {
        return;
      }

      isDrainingRef.current = true;
      lastDrainRef.current = now;

      try {
        // Sync both cards and events in parallel
        await Promise.all([
          drainQueue(),
          syncEvents(),
        ]);

        // After syncing, retry metadata fetch for PENDING cards
        // This handles cards created offline that need metadata
        await retryPendingMetadata();
      } catch (error) {
      } finally {
        isDrainingRef.current = false;
      }
    };

    // Listen for network status changes
    const handleOnline = () => {
      safeDrain();
    };

    const handleOffline = () => {
      // Connection lost - queued operations will sync when connection returns
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Handle visibility change for lightweight sync check
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {

        try {
          const hasChanges = await syncService.checkForChanges();

          if (hasChanges) {
            // Sync both cards and events when changes detected
            await Promise.all([
              drainQueue(), // drainQueue calls sync internally
              syncEvents(),
            ]);
          } else {
          }
        } catch (error) {
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic fallback drain (in case online event is missed)
    // This is ONLY for draining the sync queue (pending writes), NOT for fetching new data
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        safeDrain();
      }
    }, 600000); // Every 10 minutes - only for ensuring pending writes sync

    // Initial drain attempt on mount (handles app startup)
    if (navigator.onLine) {
      // Small delay to ensure store is initialized
      setTimeout(safeDrain, 1000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [drainQueue, retryPendingMetadata, syncEvents, serverSync, autoSyncOnReconnect, isAuthReady]);
}
