---
name: pawkit-cloud-providers
description: Guide for implementing cloud storage providers (Filen, Google Drive, Dropbox, OneDrive)
---

# Pawkit Cloud Storage Providers Guide

**Purpose**: Complete guide for implementing and maintaining cloud storage providers for backup/sync.

**Current Providers**: Filen (complete), Google Drive (complete), Dropbox (complete), OneDrive (complete)

---

## ARCHITECTURE OVERVIEW

### Multi-Provider Design

Pawkit supports **multiple simultaneous cloud providers**. When a user connects to both Filen AND Google Drive, all files sync to BOTH providers independently for redundancy.

```
User saves file in Pawkit
    ↓
IndexedDB (local storage) ← SOURCE OF TRUTH
    ↓
Sync Scheduler (background)
    ↓
┌─────────────────┐    ┌─────────────────┐
│     Filen       │    │  Google Drive   │
│ /Pawkit/_Notes  │    │ /Pawkit/_Notes  │
└─────────────────┘    └─────────────────┘
```

### Key Principle

**All providers use the SAME folder structure.** This ensures:
- Files are organized identically across providers
- Users can easily find files in any cloud
- Switching providers doesn't require reorganization

---

## FOLDER STRUCTURE

### Standard Pawkit Folders

Every cloud provider must create this exact structure:

```
/Pawkit/
├── _Audio/         # mp3, wav, m4a, flac, ogg, aac, etc.
├── _Bookmarks/     # Bookmark exports
│   ├── _json/      # Pawkit format (JSON)
│   └── _html/      # Browser format (HTML)
├── _Documents/     # pdf, doc, docx, xls, xlsx, ppt, etc.
├── _Images/        # jpg, png, gif, webp, svg, etc.
├── _Notes/         # md, txt files (synced notes)
├── _Other/         # Catch-all for other file types
└── _Videos/        # mp4, mov, avi, mkv, webm, etc.
```

### File Routing Logic

Files are automatically routed to folders by extension/MIME type:

```typescript
// lib/services/cloud-storage/folder-config.ts

import { getTargetFolder } from "@/lib/services/cloud-storage/folder-config";

// Route by filename
const folder = getTargetFolder("document.pdf", "application/pdf");
// Returns: { key: "documents", path: "/Pawkit/_Documents", ... }

// Route by extension
const folder = getTargetFolder("photo.jpg");
// Returns: { key: "images", path: "/Pawkit/_Images", ... }
```

### Configuration File

**Location**: `lib/services/cloud-storage/folder-config.ts`

This file defines:
- `PAWKIT_FOLDERS` - All folder definitions with paths and extensions
- `getAllFolderPaths()` - Returns ordered list for creation
- `getTargetFolder()` - Routes files to correct folder

---

## PROVIDER INTERFACE

### CloudStorageProvider Interface

**Location**: `lib/services/cloud-storage/types.ts`

Every provider MUST implement this interface:

```typescript
export interface CloudStorageProvider {
  readonly id: CloudProviderId;  // "filen" | "google-drive" | "dropbox" | "onedrive"
  readonly name: string;          // Display name: "Google Drive"

  // Authentication
  authenticate(credentials: Record<string, string>): Promise<CloudAuthResult>;
  disconnect(): Promise<void>;
  checkConnection(): Promise<CloudSyncStatus>;

  // File operations
  uploadFile(content: Blob | File, filename: string, path: string): Promise<CloudUploadResult>;
  downloadFile(cloudId: string): Promise<Blob>;
  deleteFile(cloudId: string): Promise<void>;
  listFiles(path?: string): Promise<CloudFile[]>;

  // Note operations (markdown files)
  uploadNote(content: string, filename: string, path?: string): Promise<CloudUploadResult>;
}
```

### Return Types

```typescript
export interface CloudUploadResult {
  success: boolean;
  cloudId: string;    // Provider's ID for the file
  path: string;       // Full path where uploaded
  error?: string;
}

export interface CloudSyncStatus {
  connected: boolean;
  email: string | null;
  lastSyncedAt: Date | null;
}
```

---

## ADDING A NEW PROVIDER (Step-by-Step)

### Step 1: Add Provider ID

**File**: `lib/services/cloud-storage/types.ts`

```typescript
export type CloudProviderId = "filen" | "google-drive" | "dropbox" | "onedrive";
//                                                        ^^^^^^^^^ Add new ID
```

### Step 2: Create Provider Implementation

**File**: `lib/services/<provider>/<provider>-provider.ts`

Example structure (using Dropbox as example):

```typescript
// lib/services/dropbox/dropbox-provider.ts

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

export class DropboxProvider implements CloudStorageProvider {
  readonly id: CloudProviderId = "dropbox";
  readonly name = "Dropbox";

  private initialized = false;
  private folderPaths: Set<string> = new Set();

  async authenticate(credentials: Record<string, string>): Promise<CloudAuthResult> {
    // OAuth flow or API key auth
  }

  async disconnect(): Promise<void> {
    // Clear tokens, reset state
  }

  async checkConnection(): Promise<CloudSyncStatus> {
    // Check if tokens valid
  }

  async initializeFolders(): Promise<void> {
    // Create ALL folders from getAllFolderPaths()
    // CRITICAL: Must match exact structure
    const allPaths = getAllFolderPaths();
    for (const path of allPaths) {
      await this.ensureFolder(path);
    }
    this.initialized = true;
  }

  async uploadFile(content: Blob | File, filename: string, path: string): Promise<CloudUploadResult> {
    // 1. Determine correct folder (use getTargetFolder if path not specified)
    // 2. Check if file exists (update vs create)
    // 3. Upload file
    // 4. Return cloudId and path
  }

  async uploadNote(content: string, filename: string, path = "_Notes"): Promise<CloudUploadResult> {
    const name = filename.endsWith(".md") ? filename : `${filename}.md`;
    const blob = new Blob([content], { type: "text/markdown" });
    const notesPath = PAWKIT_FOLDERS.notes.path; // Always use /Pawkit/_Notes
    return this.uploadFile(new File([blob], name), name, notesPath);
  }

  async downloadFile(cloudId: string): Promise<Blob> {
    // Download by provider's file ID
  }

  async deleteFile(cloudId: string): Promise<void> {
    // Delete by provider's file ID
  }

  async listFiles(path?: string): Promise<CloudFile[]> {
    // List files in folder
  }
}

// Singleton export
export const dropboxProvider = new DropboxProvider();
```

### Step 3: Register Provider in Manager

**File**: `lib/services/cloud-storage/cloud-storage-manager.ts`

```typescript
import { dropboxProvider } from "@/lib/services/dropbox/dropbox-provider";

class CloudStorageManager {
  constructor() {
    // Register built-in providers
    this.registerProvider(filenProvider);
    this.registerProvider(gdriveProvider);
    this.registerProvider(dropboxProvider);  // Add new provider
  }
}
```

### Step 4: Add Connector State

**File**: `lib/stores/connector-store.ts`

```typescript
export interface DropboxConfig {
  email: string;
  name?: string;
}

export interface DropboxState {
  connected: boolean;
  lastSync: Date | null;
  config: DropboxConfig | null;
  status: "idle" | "connecting" | "syncing" | "error";
  errorMessage: string | null;
}

export interface ConnectorState {
  filen: FilenState;
  googleDrive: GoogleDriveState;
  dropbox: DropboxState;  // Add new state
  // ...
}

// Add actions: setDropboxConnecting, setDropboxConnected, etc.
```

### Step 5: Add UI Components

**IMPORTANT**: The PRIMARY location for connector UI is the Profile Settings modal:

**File to update (REQUIRED)**:
- `components/modals/profile-modal.tsx` - **This is the main location** where users see and manage cloud connectors. The `ConnectorsTabContent` component contains all connector cards.

**Secondary file (optional, may be deprecated)**:
- `components/settings/connectors-section.tsx` - Settings page connector card (separate from profile modal)

**NOTE**: Always add new providers to `profile-modal.tsx` first. This is where users actually connect/disconnect cloud providers.

Use existing Filen/Google Drive cards as templates. Key elements:
- Connect button (starts OAuth flow or shows credentials modal)
- Connected state showing email
- Disconnect button
- Status indicators (syncing, error, etc.)

### Step 6: Add OAuth Routes (if OAuth-based)

**Files**:
- `app/api/auth/<provider>/route.ts` - Start OAuth flow
- `app/api/auth/<provider>/callback/route.ts` - Handle OAuth callback
- `app/api/auth/<provider>/status/route.ts` - Check connection status
- `app/api/auth/<provider>/token/route.ts` - Get access token (if needed)
- `app/api/auth/<provider>/disconnect/route.ts` - Clear tokens

### Step 7: Add Deletion Support

**File**: `lib/stores/data-store.ts` (for notes)

In the `deleteCard` method, add deletion for new provider:

```typescript
// Delete from Dropbox if connected
try {
  const { dropbox } = useConnectorStore.getState();
  if (dropbox.connected) {
    const { dropboxProvider } = await import('@/lib/services/dropbox/dropbox-provider');
    const safeTitle = (cardToDelete.title || "Untitled")
      .replace(/[/\\:*?"<>|]/g, "_")
      .substring(0, 100);
    const filename = `${safeTitle}.md`;
    const files = await dropboxProvider.listFiles("/Pawkit/_Notes");
    const matchingFile = files.find(f => f.name === filename);
    if (matchingFile) {
      await dropboxProvider.deleteFile(matchingFile.cloudId);
    }
  }
} catch (error) {
  console.error(`[DataStore] Failed to delete note from Dropbox:`, error);
}
```

**File**: `lib/stores/file-store.ts` (for files)

In both `deleteFile` and `permanentlyDeleteFile` methods:

```typescript
// Delete from Dropbox if connected
if (file) {
  try {
    const { dropbox } = useConnectorStore.getState();
    if (dropbox.connected) {
      const { dropboxProvider } = await import("@/lib/services/dropbox/dropbox-provider");
      const { getTargetFolder } = await import("@/lib/services/cloud-storage/folder-config");
      const targetFolder = getTargetFolder(file.filename, file.mimeType);
      const files = await dropboxProvider.listFiles(targetFolder.path);
      const matchingFile = files.find(f => f.name === file.filename);
      if (matchingFile) {
        await dropboxProvider.deleteFile(matchingFile.cloudId);
      }
    }
  } catch (error) {
    console.error("[FileStore] Failed to delete from Dropbox:", error);
  }
}
```

### Step 8: Wire Up File Uploads (CRITICAL)

**File**: `lib/stores/file-store.ts`

The sync scheduler only handles NOTES. Files (PDFs, images, documents) must be synced on upload. Add a sync function and call it:

```typescript
/**
 * Sync a file to <Provider> in the background.
 * Uses the same folder structure as other providers for consistency.
 */
async function syncFileTo<Provider>(
  file: StoredFile,
  originalFile: File
): Promise<void> {
  const { <provider> } = useConnectorStore.getState();
  if (!<provider>.connected) return;

  try {
    const { getTargetFolder } = await import("@/lib/services/cloud-storage/folder-config");
    const targetFolder = getTargetFolder(originalFile.name, originalFile.type);
    const targetPath = targetFolder.path;

    const { <provider>Provider } = await import("@/lib/services/<provider>/<provider>-provider");
    const result = await <provider>Provider.uploadFile(originalFile, originalFile.name, targetPath);

    if (result.success) {
      console.log(`[FileStore] File synced to <Provider>: ${originalFile.name} -> ${result.path}`);
    } else {
      console.error(`[FileStore] <Provider> sync failed: ${result.error}`);
    }
  } catch (error) {
    console.error("[FileStore] <Provider> sync failed:", error);
  }
}
```

Then in `uploadFile` method, after existing syncs:

```typescript
// Also sync to <Provider> if connected
const { <provider> } = useConnectorStore.getState();
if (<provider>.connected) {
  syncFileTo<Provider>(storedFile, file);
}
```

### Step 9: Update Sync Hook

**File**: `lib/hooks/use-cloud-sync.ts`

Add the provider to the connection check:

```typescript
const <provider>Connected = useConnectorStore((state) => state.<provider>.connected);

// Check if ANY cloud provider is connected
const anyProviderConnected = filenConnected || gdriveConnected || dropboxConnected || <provider>Connected;
```

---

## IMPORTANT PATTERNS

### Silencing 409 Folder Conflict Errors

When creating folders, APIs like Dropbox and OneDrive return 409 Conflict if the folder already exists. This is EXPECTED behavior, not an error. Handle it silently:

```typescript
private async createFolderIfNotExists(accessToken: string, path: string): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/create_folder`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });

    // 409 Conflict means folder already exists - that's expected and fine
    if (response.status === 409) {
      return; // Silently ignore
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.warn(`[Provider] Unexpected folder create error for ${path}:`, data);
    }
  } catch (error) {
    console.warn(`[Provider] Network error creating folder ${path}:`, error);
  }
}
```

---

## SYNC SCHEDULER

### How Multi-Provider Sync Works

**File**: `lib/services/cloud-storage/sync-scheduler.ts`

The sync scheduler syncs to ALL connected providers:

```typescript
async syncNow(): Promise<SyncResult> {
  // Get ALL connected providers
  const connectedProviders = await this.getConnectedProviders();

  // Get dirty items (notes with localUpdatedAt > cloudSyncedAt)
  const dirtyItems = await this.getDirtyItems();

  // Sync EACH item to EACH provider
  for (const item of dirtyItems) {
    for (const provider of connectedProviders) {
      if (item.type === "note" && item.content) {
        await provider.uploadNote(item.content, item.filename, "/Pawkit/_Notes");
      } else if (item.blob) {
        await provider.uploadFile(item.blob, item.filename, "/Pawkit/_Library");
      }
    }
  }
}
```

### CRITICAL: Path Format

**Filen requires full paths starting with `/Pawkit`:**

```typescript
// CORRECT
await provider.uploadNote(content, filename, "/Pawkit/_Notes");

// WRONG (breaks Filen sync)
await provider.uploadNote(content, filename, "_Notes");
```

---

## PROVIDER-SPECIFIC NOTES

### Filen

**Auth**: Email/password (2FA supported)
**Session**: HTTP-only cookie (`filen-session`)
**Folder UUIDs**: Stored in `connector-store` (localStorage)

Key files:
- `lib/services/filen-service.ts` - Main service
- `lib/services/filen-server.ts` - Server-side operations
- `lib/services/filen-direct.ts` - Direct API calls
- `lib/services/cloud-storage/filen-provider.ts` - CloudStorageProvider wrapper

### Google Drive

**Auth**: OAuth 2.0 flow
**Session**: HTTP-only cookie (`gdrive-token`)
**Folder IDs**: Cached in provider instance (memory)

Key files:
- `lib/services/google-drive/gdrive-provider.ts` - Provider implementation
- `lib/services/google-drive/oauth.ts` - OAuth utilities
- `app/api/auth/gdrive/*` - OAuth API routes

OAuth setup:
1. Get credentials from Google Cloud Console
2. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env.local`
3. Configure redirect URIs in Google Console

### Dropbox

**Auth**: OAuth 2.0 flow
**Session**: HTTP-only cookie (`dropbox_tokens`)
**Token Refresh**: Access tokens expire in 4 hours, auto-refreshed

Key files:
- `lib/services/dropbox/dropbox-provider.ts` - Provider implementation
- `lib/services/dropbox/oauth.ts` - OAuth utilities
- `app/api/auth/dropbox/*` - OAuth API routes

OAuth setup:
1. Create app at https://www.dropbox.com/developers/apps
2. Choose "Scoped access" → "Full Dropbox"
3. Add `DROPBOX_CLIENT_ID` and `DROPBOX_CLIENT_SECRET` to `.env.local`
4. Add redirect URI: `https://your-domain.com/api/auth/dropbox/callback`

Dropbox API quirks:
- Uses `Dropbox-API-Arg` header for upload/download metadata (JSON)
- Upload endpoint: `https://content.dropboxapi.com/2/files/upload`
- API endpoint: `https://api.dropboxapi.com/2`
- Folder creation returns 409 Conflict if folder exists - silently ignore (see IMPORTANT PATTERNS)
- Delete requires file path, not file ID (get metadata first)

### OneDrive

**Auth**: OAuth 2.0 flow (Microsoft Identity Platform)
**Session**: HTTP-only cookie (`onedrive_tokens`)
**Token Refresh**: Access tokens expire in 1 hour, auto-refreshed

Key files:
- `lib/services/onedrive/onedrive-provider.ts` - Provider implementation
- `lib/services/onedrive/oauth.ts` - OAuth utilities
- `app/api/auth/onedrive/*` - OAuth API routes

OAuth setup:
1. Register app at https://portal.azure.com → App registrations
2. Add `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` to `.env.local`
3. Add redirect URI: `https://your-domain.com/api/auth/onedrive/callback`
4. Required scopes: `Files.ReadWrite`, `User.Read`, `offline_access`

OneDrive API quirks:
- Uses Microsoft Graph API: `https://graph.microsoft.com/v1.0`
- Folder creation: PUT `/me/drive/root:/path:/children` with `{ "name": "folder", "folder": {} }`
- Upload small files (<4MB): PUT `/me/drive/root:/path/file.ext:/content`
- Upload large files: Use upload session
- 409 Conflict on folder create means folder exists - silently ignore
- Item IDs are stable, can be used for delete/download

---

## COMMON ISSUES

### 1. Files Not Syncing to Provider

**Symptoms**: Files sync to one provider but not another
**Cause**: Provider not returning from `getConnectedProviders()`
**Fix**: Check `checkConnection()` returns `{ connected: true }`

### 2. Folder Structure Mismatch

**Symptoms**: Files appear in wrong folders or root
**Cause**: Provider not using `folder-config.ts`
**Fix**: Use `getTargetFolder()` and `getAllFolderPaths()`

### 3. URL Encoding Errors (400 Bad Request)

**Symptoms**: Google Drive API returns 400 for filenames with special chars
**Cause**: Query not URL-encoded
**Fix**:
```typescript
const query = `name='${escapedFilename}' and '${parentId}' in parents`;
const url = `${API_BASE}/files?q=${encodeURIComponent(query)}`;
```

### 4. Filen Sync Broken After Changes

**Symptoms**: Notes stop syncing to Filen
**Cause**: Path changed from `/Pawkit/_Notes` to `_Notes`
**Fix**: Always use full paths starting with `/Pawkit`

### 5. Deletion Not Working

**Symptoms**: Deleted files still exist in cloud
**Cause**: Deletion code not added for provider
**Fix**: Add deletion code in `data-store.ts` and `file-store.ts`

---

## TESTING CHECKLIST

Before deploying a new provider:

- [ ] `authenticate()` works and stores credentials securely
- [ ] `disconnect()` clears all tokens/state
- [ ] `checkConnection()` accurately reports status
- [ ] `initializeFolders()` creates ALL folders from `getAllFolderPaths()`
- [ ] `uploadFile()` routes to correct folder by extension/MIME
- [ ] `uploadNote()` uploads to `/Pawkit/_Notes`
- [ ] `downloadFile()` returns correct blob
- [ ] `deleteFile()` removes file from cloud
- [ ] `listFiles()` returns files in correct format
- [ ] Files sync to provider on note save
- [ ] Files delete from provider on card delete
- [ ] UI shows connected state correctly
- [ ] UI shows sync status/errors
- [ ] Multiple notes can sync (no duplicates)
- [ ] Provider works alongside other providers

---

## ENVIRONMENT VARIABLES

### Required for Each Provider

**Filen**: No env vars (credentials entered by user)

**Google Drive**:
```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
```

**Dropbox**:
```env
DROPBOX_CLIENT_ID=xxx
DROPBOX_CLIENT_SECRET=xxx
```

**OneDrive**:
```env
MICROSOFT_CLIENT_ID=xxx
MICROSOFT_CLIENT_SECRET=xxx
```

---

## FILE REFERENCE

| File | Purpose |
|------|---------|
| `lib/services/cloud-storage/types.ts` | Provider interface, types |
| `lib/services/cloud-storage/folder-config.ts` | Folder structure, routing |
| `lib/services/cloud-storage/cloud-storage-manager.ts` | Provider registry |
| `lib/services/cloud-storage/sync-scheduler.ts` | Background sync |
| `lib/stores/connector-store.ts` | Provider UI state |
| `lib/hooks/use-cloud-sync.ts` | React hook for sync |
| `lib/stores/data-store.ts` | Note deletion integration |
| `lib/stores/file-store.ts` | File deletion integration |
| `components/modals/profile-modal.tsx` | **PRIMARY** - Profile modal connector UI (add providers here!) |
| `components/settings/connectors-section.tsx` | Secondary settings UI (may be deprecated) |

---

**Last Updated**: December 1, 2025
**Reason**: OneDrive implementation complete, all 4 cloud providers now functional

