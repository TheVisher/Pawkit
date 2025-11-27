import FilenSDK from "@filen/sdk";

export interface FilenCredentials {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface FilenFile {
  uuid: string;
  name: string;
  size: number;
  mime: string;
  parent: string;
  timestamp: number;
}

export interface FilenSyncStatus {
  connected: boolean;
  lastSync: Date | null;
  pendingUploads: number;
  pendingDownloads: number;
}

// Singleton instance for the Filen SDK
let filenInstance: FilenSDK | null = null;
let isInitialized = false;

/**
 * Filen Service - handles authentication and file operations with Filen cloud storage.
 * Uses client-side encryption, credentials never leave the device.
 */
export const filenService = {
  /**
   * Get or create the Filen SDK instance
   */
  getInstance(): FilenSDK {
    if (!filenInstance) {
      filenInstance = new FilenSDK({
        metadataCache: true,
        connectToSocket: false, // Disable socket for web usage
      });
    }
    return filenInstance;
  },

  /**
   * Check if user is currently logged in
   */
  isLoggedIn(): boolean {
    return isInitialized;
  },

  /**
   * Authenticate with Filen using email and password
   * Optionally accepts 2FA code if enabled on account
   */
  async login(credentials: FilenCredentials): Promise<{ success: boolean; error?: string }> {
    try {
      const filen = this.getInstance();

      await filen.login({
        email: credentials.email,
        password: credentials.password,
        twoFactorCode: credentials.twoFactorCode || undefined,
      });

      isInitialized = true;
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to connect to Filen";

      // Handle common errors
      if (errorMessage.includes("2FA")) {
        return { success: false, error: "Two-factor authentication code required" };
      }
      if (errorMessage.includes("credentials") || errorMessage.includes("password")) {
        return { success: false, error: "Invalid email or password" };
      }

      return { success: false, error: errorMessage };
    }
  },

  /**
   * Disconnect from Filen and clear credentials
   */
  async logout(): Promise<void> {
    filenInstance = null;
    isInitialized = false;
  },

  /**
   * Create the Pawkit sync folder if it doesn't exist
   */
  async ensurePawkitFolder(): Promise<string> {
    if (!isInitialized) {
      throw new Error("Not logged in to Filen");
    }

    const filen = this.getInstance();
    const fs = filen.fs();
    const pawkitPath = "/Pawkit";

    try {
      // Check if folder exists
      await fs.stat({ path: pawkitPath });
    } catch {
      // Create folder if it doesn't exist
      await fs.mkdir({ path: pawkitPath });
    }

    return pawkitPath;
  },

  /**
   * Upload a file to Filen
   */
  async uploadFile(
    fileData: Blob | ArrayBuffer,
    fileName: string,
    folderPath: string = "/Pawkit"
  ): Promise<FilenFile | null> {
    if (!isInitialized) {
      throw new Error("Not logged in to Filen");
    }

    try {
      const filen = this.getInstance();
      const fs = filen.fs();
      const filePath = `${folderPath}/${fileName}`;

      // Convert to Buffer if needed
      const buffer =
        fileData instanceof Blob
          ? Buffer.from(await fileData.arrayBuffer())
          : Buffer.from(fileData);

      await fs.writeFile({
        path: filePath,
        content: buffer,
      });

      // Get file info after upload
      const stat = await fs.stat({ path: filePath });

      // Ensure we have a file stat (not directory)
      if (stat.type !== "file") {
        throw new Error("Expected file but got directory");
      }

      return {
        uuid: stat.uuid,
        name: stat.name,
        size: stat.size,
        mime: stat.mime || "application/octet-stream",
        parent: folderPath,
        timestamp: stat.mtimeMs,
      };
    } catch (error) {
      console.error("Error uploading file to Filen:", error);
      return null;
    }
  },

  /**
   * Download a file from Filen
   */
  async downloadFile(filePath: string): Promise<Buffer | null> {
    if (!isInitialized) {
      throw new Error("Not logged in to Filen");
    }

    try {
      const filen = this.getInstance();
      const fs = filen.fs();

      const content = await fs.readFile({ path: filePath });
      return content;
    } catch (error) {
      console.error("Error downloading file from Filen:", error);
      return null;
    }
  },

  /**
   * List files in a directory
   */
  async listFiles(directoryPath: string = "/Pawkit"): Promise<FilenFile[]> {
    if (!isInitialized) {
      throw new Error("Not logged in to Filen");
    }

    try {
      const filen = this.getInstance();
      const fs = filen.fs();

      const entries = await fs.readdir({ path: directoryPath });
      const files: FilenFile[] = [];

      for (const entry of entries) {
        const stat = await fs.stat({ path: `${directoryPath}/${entry}` });
        if (stat.type === "file") {
          files.push({
            uuid: stat.uuid,
            name: stat.name,
            size: stat.size,
            mime: stat.mime || "application/octet-stream",
            parent: directoryPath,
            timestamp: stat.mtimeMs,
          });
        }
      }

      return files;
    } catch (error) {
      console.error("Error listing files from Filen:", error);
      return [];
    }
  },

  /**
   * Delete a file from Filen
   */
  async deleteFile(filePath: string): Promise<boolean> {
    if (!isInitialized) {
      throw new Error("Not logged in to Filen");
    }

    try {
      const filen = this.getInstance();
      const fs = filen.fs();

      await fs.rm({ path: filePath });
      return true;
    } catch (error) {
      console.error("Error deleting file from Filen:", error);
      return false;
    }
  },

  /**
   * Check if a file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    if (!isInitialized) {
      throw new Error("Not logged in to Filen");
    }

    try {
      const filen = this.getInstance();
      const fs = filen.fs();

      await fs.stat({ path: filePath });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get sync status
   */
  getSyncStatus(): FilenSyncStatus {
    return {
      connected: isInitialized,
      lastSync: null, // TODO: Track last sync time
      pendingUploads: 0,
      pendingDownloads: 0,
    };
  },
};

export default filenService;
