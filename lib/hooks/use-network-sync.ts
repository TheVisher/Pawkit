"use client";

import { useEffect, useRef } from "react";
import { useDataStore } from "@/lib/stores/data-store";
import { useSettingsStore } from "@/lib/hooks/settings-store";

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
 */
export function useNetworkSync() {
  const drainQueue = useDataStore((state) => state.drainQueue);
  const serverSync = useSettingsStore((state) => state.serverSync);
  const autoSyncOnReconnect = useSettingsStore((state) => state.autoSyncOnReconnect);
  const isDrainingRef = useRef(false);
  const lastDrainRef = useRef(0);

  useEffect(() => {
    // Skip all syncing if server sync is disabled
    if (!serverSync) {
      console.log('[NetworkSync] Server sync disabled - running in local-only mode');
      return;
    }

    // If server sync is enabled but autoSyncOnReconnect is disabled, skip automatic draining
    // (User must manually trigger sync)
    if (!autoSyncOnReconnect) {
      console.log('[NetworkSync] Server sync enabled but auto-sync on reconnect disabled - manual sync required');
      return;
    }
    const MIN_DRAIN_INTERVAL = 5000; // Don't drain more than once per 5 seconds

    const safeDrain = async () => {
      const now = Date.now();

      // Prevent duplicate drains
      if (isDrainingRef.current || (now - lastDrainRef.current) < MIN_DRAIN_INTERVAL) {
        console.log('[NetworkSync] Skipping drain - too soon or already draining');
        return;
      }

      isDrainingRef.current = true;
      lastDrainRef.current = now;

      try {
        console.log('[NetworkSync] Connection restored - draining queue');
        await drainQueue();
      } catch (error) {
        console.error('[NetworkSync] Failed to drain queue:', error);
      } finally {
        isDrainingRef.current = false;
      }
    };

    // Listen for network status changes
    const handleOnline = () => {
      console.log('[NetworkSync] Browser is online');
      safeDrain();
    };

    const handleOffline = () => {
      console.log('[NetworkSync] Browser is offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic fallback drain (in case online event is missed)
    // This is ONLY for draining the sync queue (pending writes), NOT for fetching new data
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        safeDrain();
      }
    }, 60000); // Every 60 seconds - only for ensuring pending writes sync

    // Initial drain attempt on mount (handles app startup)
    if (navigator.onLine) {
      // Small delay to ensure store is initialized
      setTimeout(safeDrain, 1000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [drainQueue, serverSync, autoSyncOnReconnect]);
}
