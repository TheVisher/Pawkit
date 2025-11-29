/**
 * Filen Client Service - Client-side SDK wrapper for direct browser-to-Filen uploads.
 *
 * Security model:
 * - Credentials are fetched from server (stored in HTTP-only cookie)
 * - Credentials are stored in memory only (not localStorage)
 * - Credentials are cleared on logout or page unload
 * - Enables direct uploads to Filen with no size limit (chunked uploads)
 *
 * Note: SDK is imported dynamically to avoid bundling Node.js modules
 */

export interface FilenCredentials {
  email: string;
  apiKey: string;
  masterKeys: string[];
  privateKey: string;
  publicKey: string;
  userId: number;
  baseFolderUUID: string;
  authVersion: 1 | 2 | 3;
}

export interface FilenUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FilenUploadResult {
  uuid: string;
  name: string;
  size: number;
  path: string;
}

// Define a type for the SDK to allow dynamic access without strict typing
// The SDK is dynamically imported and has complex internal types
type FilenSDKType = {
  config: { email?: string };
  fs: () => {
    stat: (opts: { path: string }) => Promise<{ type: string; uuid: string }>;
    mkdir: (opts: { path: string }) => Promise<string>;
  };
  cloud: () => {
    uploadWebFile: (opts: {
      file: File;
      parent: string;
      name: string;
      onProgress?: (transferred: number) => void;
      abortSignal?: AbortSignal;
    }) => Promise<{ uuid: string; name: string; size: number }>;
  };
} | null;

class FilenClientService {
  // FilenSDK instance (dynamically imported)
  private sdk: FilenSDKType = null;
  private credentials: FilenCredentials | null = null;
  private initPromise: Promise<void> | null = null;
  private isInitializing = false;

  constructor() {
    // Clear credentials on page unload (security measure)
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.clear();
      });
    }
  }

  /**
   * Check if the SDK is initialized and ready
   */
  isInitialized(): boolean {
    return this.sdk !== null && this.credentials !== null;
  }

  /**
   * Get connected email if initialized
   */
  getConnectedEmail(): string | null {
    return this.credentials?.email || null;
  }

  /**
   * Initialize the SDK by fetching credentials from the server.
   * Safe to call multiple times - will reuse existing initialization.
   */
  async initialize(): Promise<void> {
    // Guard against SSR - SDK requires browser APIs
    if (typeof window === "undefined") {
      throw new Error("FilenClient can only be initialized in the browser");
    }

    // Check for Web Crypto API (required by Filen SDK)
    if (!window.crypto?.subtle) {
      throw new Error("Web Crypto API not available - HTTPS required");
    }

    // Already initialized
    if (this.sdk && this.credentials) {
      return;
    }

    // Already initializing - wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this._doInitialize();

    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
      this.isInitializing = false;
    }
  }

  private async _doInitialize(): Promise<void> {
    try {
      // Fetch credentials from server
      const response = await fetch("/api/filen/session", {
        credentials: "include", // Include cookies
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to fetch session" }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.credentials) {
        throw new Error(data.error || "Invalid session response");
      }

      const credentials = data.credentials as FilenCredentials;
      this.credentials = credentials;

      // Dynamically import SDK browser build explicitly
      // The default import might pick Node.js build causing "native" errors
      // @ts-expect-error - Direct browser build import has no type declarations
      const FilenSDK = (await import("@filen/sdk/dist/browser/index.js")).default;

      // Initialize SDK with credentials
      const sdk = new FilenSDK({
        metadataCache: true,
        connectToSocket: false,
        // Pass auth config directly to constructor
        apiKey: credentials.apiKey,
        masterKeys: credentials.masterKeys,
        userId: credentials.userId,
        baseFolderUUID: credentials.baseFolderUUID,
        authVersion: credentials.authVersion,
        privateKey: credentials.privateKey,
        publicKey: credentials.publicKey || undefined,
      });

      // Set email for identification
      sdk.config.email = credentials.email;
      this.sdk = sdk;

      console.log("[FilenClient] SDK initialized for:", credentials.email);
    } catch (error) {
      console.error("[FilenClient] Initialization failed:", error);
      this.clear();
      throw error;
    }
  }

  /**
   * Ensure folder exists, creating it if necessary.
   */
  async ensureFolder(path: string): Promise<string> {
    if (!this.sdk) {
      throw new Error("SDK not initialized");
    }

    const fs = this.sdk.fs();
    const parts = path.split("/").filter(Boolean);
    let currentPath = "";
    let folderUUID = this.credentials?.baseFolderUUID || "";

    for (const part of parts) {
      currentPath += "/" + part;
      try {
        const stat = await fs.stat({ path: currentPath });
        if (stat.type === "directory") {
          folderUUID = stat.uuid;
        }
      } catch {
        // Folder doesn't exist, create it
        // mkdir returns the UUID string directly
        folderUUID = await fs.mkdir({ path: currentPath });
      }
    }

    return folderUUID;
  }

  /**
   * Upload a file directly to Filen using the browser SDK.
   * Supports files of any size via chunked uploads.
   *
   * @param file - The File object to upload
   * @param targetPath - The Filen path (e.g., "/Pawkit/_Library")
   * @param options - Upload options
   */
  async uploadFile(
    file: File,
    targetPath: string,
    options?: {
      onProgress?: (progress: FilenUploadProgress) => void;
      abortSignal?: AbortSignal;
    }
  ): Promise<FilenUploadResult> {
    // Ensure SDK is initialized
    if (!this.sdk) {
      await this.initialize();
    }

    if (!this.sdk) {
      throw new Error("Failed to initialize Filen SDK");
    }

    try {
      // Ensure target folder exists and get its UUID
      const parentUUID = await this.ensureFolder(targetPath);

      // Upload using the browser-specific method
      const cloud = this.sdk.cloud();
      const fileSize = file.size;
      const result = await cloud.uploadWebFile({
        file,
        parent: parentUUID,
        name: file.name,
        onProgress: options?.onProgress
          ? (transferred: number) => {
              options.onProgress!({
                loaded: transferred,
                total: fileSize,
                percentage: Math.round((transferred / fileSize) * 100),
              });
            }
          : undefined,
        abortSignal: options?.abortSignal,
      });

      console.log("[FilenClient] Upload complete:", result.name, result.uuid);

      return {
        uuid: result.uuid,
        name: result.name,
        size: result.size,
        path: `${targetPath}/${result.name}`,
      };
    } catch (error) {
      console.error("[FilenClient] Upload failed:", error);
      throw error;
    }
  }

  /**
   * Clear credentials and SDK from memory.
   * Called on logout or page unload.
   */
  clear(): void {
    if (this.credentials) {
      // Overwrite sensitive data before clearing
      if (this.credentials.apiKey) {
        this.credentials.apiKey = "";
      }
      if (this.credentials.masterKeys) {
        this.credentials.masterKeys = [];
      }
      if (this.credentials.privateKey) {
        this.credentials.privateKey = "";
      }
    }
    this.credentials = null;
    this.sdk = null;
    this.initPromise = null;
    this.isInitializing = false;
    console.log("[FilenClient] Credentials cleared");
  }

  /**
   * Re-initialize the SDK (useful after reconnecting Filen)
   */
  async reinitialize(): Promise<void> {
    this.clear();
    await this.initialize();
  }
}

// Singleton instance
export const filenClient = new FilenClientService();

export default filenClient;
