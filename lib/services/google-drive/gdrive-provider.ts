/**
 * Google Drive Cloud Storage Provider
 *
 * Implements the CloudStorageProvider interface for Google Drive.
 * Uses OAuth tokens stored in HTTP-only cookies for authentication.
 * Creates the same folder structure as Filen for consistency.
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
  type PawkitFolderKey,
} from "@/lib/services/cloud-storage/folder-config";

const GDRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const GDRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

// Cache folder IDs to avoid repeated lookups
type FolderIdCache = Record<string, string>;

export class GoogleDriveProvider implements CloudStorageProvider {
  readonly id: CloudProviderId = "google-drive";
  readonly name = "Google Drive";

  // Cache of folder path -> folder ID
  private folderIds: FolderIdCache = {};
  private initialized = false;

  /**
   * Google Drive uses OAuth - authentication happens via redirect flow
   * This method is called after OAuth callback to verify connection
   */
  async authenticate(_credentials: Record<string, string>): Promise<CloudAuthResult> {
    try {
      const response = await fetch("/api/auth/gdrive/status");
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
        error: "Not connected to Google Drive",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to check status",
      };
    }
  }

  async disconnect(): Promise<void> {
    await fetch("/api/auth/gdrive/disconnect", { method: "POST" });
    this.folderIds = {};
    this.initialized = false;
  }

  async checkConnection(): Promise<CloudSyncStatus> {
    try {
      const response = await fetch("/api/auth/gdrive/status");
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
    const response = await fetch("/api/auth/gdrive/token");
    if (!response.ok) {
      throw new Error("Failed to get access token");
    }
    const data = await response.json();
    return data.accessToken;
  }

  /**
   * Initialize the full Pawkit folder structure in Google Drive
   * Creates: Pawkit/_Audio, _Bookmarks, _Documents, _Images, _Notes, _Other, _Videos
   */
  async initializeFolders(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const accessToken = await this.getAccessToken();
      const allFolderPaths = getAllFolderPaths();

      console.log("[GDrive] Initializing folder structure...");

      for (const folderPath of allFolderPaths) {
        try {
          const folderId = await this.ensureFolderByPath(accessToken, folderPath);
          this.folderIds[folderPath] = folderId;
          console.log(`[GDrive] Folder ready: ${folderPath} -> ${folderId}`);
        } catch (error) {
          console.error(`[GDrive] Failed to create folder ${folderPath}:`, error);
        }
      }

      this.initialized = true;
      console.log("[GDrive] Folder structure initialized");
    } catch (error) {
      console.error("[GDrive] Failed to initialize folders:", error);
    }
  }

  /**
   * Ensure a folder exists by its full path (e.g., "/Pawkit/_Notes")
   * Creates parent folders if needed
   */
  private async ensureFolderByPath(accessToken: string, fullPath: string): Promise<string> {
    // Check cache first
    if (this.folderIds[fullPath]) {
      return this.folderIds[fullPath];
    }

    // Split path into parts (e.g., "/Pawkit/_Notes" -> ["Pawkit", "_Notes"])
    const parts = fullPath.split("/").filter(Boolean);
    let parentId: string | null = null;
    let currentPath = "";

    for (const folderName of parts) {
      currentPath += "/" + folderName;

      // Check cache for this level
      if (this.folderIds[currentPath]) {
        parentId = this.folderIds[currentPath];
        continue;
      }

      // Search for existing folder
      let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      if (parentId) {
        query += ` and '${parentId}' in parents`;
      } else {
        // Root level - search in "My Drive"
        query += ` and 'root' in parents`;
      }

      const searchResponse: Response = await fetch(
        `${GDRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!searchResponse.ok) {
        throw new Error(`Failed to search for folder: ${folderName}`);
      }

      const searchData: { files?: Array<{ id: string; name: string }> } = await searchResponse.json();

      if (searchData.files && searchData.files.length > 0) {
        // Folder exists
        parentId = searchData.files[0].id as string;
        this.folderIds[currentPath] = parentId;
      } else {
        // Create folder
        const createResponse: Response = await fetch(`${GDRIVE_API_BASE}/files`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: folderName,
            mimeType: "application/vnd.google-apps.folder",
            parents: parentId ? [parentId] : undefined,
          }),
        });

        if (!createResponse.ok) {
          throw new Error(`Failed to create folder: ${folderName}`);
        }

        const createData: { id: string } = await createResponse.json();
        parentId = createData.id;
        this.folderIds[currentPath] = parentId;
        console.log(`[GDrive] Created folder: ${currentPath}`);
      }
    }

    return parentId as string;
  }

  /**
   * Get folder ID for a given path, initializing if needed
   */
  private async getFolderId(path: string): Promise<string> {
    // Normalize path
    const normalizedPath = path.startsWith("/") ? path : "/" + path;
    const fullPath = normalizedPath.startsWith("/Pawkit") ? normalizedPath : "/Pawkit" + normalizedPath;

    // Initialize folders if not done
    if (!this.initialized) {
      await this.initializeFolders();
    }

    // Check cache
    if (this.folderIds[fullPath]) {
      return this.folderIds[fullPath];
    }

    // Fallback: create the specific folder
    const accessToken = await this.getAccessToken();
    const folderId = await this.ensureFolderByPath(accessToken, fullPath);
    return folderId;
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

      const parentFolderId = await this.getFolderId(targetPath);

      // Check if file already exists (for update)
      const existingFileId = await this.findFileByName(accessToken, filename, parentFolderId);

      const metadata = {
        name: filename,
        ...(existingFileId ? {} : { parents: [parentFolderId] }),
      };

      const form = new FormData();
      form.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" })
      );
      form.append("file", content);

      const url = existingFileId
        ? `${GDRIVE_UPLOAD_URL}/${existingFileId}?uploadType=multipart`
        : `${GDRIVE_UPLOAD_URL}?uploadType=multipart`;

      const response = await fetch(url, {
        method: existingFileId ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Upload failed");
      }

      const data = await response.json();

      return {
        success: true,
        cloudId: data.id,
        path: `${targetPath}/${filename}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      console.error("[GDriveProvider] Upload failed:", message);
      return {
        success: false,
        cloudId: "",
        path: "",
        error: message,
      };
    }
  }

  private async findFileByName(
    accessToken: string,
    filename: string,
    parentFolderId: string
  ): Promise<string | null> {
    // Escape single quotes in filename for Google Drive query
    const escapedFilename = filename.replace(/'/g, "\\'");
    // Build query and properly URL encode it
    const query = `name='${escapedFilename}' and '${parentFolderId}' in parents and trashed=false`;
    const url = `${GDRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id)`;

    const response: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      console.warn(`[GDrive] findFileByName failed for "${filename}":`, response.status);
      return null;
    }

    const data: { files?: Array<{ id: string }> } = await response.json();
    return data.files?.[0]?.id || null;
  }

  async downloadFile(cloudId: string): Promise<Blob> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `${GDRIVE_API_BASE}/files/${cloudId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to download file");
    }

    return response.blob();
  }

  async deleteFile(cloudId: string): Promise<void> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${GDRIVE_API_BASE}/files/${cloudId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error("Failed to delete file");
    }
  }

  async listFiles(path?: string): Promise<CloudFile[]> {
    try {
      const accessToken = await this.getAccessToken();

      // Default to Pawkit root
      const targetPath = path || "/Pawkit";
      const folderId = await this.getFolderId(targetPath);

      const response = await fetch(
        `${GDRIVE_API_BASE}/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,mimeType,size,modifiedTime)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to list files");
      }

      const data = await response.json();

      return (data.files || []).map((file: {
        id: string;
        name: string;
        mimeType: string;
        size?: string;
        modifiedTime: string;
      }) => ({
        cloudId: file.id,
        name: file.name,
        path: `${targetPath}/${file.name}`,
        size: parseInt(file.size || "0", 10),
        mimeType: file.mimeType,
        modifiedAt: new Date(file.modifiedTime),
        provider: this.id,
      }));
    } catch (error) {
      console.error("[GDriveProvider] List files failed:", error);
      return [];
    }
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
export const gdriveProvider = new GoogleDriveProvider();
