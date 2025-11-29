/**
 * Filen Service - Client-side wrapper for Filen cloud storage operations.
 * All SDK operations happen server-side via API routes.
 * Credentials are stored as encrypted HTTP-only cookies.
 */

export interface FilenCredentials {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface FilenFileInfo {
  uuid: string;
  name: string;
  path: string;
  size: number;
  mime: string;
  modified: number;
  pawkit: string | null;
  isAttachment: boolean;
}

export interface FilenUploadResult {
  success: boolean;
  filenUuid: string;
  path: string;
  fileId: string;
}

export interface FilenSyncStatus {
  connected: boolean;
  lastSync: Date | null;
  pendingUploads: number;
  pendingDownloads: number;
}

// Track client-side connection state
let isConnected = false;
let connectedEmail: string | null = null;

export const filenService = {
  /**
   * Check if user is currently logged in
   */
  isLoggedIn(): boolean {
    return isConnected;
  },

  /**
   * Get the connected email (if any)
   */
  getConnectedEmail(): string | null {
    return connectedEmail;
  },

  /**
   * Authenticate with Filen using email and password
   * Optionally accepts 2FA code if enabled on account
   */
  async login(
    credentials: FilenCredentials
  ): Promise<{ success: boolean; error?: string; needs2FA?: boolean }> {
    try {
      const response = await fetch("/api/filen/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success) {
        isConnected = true;
        connectedEmail = data.email;
        return { success: true };
      }

      // Handle 2FA requirement
      if (data.needs2FA) {
        return {
          success: false,
          error: "Two-factor authentication code required",
          needs2FA: true,
        };
      }

      return { success: false, error: data.error || "Failed to connect to Filen" };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to connect to Filen";
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Disconnect from Filen and clear session
   */
  async logout(): Promise<void> {
    try {
      await fetch("/api/filen/auth", { method: "DELETE" });
    } catch {
      // Ignore errors during logout
    }
    isConnected = false;
    connectedEmail = null;
  },

  /**
   * Check authentication status from server
   */
  async checkAuth(): Promise<{ authenticated: boolean; email: string | null }> {
    try {
      const response = await fetch("/api/filen/auth");
      const data = await response.json();
      isConnected = data.authenticated;
      connectedEmail = data.email;
      return data;
    } catch {
      isConnected = false;
      connectedEmail = null;
      return { authenticated: false, email: null };
    }
  },

  // ============================================
  // File Operations
  // ============================================

  /**
   * Upload a file to Filen
   * @param file - The file to upload
   * @param options - Upload options
   * @returns Upload result with Filen UUID and path
   */
  async uploadFile(
    file: File,
    options: {
      fileId: string;
      pawkit?: string | null;
      isAttachment?: boolean;
    }
  ): Promise<FilenUploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileId", options.fileId);
    if (options.pawkit) {
      formData.append("pawkit", options.pawkit);
    }
    if (options.isAttachment) {
      formData.append("isAttachment", "true");
    }

    const response = await fetch("/api/filen/files", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      // Handle 413 Payload Too Large - server returns HTML, not JSON
      if (response.status === 413) {
        throw new Error(`File too large for upload (${file.name}). Maximum size is 4MB for cloud sync.`);
      }

      // Try to parse JSON error, but handle non-JSON responses gracefully
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        } else {
          // Non-JSON response (likely HTML error page)
          throw new Error(`Upload failed with status ${response.status}`);
        }
      } catch (parseError) {
        // If JSON parsing fails, throw a generic error
        if (parseError instanceof Error && parseError.message.includes("File too large")) {
          throw parseError;
        }
        throw new Error(`Upload failed with status ${response.status}`);
      }
    }

    return response.json();
  },

  /**
   * List all files in the Pawkit folder on Filen
   */
  async listFiles(): Promise<FilenFileInfo[]> {
    const response = await fetch("/api/filen/files");

    if (!response.ok) {
      // Try to parse JSON error, but handle non-JSON responses gracefully
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const error = await response.json();
          throw new Error(error.error || "Failed to list files");
        } else {
          throw new Error(`Failed to list files (status ${response.status})`);
        }
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes("Failed to list")) {
          throw parseError;
        }
        throw new Error(`Failed to list files (status ${response.status})`);
      }
    }

    const data = await response.json();
    return data.files;
  },

  /**
   * Download a file from Filen by UUID
   * @param uuid - The Filen UUID of the file
   * @returns Blob containing the file data
   */
  async downloadFile(uuid: string): Promise<Blob> {
    const response = await fetch(`/api/filen/files/${uuid}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Download failed" }));
      throw new Error(error.error || "Download failed");
    }

    return response.blob();
  },

  /**
   * Delete a file from Filen by UUID
   * @param uuid - The Filen UUID of the file
   */
  async deleteFile(uuid: string): Promise<void> {
    const response = await fetch(`/api/filen/files/${uuid}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Delete failed");
    }
  },

  /**
   * Get sync status
   */
  getSyncStatus(): FilenSyncStatus {
    return {
      connected: isConnected,
      lastSync: null, // TODO: Track last sync time
      pendingUploads: 0,
      pendingDownloads: 0,
    };
  },
};

export default filenService;
