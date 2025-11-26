import { create } from "zustand";
import { StoredFile, FileCategory } from "@/lib/types";
import { localDb } from "@/lib/services/local-storage";
import { useToastStore } from "@/lib/stores/toast-store";
import { useDataStore } from "@/lib/stores/data-store";
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
  isLoaded: boolean; // Has loadFiles been called at least once?
  totalSize: number;

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
}

// Cache for blob URLs to avoid memory leaks
const blobUrlCache = new Map<string, string>();

export const useFileStore = create<FileStoreState>((set, get) => ({
  files: [],
  isLoading: false,
  isLoaded: false,
  totalSize: 0,

  loadFiles: async (_userId?: string) => {
    // Prevent duplicate loads
    if (get().isLoading) return;

    set({ isLoading: true });

    try {
      const files = await localDb.getAllFiles();
      const totalSize = await localDb.getTotalFileSize();

      set({
        files: files.filter((f) => !f.deleted),
        totalSize,
        isLoading: false,
        isLoaded: true,
      });
    } catch (error) {
      console.error("[FileStore] Error loading files:", error);
      set({ isLoading: false, isLoaded: true }); // Mark as loaded even on error
    }
  },

  uploadFile: async (file: File, userId: string, cardId?: string) => {
    const { totalSize } = get();

    // Validate file size
    if (!isFileSizeValid(file.size)) {
      useToastStore
        .getState()
        .error(
          `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`
        );
      return null;
    }

    // Check storage limit
    if (wouldExceedStorageLimit(totalSize, file.size)) {
      useToastStore
        .getState()
        .warning(
          `Storage limit reached (${formatFileSize(STORAGE_SOFT_LIMIT)}). Delete some files to continue.`
        );
      return null;
    }

    try {
      // Generate thumbnail for images
      const thumbnailBlob = await generateThumbnail(file);

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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await localDb.saveFile(storedFile);

      set((state) => ({
        files: [...state.files, storedFile],
        totalSize: state.totalSize + file.size,
      }));

      // If standalone file (not attached to existing card), create a file card
      if (!cardId) {
        // Generate thumbnail URL for image if available
        let thumbnailUrl: string | undefined;
        if (thumbnailBlob) {
          thumbnailUrl = URL.createObjectURL(thumbnailBlob);
        }

        // Create a card for this file
        await useDataStore.getState().addCard({
          title: file.name,
          type: "file",
          url: `file://${storedFile.id}`, // Use file:// URL scheme
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
      useToastStore
        .getState()
        .success(`Uploaded ${uploadedFiles.length} file(s)`);
    }

    return uploadedFiles;
  },

  deleteFile: async (fileId: string) => {
    try {
      await localDb.deleteFile(fileId);

      // Revoke blob URL if cached
      if (blobUrlCache.has(fileId)) {
        URL.revokeObjectURL(blobUrlCache.get(fileId)!);
        blobUrlCache.delete(fileId);
      }

      set((state) => {
        const file = state.files.find((f) => f.id === fileId);
        return {
          files: state.files.filter((f) => f.id !== fileId),
          totalSize: file ? state.totalSize - file.size : state.totalSize,
        };
      });
    } catch (error) {
      console.error("[FileStore] Error deleting file:", error);
      useToastStore.getState().error("Failed to delete file");
    }
  },

  permanentlyDeleteFile: async (fileId: string) => {
    try {
      await localDb.permanentlyDeleteFile(fileId);

      // Revoke blob URL if cached
      if (blobUrlCache.has(fileId)) {
        URL.revokeObjectURL(blobUrlCache.get(fileId)!);
        blobUrlCache.delete(fileId);
      }

      set((state) => {
        const file = state.files.find((f) => f.id === fileId);
        return {
          files: state.files.filter((f) => f.id !== fileId),
          totalSize: file ? state.totalSize - file.size : state.totalSize,
        };
      });
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
    // Check cache first
    if (blobUrlCache.has(fileId)) {
      return blobUrlCache.get(fileId)!;
    }

    const file = get().files.find((f) => f.id === fileId);
    if (!file?.blob) {
      return null;
    }

    // Create and cache the URL
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
}));

// Cleanup blob URLs when the page unloads
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    blobUrlCache.forEach((url) => URL.revokeObjectURL(url));
    blobUrlCache.clear();
  });
}
