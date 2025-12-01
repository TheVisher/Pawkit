/**
 * OneDrive Cloud Storage Provider
 *
 * Implements the CloudStorageProvider interface for OneDrive.
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

const GRAPH_API_URL = "https://graph.microsoft.com/v1.0";

export class OneDriveProvider implements CloudStorageProvider {
  readonly id: CloudProviderId = "onedrive";
  readonly name = "OneDrive";

  private initialized = false;

  /**
   * OneDrive uses OAuth - authentication happens via redirect flow
   * This method is called after OAuth callback to verify connection
   */
  async authenticate(_credentials: Record<string, string>): Promise<CloudAuthResult> {
    try {
      const response = await fetch("/api/auth/onedrive/status");
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
        error: "Not connected to OneDrive",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to check status",
      };
    }
  }

  async disconnect(): Promise<void> {
    await fetch("/api/auth/onedrive/disconnect", { method: "POST" });
    this.initialized = false;
  }

  async checkConnection(): Promise<CloudSyncStatus> {
    try {
      const response = await fetch("/api/auth/onedrive/status");
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
    const response = await fetch("/api/auth/onedrive/token");
    if (!response.ok) {
      throw new Error("Failed to get access token");
    }
    const data = await response.json();
    return data.accessToken;
  }

  /**
   * Initialize the full Pawkit folder structure in OneDrive
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
      console.log("[OneDrive] Folder structure ready");
    } catch (error) {
      console.error("[OneDrive] Failed to initialize folders:", error);
    }
  }

  /**
   * Create a folder if it doesn't exist
   * OneDrive uses path-based folder creation
   * 409 Conflict is expected if folder exists - silently ignore
   */
  private async createFolderIfNotExists(accessToken: string, path: string): Promise<void> {
    try {
      // Parse the path to get parent and folder name
      // e.g., "/Pawkit/_Notes" -> parent="/Pawkit", name="_Notes"
      const parts = path.split("/").filter(Boolean);

      // Create each folder in the path hierarchy
      let currentPath = "";
      for (const folderName of parts) {
        const parentPath = currentPath || "root";
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

        // Check if folder exists first
        const checkUrl = parentPath === "root"
          ? `${GRAPH_API_URL}/me/drive/root:/${currentPath}`
          : `${GRAPH_API_URL}/me/drive/root:/${currentPath}`;

        const checkResponse = await fetch(checkUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (checkResponse.ok) {
          // Folder exists, continue to next
          continue;
        }

        // Folder doesn't exist, create it
        const createUrl = parentPath === "root"
          ? `${GRAPH_API_URL}/me/drive/root/children`
          : `${GRAPH_API_URL}/me/drive/root:/${parentPath.split("/").slice(0, -1).join("/") || ""}:/children`;

        // Simpler approach: use the items endpoint
        const parentForCreate = parts.slice(0, parts.indexOf(folderName)).join("/");
        const createEndpoint = parentForCreate
          ? `${GRAPH_API_URL}/me/drive/root:/${parentForCreate}:/children`
          : `${GRAPH_API_URL}/me/drive/root/children`;

        const response = await fetch(createEndpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: folderName,
            folder: {},
            "@microsoft.graph.conflictBehavior": "fail",
          }),
        });

        // 409 Conflict means folder already exists - that's expected and fine
        if (response.status === 409) {
          continue;
        }

        if (!response.ok && response.status !== 409) {
          const data = await response.json().catch(() => ({}));
          console.warn(`[OneDrive] Unexpected folder create error for ${currentPath}:`, data);
        }
      }
    } catch (error) {
      console.warn(`[OneDrive] Network error creating folder ${path}:`, error);
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

      // Remove leading slash for OneDrive path
      const onedrivePath = targetPath.replace(/^\//, "");
      const fullPath = `${onedrivePath}/${filename}`;

      // For files up to 4MB, use simple upload
      // For larger files, would need to use upload session
      const fileSize = content.size;

      if (fileSize > 4 * 1024 * 1024) {
        // Large file upload using session
        return await this.uploadLargeFile(accessToken, content, fullPath);
      }

      // Simple upload for small files
      const response = await fetch(
        `${GRAPH_API_URL}/me/drive/root:/${fullPath}:/content`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": content.type || "application/octet-stream",
          },
          body: content,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Upload failed");
      }

      const data = await response.json();

      return {
        success: true,
        cloudId: data.id,
        path: "/" + fullPath,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      console.error("[OneDriveProvider] Upload failed:", message);
      return {
        success: false,
        cloudId: "",
        path: "",
        error: message,
      };
    }
  }

  /**
   * Upload large files (>4MB) using upload session
   */
  private async uploadLargeFile(
    accessToken: string,
    content: Blob | File,
    path: string
  ): Promise<CloudUploadResult> {
    try {
      // Create upload session
      const sessionResponse = await fetch(
        `${GRAPH_API_URL}/me/drive/root:/${path}:/createUploadSession`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            item: {
              "@microsoft.graph.conflictBehavior": "replace",
            },
          }),
        }
      );

      if (!sessionResponse.ok) {
        throw new Error("Failed to create upload session");
      }

      const session = await sessionResponse.json();
      const uploadUrl = session.uploadUrl;

      // Upload the entire file in one chunk (simplified for now)
      const buffer = await content.arrayBuffer();
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Length": content.size.toString(),
          "Content-Range": `bytes 0-${content.size - 1}/${content.size}`,
        },
        body: buffer,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const data = await response.json();

      return {
        success: true,
        cloudId: data.id,
        path: "/" + path,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
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

    // Get download URL
    const response = await fetch(
      `${GRAPH_API_URL}/me/drive/items/${cloudId}/content`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        redirect: "follow",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to download file");
    }

    return response.blob();
  }

  async deleteFile(cloudId: string): Promise<void> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `${GRAPH_API_URL}/me/drive/items/${cloudId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // 404 means file already deleted, that's fine
    if (!response.ok && response.status !== 404) {
      throw new Error("Failed to delete file");
    }
  }

  async listFiles(path?: string): Promise<CloudFile[]> {
    try {
      const accessToken = await this.getAccessToken();

      // Default to Pawkit root
      const targetPath = (path || "/Pawkit").replace(/^\//, "");

      const response = await fetch(
        `${GRAPH_API_URL}/me/drive/root:/${targetPath}:/children`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        // Folder might not exist yet
        if (response.status === 404) {
          return [];
        }
        throw new Error("Failed to list files");
      }

      const data = await response.json();

      return (data.value || [])
        .filter((item: { folder?: object }) => !item.folder) // Only files, not folders
        .map((file: {
          id: string;
          name: string;
          parentReference: { path: string };
          size: number;
          lastModifiedDateTime: string;
          file?: { mimeType: string };
        }) => ({
          cloudId: file.id,
          name: file.name,
          path: file.parentReference?.path + "/" + file.name,
          size: file.size || 0,
          mimeType: file.file?.mimeType || this.getMimeType(file.name),
          modifiedAt: new Date(file.lastModifiedDateTime),
          provider: this.id,
        }));
    } catch (error) {
      console.error("[OneDriveProvider] List files failed:", error);
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
export const onedriveProvider = new OneDriveProvider();
