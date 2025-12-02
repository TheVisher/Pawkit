/**
 * Filen Cloud Storage Provider
 *
 * Adapts the existing Filen service to the CloudStorageProvider interface.
 */

import {
  CloudStorageProvider,
  CloudAuthResult,
  CloudFile,
  CloudProviderId,
  CloudSyncStatus,
  CloudUploadResult,
} from "./types";
import { filenService } from "@/lib/services/filen-service";

export class FilenProvider implements CloudStorageProvider {
  readonly id: CloudProviderId = "filen";
  readonly name = "Filen";

  async authenticate(credentials: Record<string, string>): Promise<CloudAuthResult> {
    const result = await filenService.login({
      email: credentials.email,
      password: credentials.password,
      twoFactorCode: credentials.twoFactorCode,
    });

    if (result.success) {
      return {
        success: true,
        email: filenService.getConnectedEmail() || undefined,
      };
    }

    return {
      success: false,
      error: result.error,
      needs2FA: result.needs2FA,
    };
  }

  async disconnect(): Promise<void> {
    await filenService.logout();
  }

  async checkConnection(): Promise<CloudSyncStatus> {
    const auth = await filenService.checkAuth();
    return {
      connected: auth.authenticated,
      email: auth.email,
      lastSyncedAt: null, // TODO: Track in connector store
    };
  }

  async uploadFile(
    content: Blob | File,
    filename: string,
    path: string
  ): Promise<CloudUploadResult> {
    try {
      // Use the direct upload API for browser-side encryption
      const { filenDirect } = await import("@/lib/services/filen-direct");

      // Convert Blob to File if needed
      const file = content instanceof File
        ? content
        : new File([content], filename, { type: content.type });

      const result = await filenDirect.uploadFile(file, path);

      return {
        success: true,
        cloudId: result.uuid,
        path: result.path,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      console.error("[FilenProvider] Upload failed:", message);
      return {
        success: false,
        cloudId: "",
        path: "",
        error: message,
      };
    }
  }

  async downloadFile(cloudId: string): Promise<Blob> {
    return filenService.downloadFile(cloudId);
  }

  async deleteFile(cloudId: string): Promise<void> {
    await filenService.deleteFile(cloudId);
  }

  async listFiles(path?: string): Promise<CloudFile[]> {
    // Use the folder API for proper folder browsing with decryption
    const targetPath = path || "/Pawkit";

    try {
      const response = await fetch(`/api/filen/folder?path=${encodeURIComponent(targetPath)}`);

      if (!response.ok) {
        // Fall back to the old recursive listing if folder API fails
        console.warn("[FilenProvider] Folder API failed, falling back to recursive listing");
        const files = await filenService.listFiles();
        const filtered = path ? files.filter((f) => f.path.startsWith(path)) : files;
        return filtered.map((f) => ({
          cloudId: f.uuid,
          name: f.name,
          path: f.path,
          size: f.size,
          mimeType: f.mime,
          modifiedAt: new Date(f.modified),
          provider: this.id,
          isFolder: false, // Old API only returns files
        }));
      }

      const data = await response.json();

      return (data.items || []).map((item: {
        uuid: string;
        name: string;
        path: string;
        size: number;
        mime: string;
        modified: number;
        isFolder: boolean;
      }) => ({
        cloudId: item.uuid,
        name: item.name,
        path: item.path,
        size: item.size,
        mimeType: item.mime,
        modifiedAt: new Date(item.modified),
        provider: this.id,
        isFolder: item.isFolder,
      }));
    } catch (error) {
      console.error("[FilenProvider] List files failed:", error);
      return [];
    }
  }

  async uploadNote(
    content: string,
    filename: string,
    path = "/Pawkit/_Notes"
  ): Promise<CloudUploadResult> {
    // Ensure .md extension
    const name = filename.endsWith(".md") ? filename : `${filename}.md`;

    // Create a text file from the markdown content
    const blob = new Blob([content], { type: "text/markdown" });
    const file = new File([blob], name, { type: "text/markdown" });

    return this.uploadFile(file, name, path);
  }
}

// Singleton instance
export const filenProvider = new FilenProvider();
