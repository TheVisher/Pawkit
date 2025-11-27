/**
 * Filen Service - Client-side wrapper for Filen cloud storage operations.
 * All SDK operations happen server-side via API routes.
 * Credentials are processed on the server and never stored client-side.
 */

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
  async login(credentials: FilenCredentials): Promise<{ success: boolean; error?: string; needs2FA?: boolean }> {
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
        return { success: false, error: "Two-factor authentication code required", needs2FA: true };
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
