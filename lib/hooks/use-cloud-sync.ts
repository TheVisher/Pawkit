/**
 * Cloud Sync Hook
 *
 * Manages cloud sync initialization and scheduling.
 * Connects the sync scheduler with the data stores.
 */

import { useEffect, useCallback, useRef } from "react";
import { useConnectorStore } from "@/lib/stores/connector-store";
import { useDataStore } from "@/lib/stores/data-store";
import { cloudStorage, syncScheduler, SyncItem } from "@/lib/services/cloud-storage";
import { gdriveProvider } from "@/lib/services/google-drive/gdrive-provider";

export interface CloudSyncConfig {
  enabled?: boolean;
  intervalMs?: number;
  syncOnStart?: boolean;
}

const DEFAULT_CONFIG: CloudSyncConfig = {
  enabled: true,
  intervalMs: 5 * 60 * 1000, // 5 minutes
  syncOnStart: false,
};

/**
 * Hook to manage cloud sync for notes
 */
export function useCloudSync(config: CloudSyncConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const isInitialized = useRef(false);

  const filenConnected = useConnectorStore((state) => state.filen.connected);
  const gdriveConnected = useConnectorStore((state) => state.googleDrive.connected);

  // Any provider connected means we can sync
  const anyProviderConnected = filenConnected || gdriveConnected;

  /**
   * Find notes that need to be synced (dirty items)
   * A note is dirty if: updatedAt > cloudSyncedAt (or cloudSyncedAt is null)
   */
  const getDirtyNotes = useCallback(async (): Promise<SyncItem[]> => {
    const cards = useDataStore.getState().cards;

    const dirtyItems: SyncItem[] = [];

    for (const card of cards) {
      // Only sync notes, not URL cards or file cards
      if (card.type !== "md-note" && card.type !== "text-note") {
        continue;
      }

      // Skip deleted cards
      if (card.deleted) {
        continue;
      }

      // Check if dirty (needs sync)
      const updatedAt = new Date(card.updatedAt);
      const cloudSyncedAt = card.cloudSyncedAt ? new Date(card.cloudSyncedAt) : null;

      const isDirty = !cloudSyncedAt || updatedAt > cloudSyncedAt;

      if (isDirty) {
        // Generate filename from title
        const safeTitle = (card.title || "Untitled")
          .replace(/[/\\:*?"<>|]/g, "_")
          .substring(0, 100);

        dirtyItems.push({
          id: card.id,
          type: "note",
          title: card.title || "Untitled",
          content: card.content || "",
          filename: `${safeTitle}.md`,
          localUpdatedAt: updatedAt,
          cloudId: card.cloudId || undefined,
          cloudSyncedAt: cloudSyncedAt || undefined,
          cloudProvider: card.cloudProvider || undefined,
        });
      }
    }

    return dirtyItems;
  }, []);

  /**
   * Handle successful sync - update the card with cloud info
   */
  const handleSyncComplete = useCallback(async (
    itemId: string,
    cloudId: string,
    cloudProvider: string
  ) => {
    await useDataStore.getState().updateCard(itemId, {
      cloudId,
      cloudProvider,
      cloudSyncedAt: new Date().toISOString(),
    } as any);

    console.warn(`[CloudSync] Updated card ${itemId} with cloud info`);
  }, []);

  /**
   * Handle sync error
   */
  const handleSyncError = useCallback((itemId: string, error: string) => {
    console.error(`[CloudSync] Sync failed for ${itemId}:`, error);
    // Could update card with error status if needed
  }, []);

  /**
   * Initialize cloud sync
   */
  useEffect(() => {
    if (isInitialized.current) return;

    // Register callbacks with scheduler
    syncScheduler.registerCallbacks(
      getDirtyNotes,
      handleSyncComplete,
      handleSyncError
    );

    // Configure scheduler
    syncScheduler.configure({
      intervalMs: mergedConfig.intervalMs,
      enabled: mergedConfig.enabled,
      syncOnStart: mergedConfig.syncOnStart,
    });

    isInitialized.current = true;
    console.warn("[CloudSync] Initialized");
  }, [getDirtyNotes, handleSyncComplete, handleSyncError, mergedConfig]);

  /**
   * Start/stop scheduler based on any provider connection
   */
  useEffect(() => {
    if (!isInitialized.current) return;

    if (anyProviderConnected && mergedConfig.enabled) {
      // Set the first connected provider as active (for backward compatibility)
      if (filenConnected) {
        cloudStorage.setActiveProvider("filen");
      } else if (gdriveConnected) {
        cloudStorage.setActiveProvider("google-drive");
      }

      // Start scheduler if not already running
      if (!syncScheduler.isRunning()) {
        syncScheduler.start();
        console.warn("[CloudSync] Scheduler started (provider connected)");
      }
    } else {
      // Stop scheduler when all disconnected
      if (syncScheduler.isRunning()) {
        syncScheduler.stop();
        console.warn("[CloudSync] Scheduler stopped (no providers connected)");
      }
    }
  }, [filenConnected, gdriveConnected, anyProviderConnected, mergedConfig.enabled]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      syncScheduler.stop();
    };
  }, []);

  /**
   * Manual sync trigger
   */
  const syncNow = useCallback(async () => {
    if (!anyProviderConnected) {
      console.warn("[CloudSync] Cannot sync - no providers connected");
      return null;
    }
    return syncScheduler.syncNow();
  }, [anyProviderConnected]);

  return {
    isConnected: anyProviderConnected,
    isFilenConnected: filenConnected,
    isGDriveConnected: gdriveConnected,
    isSchedulerRunning: syncScheduler.isRunning(),
    isSyncing: syncScheduler.isSyncInProgress(),
    lastSyncAt: syncScheduler.getLastSyncAt(),
    syncNow,
  };
}
