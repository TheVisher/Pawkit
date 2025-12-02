/**
 * Cloud Storage Provider Types
 *
 * Abstract interface for cloud storage providers (Filen, Google Drive, Dropbox, etc.)
 * enabling multi-provider sync support.
 */

export type CloudProviderId = "filen" | "google-drive" | "dropbox" | "onedrive";

export interface CloudFile {
  cloudId: string;        // Provider-specific ID (e.g., Filen UUID)
  name: string;
  path: string;
  size: number;
  mimeType: string;
  modifiedAt: Date;
  provider: CloudProviderId;
  isFolder: boolean;      // Distinguish files from folders for file explorer
}

export interface CloudUploadResult {
  success: boolean;
  cloudId: string;
  path: string;
  error?: string;
}

export interface CloudAuthResult {
  success: boolean;
  email?: string;
  error?: string;
  needs2FA?: boolean;
}

export interface CloudSyncStatus {
  connected: boolean;
  email: string | null;
  lastSyncedAt: Date | null;
}

export interface CloudStorageProvider {
  readonly id: CloudProviderId;
  readonly name: string;

  // Authentication
  authenticate(credentials: Record<string, string>): Promise<CloudAuthResult>;
  disconnect(): Promise<void>;
  checkConnection(): Promise<CloudSyncStatus>;

  // File operations
  uploadFile(
    content: Blob | File,
    filename: string,
    path: string
  ): Promise<CloudUploadResult>;

  downloadFile(cloudId: string): Promise<Blob>;
  deleteFile(cloudId: string): Promise<void>;
  listFiles(path?: string): Promise<CloudFile[]>;

  // Note operations (markdown files)
  uploadNote(
    content: string,
    filename: string,
    path?: string
  ): Promise<CloudUploadResult>;
}
