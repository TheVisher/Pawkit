/**
 * Cloud Storage Manager
 *
 * Central manager for cloud storage providers.
 * Handles provider registration and provides unified access.
 */

import {
  CloudProviderId,
  CloudStorageProvider,
  CloudFile,
  CloudUploadResult,
  CloudSyncStatus,
} from "./types";
import { filenProvider } from "./filen-provider";
import { gdriveProvider } from "@/lib/services/google-drive/gdrive-provider";
import { dropboxProvider } from "@/lib/services/dropbox/dropbox-provider";

class CloudStorageManager {
  private providers: Map<CloudProviderId, CloudStorageProvider> = new Map();
  private activeProviderId: CloudProviderId | null = null;

  constructor() {
    // Register built-in providers
    this.registerProvider(filenProvider);
    this.registerProvider(gdriveProvider);
    this.registerProvider(dropboxProvider);
  }

  /**
   * Register a cloud storage provider
   */
  registerProvider(provider: CloudStorageProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Get a provider by ID
   */
  getProvider(id: CloudProviderId): CloudStorageProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): CloudStorageProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get the currently active provider
   */
  getActiveProvider(): CloudStorageProvider | null {
    if (!this.activeProviderId) return null;
    return this.providers.get(this.activeProviderId) || null;
  }

  /**
   * Set the active provider
   */
  setActiveProvider(id: CloudProviderId | null): void {
    if (id && !this.providers.has(id)) {
      console.warn(`[CloudStorage] Provider '${id}' not found`);
      return;
    }
    this.activeProviderId = id;
  }

  /**
   * Check connection status of all providers
   */
  async checkAllConnections(): Promise<Map<CloudProviderId, CloudSyncStatus>> {
    const results = new Map<CloudProviderId, CloudSyncStatus>();

    for (const [id, provider] of this.providers) {
      try {
        const status = await provider.checkConnection();
        results.set(id, status);

        // Auto-set active provider if connected and none active
        if (status.connected && !this.activeProviderId) {
          this.activeProviderId = id;
        }
      } catch (error) {
        results.set(id, {
          connected: false,
          email: null,
          lastSyncedAt: null,
        });
      }
    }

    return results;
  }

  // ============================================
  // Unified Operations (using active provider)
  // ============================================

  /**
   * Upload a file using the active provider
   */
  async uploadFile(
    content: Blob | File,
    filename: string,
    path: string
  ): Promise<CloudUploadResult> {
    const provider = this.getActiveProvider();
    if (!provider) {
      return {
        success: false,
        cloudId: "",
        path: "",
        error: "No active cloud provider",
      };
    }

    return provider.uploadFile(content, filename, path);
  }

  /**
   * Upload a note (markdown) using the active provider
   */
  async uploadNote(
    content: string,
    filename: string,
    path?: string
  ): Promise<CloudUploadResult> {
    const provider = this.getActiveProvider();
    if (!provider) {
      return {
        success: false,
        cloudId: "",
        path: "",
        error: "No active cloud provider",
      };
    }

    return provider.uploadNote(content, filename, path);
  }

  /**
   * Download a file from the specified provider
   */
  async downloadFile(cloudId: string, providerId?: CloudProviderId): Promise<Blob | null> {
    const provider = providerId
      ? this.getProvider(providerId)
      : this.getActiveProvider();

    if (!provider) {
      console.error("[CloudStorage] No provider available for download");
      return null;
    }

    try {
      return await provider.downloadFile(cloudId);
    } catch (error) {
      console.error("[CloudStorage] Download failed:", error);
      return null;
    }
  }

  /**
   * Delete a file from the specified provider
   */
  async deleteFile(cloudId: string, providerId?: CloudProviderId): Promise<boolean> {
    const provider = providerId
      ? this.getProvider(providerId)
      : this.getActiveProvider();

    if (!provider) {
      console.error("[CloudStorage] No provider available for delete");
      return false;
    }

    try {
      await provider.deleteFile(cloudId);
      return true;
    } catch (error) {
      console.error("[CloudStorage] Delete failed:", error);
      return false;
    }
  }

  /**
   * List files from the active provider
   */
  async listFiles(path?: string): Promise<CloudFile[]> {
    const provider = this.getActiveProvider();
    if (!provider) {
      return [];
    }

    try {
      return await provider.listFiles(path);
    } catch (error) {
      console.error("[CloudStorage] List files failed:", error);
      return [];
    }
  }
}

// Singleton instance
export const cloudStorage = new CloudStorageManager();
