/**
 * Cloud Sync Scheduler
 *
 * Handles automatic interval-based syncing of notes and files to cloud storage.
 * Tracks dirty items (localUpdatedAt > cloudSyncedAt) and syncs them.
 */

import { cloudStorage } from "./cloud-storage-manager";
import { CloudUploadResult } from "./types";

export interface SyncItem {
  id: string;
  type: "note" | "file";
  title: string;
  content?: string;
  blob?: Blob;
  filename: string;
  localUpdatedAt: Date;
  cloudId?: string;
  cloudSyncedAt?: Date;
  cloudProvider?: string;
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}

export interface SyncSchedulerConfig {
  intervalMs: number;        // Sync interval in milliseconds (default: 5 minutes)
  enabled: boolean;          // Whether auto-sync is enabled
  syncOnStart: boolean;      // Sync immediately on start
  maxConcurrent: number;     // Max concurrent uploads
}

type DirtyItemsFn = () => Promise<SyncItem[]>;
type OnSyncCompleteFn = (itemId: string, cloudId: string, cloudProvider: string) => Promise<void>;
type OnSyncErrorFn = (itemId: string, error: string) => void;

const DEFAULT_CONFIG: SyncSchedulerConfig = {
  intervalMs: 5 * 60 * 1000, // 5 minutes
  enabled: true,
  syncOnStart: false,
  maxConcurrent: 3,
};

class SyncScheduler {
  private config: SyncSchedulerConfig = DEFAULT_CONFIG;
  private intervalId: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private getDirtyItems: DirtyItemsFn | null = null;
  private onSyncComplete: OnSyncCompleteFn | null = null;
  private onSyncError: OnSyncErrorFn | null = null;
  private lastSyncAt: Date | null = null;

  /**
   * Configure the sync scheduler
   */
  configure(config: Partial<SyncSchedulerConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart if running with new interval
    if (this.intervalId && config.intervalMs) {
      this.stop();
      this.start();
    }
  }

  /**
   * Register callbacks for finding dirty items and handling sync results
   */
  registerCallbacks(
    getDirtyItems: DirtyItemsFn,
    onSyncComplete: OnSyncCompleteFn,
    onSyncError?: OnSyncErrorFn
  ): void {
    this.getDirtyItems = getDirtyItems;
    this.onSyncComplete = onSyncComplete;
    this.onSyncError = onSyncError || (() => {});
  }

  /**
   * Start the sync scheduler
   */
  start(): void {
    if (!this.config.enabled) {
      console.warn("[SyncScheduler] Sync is disabled");
      return;
    }

    if (this.intervalId) {
      console.warn("[SyncScheduler] Already running");
      return;
    }

    console.warn(`[SyncScheduler] Starting with ${this.config.intervalMs}ms interval`);

    // Sync immediately if configured
    if (this.config.syncOnStart) {
      this.syncNow();
    }

    // Start interval
    this.intervalId = setInterval(() => {
      this.syncNow();
    }, this.config.intervalMs);
  }

  /**
   * Stop the sync scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.warn("[SyncScheduler] Stopped");
    }
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Check if currently syncing
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Get last sync time
   */
  getLastSyncAt(): Date | null {
    return this.lastSyncAt;
  }

  /**
   * Trigger an immediate sync
   */
  async syncNow(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.warn("[SyncScheduler] Sync already in progress, skipping");
      return { success: false, syncedCount: 0, failedCount: 0, errors: ["Sync already in progress"] };
    }

    if (!this.getDirtyItems || !this.onSyncComplete) {
      console.warn("[SyncScheduler] Callbacks not registered");
      return { success: false, syncedCount: 0, failedCount: 0, errors: ["Callbacks not registered"] };
    }

    // Check if cloud provider is connected
    const provider = cloudStorage.getActiveProvider();
    if (!provider) {
      console.warn("[SyncScheduler] No active cloud provider");
      return { success: false, syncedCount: 0, failedCount: 0, errors: ["No active cloud provider"] };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      // Get dirty items
      const dirtyItems = await this.getDirtyItems();

      if (dirtyItems.length === 0) {
        console.warn("[SyncScheduler] No items to sync");
        this.lastSyncAt = new Date();
        return result;
      }

      console.warn(`[SyncScheduler] Found ${dirtyItems.length} dirty items to sync`);

      // Process items with concurrency limit
      const chunks = this.chunkArray(dirtyItems, this.config.maxConcurrent);

      for (const chunk of chunks) {
        const promises = chunk.map(async (item) => {
          try {
            let uploadResult: CloudUploadResult;

            if (item.type === "note" && item.content) {
              // Upload note as markdown
              uploadResult = await cloudStorage.uploadNote(
                item.content,
                item.filename,
                "/Pawkit/_Notes"
              );
            } else if (item.blob) {
              // Upload file
              uploadResult = await cloudStorage.uploadFile(
                item.blob,
                item.filename,
                "/Pawkit/_Library"
              );
            } else {
              throw new Error(`Invalid sync item: ${item.id}`);
            }

            if (uploadResult.success) {
              await this.onSyncComplete!(item.id, uploadResult.cloudId, provider.id);
              result.syncedCount++;
              console.warn(`[SyncScheduler] Synced: ${item.title}`);
            } else {
              throw new Error(uploadResult.error || "Upload failed");
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            result.errors.push(`${item.title}: ${errorMsg}`);
            result.failedCount++;
            this.onSyncError?.(item.id, errorMsg);
            console.error(`[SyncScheduler] Failed to sync ${item.title}:`, error);
          }
        });

        await Promise.all(promises);
      }

      result.success = result.failedCount === 0;
      this.lastSyncAt = new Date();

      console.warn(`[SyncScheduler] Sync complete: ${result.syncedCount} synced, ${result.failedCount} failed`);
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : "Sync failed");
      console.error("[SyncScheduler] Sync error:", error);
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Helper to chunk array for concurrent processing
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Singleton instance
export const syncScheduler = new SyncScheduler();
