/**
 * Dropbox Cloud Storage Provider
 *
 * Implements the CloudStorageProvider interface for Dropbox.
 * Uses OAuth tokens stored in HTTP-only cookies for authentication.
 * Creates the same folder structure as other providers for consistency.
 */

import {
  CloudStorageProvider,
  CloudAuthResult,
  CloudFile,
  CloudProviderId,
  CloudSyncStatus,
  CloudUploadResult,
} from "@/lib/services/cloud-storage/types";
import {
  getAllFolderPaths,
  getTargetFolder,
  PAWKIT_FOLDERS,
} from "@/lib/services/cloud-storage/folder-config";

const DROPBOX_API_BASE = "https://api.dropboxapi.com/2";
const DROPBOX_CONTENT_URL = "https://content.dropboxapi.com/2";

export class DropboxProvider implements CloudStorageProvider {
  readonly id: CloudProviderId = "dropbox";
  readonly name = "Dropbox";

  private initialized = false;

  /**
   * Dropbox uses OAuth - authentication happens via redirect flow
   * This method is called after OAuth callback to verify connection
   */
  async authenticate(_credentials: Record<string, string>): Promise<CloudAuthResult> {
    try {
      const response = await fetch("/api/auth/dropbox/status");
      const data = await response.json();

      if (data.connected) {
        // Initialize folder structure on first auth
        await this.initializeFolders();
        return {
          success: true,
          email: data.email,
        };
      }

      return {
        success: false,
        error: "Not connected to Dropbox",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to check status",
      };
    }
  }

  async disconnect(): Promise<void> {
    await fetch("/api/auth/dropbox/disconnect", { method: "POST" });
    this.initialized = false;
  }

  async checkConnection(): Promise<CloudSyncStatus> {
    try {
      const response = await fetch("/api/auth/dropbox/status");
      const data = await response.json();

      return {
        connected: data.connected === true,
        email: data.email || null,
        lastSyncedAt: null,
      };
    } catch {
      return {
        connected: false,
        email: null,
        lastSyncedAt: null,
      };
    }
  }

  /**
   * Get access token from server-side cookie via API
   */
  private async getAccessToken(): Promise<string> {
    const response = await fetch("/api/auth/dropbox/token");
    if (!response.ok) {
      throw new Error("Failed to get access token");
    }
    const data = await response.json();
    return data.accessToken;
  }

  /**
   * Initialize the full Pawkit folder structure in Dropbox
   * Creates: /Pawkit/_Audio, _Bookmarks, _Documents, _Images, _Notes, _Other, _Videos
   */
  async initializeFolders(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const accessToken = await this.getAccessToken();
      const allFolderPaths = getAllFolderPaths();

      // Silently ensure all folders exist (409 conflicts are expected and ignored)
      for (const folderPath of allFolderPaths) {
        await this.createFolderIfNotExists(accessToken, folderPath);
      }

      this.initialized = true;
      console.log("[Dropbox] Folder structure ready");
    } catch (error) {
      console.error("[Dropbox] Failed to initialize folders:", error);
    }
  }

  /**
   * Create a folder if it doesn't exist
   * Dropbox auto-creates parent folders
   * 409 Conflict is expected if folder exists - silently ignore
   */
  private async createFolderIfNotExists(accessToken: string, path: string): Promise<void> {
    try {
      const response = await fetch(`${DROPBOX_API_BASE}/files/create_folder_v2`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: path,
          autorename: false,
        }),
      });

      // 409 Conflict means folder already exists - that's expected and fine
      if (response.status === 409) {
        return;
      }

      if (!response.ok) {
        // Unexpected error - log for debugging but don't throw
        const data = await response.json().catch(() => ({}));
        console.warn(`[Dropbox] Unexpected folder create error for ${path}:`, data);
      }
    } catch (error) {
      // Network error - log but don't throw
      console.warn(`[Dropbox] Network error creating folder ${path}:`, error);
    }
  }

  async uploadFile(
    content: Blob | File,
    filename: string,
    path: string
  ): Promise<CloudUploadResult> {
    try {
      const accessToken = await this.getAccessToken();

      // Determine the correct folder based on path or file type
      let targetPath = path;
      if (!path.includes("_")) {
        // Path doesn't specify a folder, determine by file extension
        const folder = getTargetFolder(filename, content.type);
        targetPath = folder.path;
      } else if (!path.startsWith("/Pawkit")) {
        targetPath = "/Pawkit/" + path.replace(/^\//, "");
      }

      // Ensure folders exist
      if (!this.initialized) {
        await this.initializeFolders();
      }

      const fullPath = `${targetPath}/${filename}`;

      // Dropbox upload endpoint for files up to 150MB
      const response = await fetch(`${DROPBOX_CONTENT_URL}/files/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": JSON.stringify({
            path: fullPath,
            mode: "overwrite",
            autorename: false,
            mute: false,
          }),
        },
        body: content,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error_summary || "Upload failed");
      }

      const data = await response.json();

      return {
        success: true,
        cloudId: data.id,
        path: fullPath,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      console.error("[DropboxProvider] Upload failed:", message);
      return {
        success: false,
        cloudId: "",
        path: "",
        error: message,
      };
    }
  }

  async downloadFile(cloudId: string): Promise<Blob> {
    const accessToken = await this.getAccessToken();

    // Dropbox download requires path, not ID
    // cloudId in Dropbox is actually the file ID, we need to get metadata first
    const metadataResponse = await fetch(`${DROPBOX_API_BASE}/files/get_metadata`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: cloudId }),
    });

    if (!metadataResponse.ok) {
      throw new Error("Failed to get file metadata");
    }

    const metadata = await metadataResponse.json();

    const response = await fetch(`${DROPBOX_CONTENT_URL}/files/download`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Dropbox-API-Arg": JSON.stringify({ path: metadata.path_display }),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to download file");
    }

    return response.blob();
  }

  async deleteFile(cloudId: string): Promise<void> {
    const accessToken = await this.getAccessToken();

    // First get the file path from the cloudId
    const metadataResponse = await fetch(`${DROPBOX_API_BASE}/files/get_metadata`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: cloudId }),
    });

    if (!metadataResponse.ok) {
      // File might already be deleted
      if (metadataResponse.status === 409) {
        return;
      }
      throw new Error("Failed to get file metadata for deletion");
    }

    const metadata = await metadataResponse.json();

    const response = await fetch(`${DROPBOX_API_BASE}/files/delete_v2`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: metadata.path_display }),
    });

    if (!response.ok && response.status !== 409) {
      throw new Error("Failed to delete file");
    }
  }

  async listFiles(path?: string): Promise<CloudFile[]> {
    try {
      const accessToken = await this.getAccessToken();

      // Default to Pawkit root
      const targetPath = path || "/Pawkit";

      const response = await fetch(`${DROPBOX_API_BASE}/files/list_folder`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: targetPath,
          recursive: false,
          include_deleted: false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to list files");
      }

      const data = await response.json();

      return (data.entries || [])
        .filter((entry: { ".tag": string }) => entry[".tag"] === "file")
        .map((file: {
          id: string;
          name: string;
          path_display: string;
          size: number;
          server_modified: string;
        }) => ({
          cloudId: file.id,
          name: file.name,
          path: file.path_display,
          size: file.size || 0,
          mimeType: this.getMimeType(file.name),
          modifiedAt: new Date(file.server_modified),
          provider: this.id,
        }));
    } catch (error) {
      console.error("[DropboxProvider] List files failed:", error);
      return [];
    }
  }

  /**
   * Get MIME type from filename extension
   */
  private getMimeType(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const mimeTypes: Record<string, string> = {
      md: "text/markdown",
      txt: "text/plain",
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      mp3: "audio/mpeg",
      mp4: "video/mp4",
      json: "application/json",
      html: "text/html",
    };
    return mimeTypes[ext] || "application/octet-stream";
  }

  async uploadNote(
    content: string,
    filename: string,
    path = "_Notes"
  ): Promise<CloudUploadResult> {
    const name = filename.endsWith(".md") ? filename : `${filename}.md`;
    const blob = new Blob([content], { type: "text/markdown" });
    const file = new File([blob], name, { type: "text/markdown" });

    // Use the notes folder path
    const notesPath = PAWKIT_FOLDERS.notes.path;
    return this.uploadFile(file, name, notesPath);
  }
}

// Singleton instance
export const dropboxProvider = new DropboxProvider();
