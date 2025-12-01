---
name: pawkit-cloud-providers
description: Guide for implementing cloud storage providers (Filen, Google Drive, Dropbox, OneDrive)
---

# Pawkit Cloud Storage Providers Guide

**Purpose**: Complete guide for implementing and maintaining cloud storage providers for backup/sync.

**Current Providers**: Filen (complete), Google Drive (complete)
**Planned Providers**: Dropbox, OneDrive

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

**Files to update**:
- `components/settings/connectors-section.tsx` - Settings page connector card
- `components/modals/profile-modal.tsx` - Profile modal connector section (if different from above)

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

### Step 8: Update Sync Hook (Optional)

**File**: `lib/hooks/use-cloud-sync.ts`

If the provider should participate in automatic sync:

```typescript
// Check if ANY cloud provider is connected
const isCloudConnected =
  filenConnected ||
  gdriveConnected ||
  dropboxConnected;  // Add new check
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

**Dropbox** (future):
```env
DROPBOX_APP_KEY=xxx
DROPBOX_APP_SECRET=xxx
```

**OneDrive** (future):
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
| `components/settings/connectors-section.tsx` | Settings UI |
| `components/modals/profile-modal.tsx` | Profile modal UI |

---

**Last Updated**: November 30, 2025
**Reason**: Initial creation documenting Filen and Google Drive implementations

