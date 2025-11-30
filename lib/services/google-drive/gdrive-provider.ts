/**
 * Google Drive Cloud Storage Provider
 *
 * Implements the CloudStorageProvider interface for Google Drive.
 * Uses OAuth tokens stored in HTTP-only cookies for authentication.
 */

import {
  CloudStorageProvider,
  CloudAuthResult,
  CloudFile,
  CloudProviderId,
  CloudSyncStatus,
  CloudUploadResult,
} from "@/lib/services/cloud-storage/types";

const GDRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const GDRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

// Default folder for Pawkit files in Google Drive
const PAWKIT_FOLDER_NAME = "Pawkit";
const NOTES_FOLDER_NAME = "_Notes";

export class GoogleDriveProvider implements CloudStorageProvider {
  readonly id: CloudProviderId = "google-drive";
  readonly name = "Google Drive";

  private pawkitFolderId: string | null = null;
  private notesFolderId: string | null = null;

  /**
   * Google Drive uses OAuth - authentication happens via redirect flow
   * This method is called after OAuth callback to verify connection
   */
  async authenticate(_credentials: Record<string, string>): Promise<CloudAuthResult> {
    // For Google Drive, we don't use credentials directly
    // Instead, check if we have valid tokens via the status endpoint
    try {
      const response = await fetch("/api/auth/gdrive/status");
      const data = await response.json();

      if (data.connected) {
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
    this.pawkitFolderId = null;
    this.notesFolderId = null;
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
   * Ensure Pawkit folder exists in Google Drive
   */
  private async ensurePawkitFolder(accessToken: string): Promise<string> {
    if (this.pawkitFolderId) {
      return this.pawkitFolderId;
    }

    // Search for existing Pawkit folder
    const searchResponse = await fetch(
      `${GDRIVE_API_BASE}/files?q=name='${PAWKIT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!searchResponse.ok) {
      throw new Error("Failed to search for Pawkit folder");
    }

    const searchData = await searchResponse.json();

    if (searchData.files && searchData.files.length > 0) {
      this.pawkitFolderId = searchData.files[0].id;
      return this.pawkitFolderId!;
    }

    // Create Pawkit folder
    const createResponse = await fetch(`${GDRIVE_API_BASE}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: PAWKIT_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      }),
    });

    if (!createResponse.ok) {
      throw new Error("Failed to create Pawkit folder");
    }

    const createData = await createResponse.json();
    this.pawkitFolderId = createData.id;
    return this.pawkitFolderId!;
  }

  /**
   * Ensure _Notes folder exists inside Pawkit folder
   */
  private async ensureNotesFolder(accessToken: string): Promise<string> {
    if (this.notesFolderId) {
      return this.notesFolderId;
    }

    const pawkitFolderId = await this.ensurePawkitFolder(accessToken);

    // Search for existing _Notes folder
    const searchResponse = await fetch(
      `${GDRIVE_API_BASE}/files?q=name='${NOTES_FOLDER_NAME}' and '${pawkitFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!searchResponse.ok) {
      throw new Error("Failed to search for Notes folder");
    }

    const searchData = await searchResponse.json();

    if (searchData.files && searchData.files.length > 0) {
      this.notesFolderId = searchData.files[0].id;
      return this.notesFolderId!;
    }

    // Create _Notes folder
    const createResponse = await fetch(`${GDRIVE_API_BASE}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: NOTES_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
        parents: [pawkitFolderId],
      }),
    });

    if (!createResponse.ok) {
      throw new Error("Failed to create Notes folder");
    }

    const createData = await createResponse.json();
    this.notesFolderId = createData.id;
    return this.notesFolderId!;
  }

  /**
   * Get or create a folder by path (relative to Pawkit folder)
   */
  private async getOrCreateFolder(accessToken: string, path: string): Promise<string> {
    // If path is for notes, use the notes folder
    if (path.includes("_Notes")) {
      return this.ensureNotesFolder(accessToken);
    }

    // Otherwise, just use the Pawkit folder
    return this.ensurePawkitFolder(accessToken);
  }

  async uploadFile(
    content: Blob | File,
    filename: string,
    path: string
  ): Promise<CloudUploadResult> {
    try {
      const accessToken = await this.getAccessToken();
      const parentFolderId = await this.getOrCreateFolder(accessToken, path);

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
        path: `/${PAWKIT_FOLDER_NAME}/${path}/${filename}`,
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
    const response = await fetch(
      `${GDRIVE_API_BASE}/files?q=name='${filename}' and '${parentFolderId}' in parents and trashed=false&fields=files(id)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
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

      let folderId: string;
      if (path?.includes("_Notes")) {
        folderId = await this.ensureNotesFolder(accessToken);
      } else {
        folderId = await this.ensurePawkitFolder(accessToken);
      }

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
        path: `/${PAWKIT_FOLDER_NAME}/${file.name}`,
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

    return this.uploadFile(file, name, path);
  }
}

// Singleton instance
export const gdriveProvider = new GoogleDriveProvider();
