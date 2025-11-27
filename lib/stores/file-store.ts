import { create } from "zustand";
import { StoredFile, FileCategory, FileSyncStatus } from "@/lib/types";
import { localDb } from "@/lib/services/local-storage";
import { useToastStore } from "@/lib/stores/toast-store";
import { useDataStore } from "@/lib/stores/data-store";
import { useConnectorStore } from "@/lib/stores/connector-store";
import { filenService, FilenFileInfo } from "@/lib/services/filen-service";
import {
  generateFileId,
  getFileCategory,
  generateThumbnail,
  isFileSizeValid,
  wouldExceedStorageLimit,
  MAX_FILE_SIZE,
  formatFileSize,
  STORAGE_SOFT_LIMIT,
} from "@/lib/utils/file-utils";

interface FileStoreState {
  // State
  files: StoredFile[];
  isLoading: boolean;
  isLoaded: boolean;
  totalSize: number;
  isSyncing: boolean;

  // Actions
  loadFiles: (userId?: string) => Promise<void>;
  uploadFile: (
    file: File,
    userId: string,
    cardId?: string
  ) => Promise<StoredFile | null>;
  uploadFiles: (
    files: File[],
    userId: string,
    cardId?: string
  ) => Promise<StoredFile[]>;
  deleteFile: (fileId: string) => Promise<void>;
  permanentlyDeleteFile: (fileId: string) => Promise<void>;
  getFilesByCardId: (cardId: string) => StoredFile[];
  getStandaloneFiles: () => StoredFile[];
  getFilesByCategory: (category: FileCategory) => StoredFile[];
  attachFileToCard: (fileId: string, cardId: string) => Promise<void>;
  detachFileFromCard: (fileId: string) => Promise<void>;
  getFileUrl: (fileId: string) => string | null;
  refreshTotalSize: (userId?: string) => Promise<void>;

  // Filen sync actions
  syncFromFilen: () => Promise<void>;
  downloadFromFilen: (fileId: string) => Promise<void>;
  updateFileSyncStatus: (fileId: string, status: FileSyncStatus, filenData?: { uuid?: string; path?: string }) => Promise<void>;
}

// Cache for blob URLs to avoid memory leaks
const blobUrlCache = new Map<string, string>();

/**
 * Get the pawkit name for a card based on its first collection
 */
function getPawkitNameForCard(cardId: string): string | null {
  const dataStore = useDataStore.getState();
  const card = dataStore.cards.find((c) => c.id === cardId);

  if (!card?.collections?.length) {
    return null;
  }

  // Use first collection
  const collectionSlug = card.collections[0];
  const collection = dataStore.collections.find(
    (c) => c.slug === collectionSlug || c.id === collectionSlug
  );

  return collection?.name || null;
}

/**
 * Sync a file to Filen in the background
 */
async function syncFileToFilen(
  file: StoredFile,
  originalFile: File,
  updateStatus: (status: FileSyncStatus, filenData?: { uuid?: string; path?: string }) => void
): Promise<void> {
  const { filen } = useConnectorStore.getState();
  if (!filen.connected) return;

  updateStatus("uploading");

  try {
    // Determine destination folder
    let pawkitName: string | null = null;
    const isAttachment = !!file.cardId;

    if (!isAttachment) {
      // For standalone files, find the associated card to get its pawkit
      const dataStore = useDataStore.getState();
      const fileCard = dataStore.cards.find(
        (c) => c.isFileCard && c.fileId === file.id
      );
      if (fileCard?.collections?.length) {
        const collection = dataStore.collections.find(
          (c) => c.slug === fileCard.collections[0] || c.id === fileCard.collections[0]
        );
        pawkitName = collection?.name || null;
      }
    }

    const result = await filenService.uploadFile(originalFile, {
      fileId: file.id,
      pawkit: pawkitName,
      isAttachment,
    });

    updateStatus("synced", { uuid: result.filenUuid, path: result.path });
  } catch (error) {
    console.error("[FileStore] Filen sync failed:", error);
    updateStatus("error");
  }
}

export const useFileStore = create<FileStoreState>((set, get) => ({
  files: [],
  isLoading: false,
  isLoaded: false,
  totalSize: 0,
  isSyncing: false,

  loadFiles: async (_userId?: string) => {
    if (get().isLoading) return;

    set({ isLoading: true });

    try {
      const files = await localDb.getAllFiles();
      const totalSize = await localDb.getTotalFileSize();

      // Ensure all files have syncStatus (migration for existing files)
      const migratedFiles = files
        .filter((f) => !f.deleted)
        .map((f) => ({
          ...f,
          syncStatus: f.syncStatus || "local" as FileSyncStatus,
        }));

      set({
        files: migratedFiles,
        totalSize,
        isLoading: false,
        isLoaded: true,
      });
    } catch (error) {
      console.error("[FileStore] Error loading files:", error);
      set({ isLoading: false, isLoaded: true });
    }
  },

  uploadFile: async (file: File, userId: string, cardId?: string) => {
    const { totalSize } = get();

    if (!isFileSizeValid(file.size)) {
      useToastStore
        .getState()
        .error(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`);
      return null;
    }

    if (wouldExceedStorageLimit(totalSize, file.size)) {
      useToastStore
        .getState()
        .warning(`Storage limit reached (${formatFileSize(STORAGE_SOFT_LIMIT)}). Delete some files to continue.`);
      return null;
    }

    try {
      const thumbnailBlob = await generateThumbnail(file);
      const { filen } = useConnectorStore.getState();

      const storedFile: StoredFile = {
        id: generateFileId(),
        userId,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        category: getFileCategory(file.type),
        blob: file,
        thumbnailBlob: thumbnailBlob || undefined,
        cardId,
        syncStatus: filen.connected ? "uploading" : "local",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await localDb.saveFile(storedFile);

      set((state) => ({
        files: [...state.files, storedFile],
        totalSize: state.totalSize + file.size,
      }));

      // If standalone file, create a file card
      if (!cardId) {
        let thumbnailUrl: string | undefined;
        if (thumbnailBlob) {
          thumbnailUrl = URL.createObjectURL(thumbnailBlob);
        }

        const cleanTitle = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[_-]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        await useDataStore.getState().addCard({
          title: cleanTitle || file.name,
          type: "file",
          url: `file://${storedFile.id}`,
          isFileCard: true,
          fileId: storedFile.id,
          image: thumbnailUrl || null,
          status: "READY",
          metadata: {
            fileCategory: storedFile.category,
            mimeType: storedFile.mimeType,
            fileSize: storedFile.size,
          },
        });
      }

      // Sync to Filen in background if connected
      if (filen.connected) {
        syncFileToFilen(
          storedFile,
          file,
          (status, filenData) => {
            get().updateFileSyncStatus(storedFile.id, status, filenData);
          }
        );
      }

      return storedFile;
    } catch (error) {
      console.error("[FileStore] Error uploading file:", error);
      useToastStore.getState().error(`Failed to upload ${file.name}`);
      return null;
    }
  },

  uploadFiles: async (files: File[], userId: string, cardId?: string) => {
    const uploadedFiles: StoredFile[] = [];

    for (const file of files) {
      const uploaded = await get().uploadFile(file, userId, cardId);
      if (uploaded) {
        uploadedFiles.push(uploaded);
      }
    }

    if (uploadedFiles.length > 0) {
      useToastStore.getState().success(`Uploaded ${uploadedFiles.length} file(s)`);
    }

    return uploadedFiles;
  },

  deleteFile: async (fileId: string) => {
    try {
      const file = get().files.find((f) => f.id === fileId);

      // Also delete from Filen if synced
      if (file?.filenUuid) {
        try {
          await filenService.deleteFile(file.filenUuid);
        } catch (error) {
          console.error("[FileStore] Failed to delete from Filen:", error);
          // Continue with local deletion anyway
        }
      }

      await localDb.deleteFile(fileId);

      if (blobUrlCache.has(fileId)) {
        URL.revokeObjectURL(blobUrlCache.get(fileId)!);
        blobUrlCache.delete(fileId);
      }

      set((state) => ({
        files: state.files.filter((f) => f.id !== fileId),
        totalSize: file ? state.totalSize - file.size : state.totalSize,
      }));
    } catch (error) {
      console.error("[FileStore] Error deleting file:", error);
      useToastStore.getState().error("Failed to delete file");
    }
  },

  permanentlyDeleteFile: async (fileId: string) => {
    try {
      const file = get().files.find((f) => f.id === fileId);

      // Also delete from Filen if synced
      if (file?.filenUuid) {
        try {
          await filenService.deleteFile(file.filenUuid);
        } catch (error) {
          console.error("[FileStore] Failed to delete from Filen:", error);
        }
      }

      await localDb.permanentlyDeleteFile(fileId);

      if (blobUrlCache.has(fileId)) {
        URL.revokeObjectURL(blobUrlCache.get(fileId)!);
        blobUrlCache.delete(fileId);
      }

      set((state) => ({
        files: state.files.filter((f) => f.id !== fileId),
        totalSize: file ? state.totalSize - file.size : state.totalSize,
      }));
    } catch (error) {
      console.error("[FileStore] Error permanently deleting file:", error);
      useToastStore.getState().error("Failed to delete file");
    }
  },

  getFilesByCardId: (cardId: string) => {
    return get().files.filter((f) => f.cardId === cardId && !f.deleted);
  },

  getStandaloneFiles: () => {
    return get().files.filter((f) => !f.cardId && !f.deleted);
  },

  getFilesByCategory: (category: FileCategory) => {
    return get().files.filter((f) => f.category === category && !f.deleted);
  },

  attachFileToCard: async (fileId: string, cardId: string) => {
    try {
      const file = get().files.find((f) => f.id === fileId);
      if (!file) {
        throw new Error("File not found");
      }

      const updatedFile: StoredFile = {
        ...file,
        cardId,
        updatedAt: new Date().toISOString(),
      };

      await localDb.saveFile(updatedFile);

      set((state) => ({
        files: state.files.map((f) => (f.id === fileId ? updatedFile : f)),
      }));
    } catch (error) {
      console.error("[FileStore] Error attaching file to card:", error);
      useToastStore.getState().error("Failed to attach file");
    }
  },

  detachFileFromCard: async (fileId: string) => {
    try {
      const file = get().files.find((f) => f.id === fileId);
      if (!file) {
        throw new Error("File not found");
      }

      const updatedFile: StoredFile = {
        ...file,
        cardId: undefined,
        updatedAt: new Date().toISOString(),
      };

      await localDb.saveFile(updatedFile);

      set((state) => ({
        files: state.files.map((f) => (f.id === fileId ? updatedFile : f)),
      }));
    } catch (error) {
      console.error("[FileStore] Error detaching file from card:", error);
      useToastStore.getState().error("Failed to detach file");
    }
  },

  getFileUrl: (fileId: string) => {
    if (blobUrlCache.has(fileId)) {
      return blobUrlCache.get(fileId)!;
    }

    const file = get().files.find((f) => f.id === fileId);
    if (!file?.blob) {
      return null;
    }

    const url = URL.createObjectURL(file.blob);
    blobUrlCache.set(fileId, url);

    return url;
  },

  refreshTotalSize: async (_userId?: string) => {
    try {
      const totalSize = await localDb.getTotalFileSize();
      set({ totalSize });
    } catch (error) {
      console.error("[FileStore] Error refreshing total size:", error);
    }
  },

  // ============================================
  // Filen Sync Actions
  // ============================================

  /**
   * Sync files from Filen - fetches remote files and creates ghost entries
   */
  syncFromFilen: async () => {
    const { filen } = useConnectorStore.getState();
    if (!filen.connected) return;

    if (get().isSyncing) return;
    set({ isSyncing: true });

    try {
      const remoteFiles = await filenService.listFiles();
      const localFiles = get().files;

      // Find files that exist in Filen but not locally
      const newGhostFiles: StoredFile[] = [];

      for (const remote of remoteFiles) {
        const existsLocally = localFiles.some(
          (f) => f.filenUuid === remote.uuid
        );

        if (!existsLocally) {
          // Create ghost file entry (cloud-only, no blob)
          const ghostFile: StoredFile = {
            id: `ghost-${remote.uuid}`,
            userId: "", // Will be set when downloaded
            filename: remote.name,
            mimeType: remote.mime,
            size: remote.size,
            category: getFileCategory(remote.mime),
            blob: null, // Not downloaded yet
            filenUuid: remote.uuid,
            filenPath: remote.path,
            syncStatus: "cloud-only",
            createdAt: new Date(remote.modified).toISOString(),
            updatedAt: new Date(remote.modified).toISOString(),
          };

          // Save to IndexedDB
          await localDb.saveFile(ghostFile);
          newGhostFiles.push(ghostFile);
        }
      }

      if (newGhostFiles.length > 0) {
        set((state) => ({
          files: [...state.files, ...newGhostFiles],
        }));

        // Create file cards for ghost files
        for (const ghost of newGhostFiles) {
          const cleanTitle = ghost.filename
            .replace(/\.[^/.]+$/, "")
            .replace(/[_-]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          await useDataStore.getState().addCard({
            title: cleanTitle || ghost.filename,
            type: "file",
            url: `file://${ghost.id}`,
            isFileCard: true,
            fileId: ghost.id,
            image: null,
            status: "READY",
            metadata: {
              fileCategory: ghost.category,
              mimeType: ghost.mimeType,
              fileSize: ghost.size,
              isGhostFile: true,
            },
          });
        }

        useToastStore.getState().info(`Found ${newGhostFiles.length} file(s) in Filen cloud`);
      }

      // Update connector last sync time
      useConnectorStore.getState().setFilenSynced();
    } catch (error) {
      console.error("[FileStore] Filen sync failed:", error);
      useToastStore.getState().error("Failed to sync with Filen");
    } finally {
      set({ isSyncing: false });
    }
  },

  /**
   * Download a ghost file from Filen
   */
  downloadFromFilen: async (fileId: string) => {
    const file = get().files.find((f) => f.id === fileId);
    if (!file?.filenUuid) {
      console.error("[FileStore] No Filen UUID for file:", fileId);
      return;
    }

    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId ? { ...f, syncStatus: "downloading" as FileSyncStatus } : f
      ),
    }));

    try {
      const blob = await filenService.downloadFile(file.filenUuid);

      // Generate thumbnail if applicable
      const thumbnailBlob = await generateThumbnail(
        new File([blob], file.filename, { type: file.mimeType })
      );

      const updatedFile: StoredFile = {
        ...file,
        blob,
        thumbnailBlob: thumbnailBlob || undefined,
        syncStatus: "synced",
        lastSyncedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await localDb.saveFile(updatedFile);

      set((state) => ({
        files: state.files.map((f) => (f.id === fileId ? updatedFile : f)),
        totalSize: state.totalSize + blob.size,
      }));

      // Update file card with thumbnail if available
      if (thumbnailBlob) {
        const thumbnailUrl = URL.createObjectURL(thumbnailBlob);
        const fileCard = useDataStore.getState().cards.find(
          (c) => c.isFileCard && c.fileId === fileId
        );
        if (fileCard) {
          await useDataStore.getState().updateCard(fileCard.id, {
            image: thumbnailUrl,
            metadata: {
              ...fileCard.metadata,
              isGhostFile: false,
            },
          });
        }
      }

      useToastStore.getState().success(`Downloaded ${file.filename}`);
    } catch (error) {
      console.error("[FileStore] Download from Filen failed:", error);

      set((state) => ({
        files: state.files.map((f) =>
          f.id === fileId ? { ...f, syncStatus: "error" as FileSyncStatus } : f
        ),
      }));

      useToastStore.getState().error(`Failed to download ${file.filename}`);
    }
  },

  /**
   * Update the sync status of a file
   */
  updateFileSyncStatus: async (
    fileId: string,
    status: FileSyncStatus,
    filenData?: { uuid?: string; path?: string }
  ) => {
    const file = get().files.find((f) => f.id === fileId);
    if (!file) return;

    const updatedFile: StoredFile = {
      ...file,
      syncStatus: status,
      ...(filenData?.uuid && { filenUuid: filenData.uuid }),
      ...(filenData?.path && { filenPath: filenData.path }),
      ...(status === "synced" && { lastSyncedAt: new Date().toISOString() }),
      updatedAt: new Date().toISOString(),
    };

    await localDb.saveFile(updatedFile);

    set((state) => ({
      files: state.files.map((f) => (f.id === fileId ? updatedFile : f)),
    }));
  },
}));

// Cleanup blob URLs when the page unloads
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    blobUrlCache.forEach((url) => URL.revokeObjectURL(url));
    blobUrlCache.clear();
  });
}
