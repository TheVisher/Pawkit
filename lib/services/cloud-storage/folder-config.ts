/**
 * Pawkit Cloud Folder Configuration
 *
 * Defines the folder structure used across all cloud storage providers.
 * This creates a 1:1 mapping between Pawkit sidebar filters and cloud folders.
 */

export type PawkitFolderKey =
  | "bookmarks"
  | "bookmarksJson"
  | "bookmarksHtml"
  | "notes"
  | "images"
  | "audio"
  | "videos"
  | "documents"
  | "other";

export interface PawkitFolder {
  key: PawkitFolderKey;
  path: string;
  description: string;
  // File extensions that belong in this folder (for routing uploads)
  extensions?: string[];
  // Whether this folder should store its UUID in session (for direct uploads)
  storeUuid: boolean;
}

/**
 * Root Pawkit folders - these map 1:1 with sidebar content types
 */
export const PAWKIT_FOLDERS: Record<PawkitFolderKey, PawkitFolder> = {
  // Bookmarks - special case with subfolders for JSON and HTML
  bookmarks: {
    key: "bookmarks",
    path: "/Pawkit/_Bookmarks",
    description: "URL bookmarks backup",
    storeUuid: false, // Parent folder, don't need UUID
  },
  bookmarksJson: {
    key: "bookmarksJson",
    path: "/Pawkit/_Bookmarks/_json",
    description: "Pawkit bookmark data (JSON)",
    storeUuid: false, // Not stored in session - bookmark sync not yet implemented
  },
  bookmarksHtml: {
    key: "bookmarksHtml",
    path: "/Pawkit/_Bookmarks/_html",
    description: "Browser-compatible bookmarks (HTML)",
    storeUuid: false, // Not stored in session - bookmark sync not yet implemented
  },

  // Notes - markdown and text files
  notes: {
    key: "notes",
    path: "/Pawkit/_Notes",
    description: "Markdown and text notes",
    extensions: ["md", "txt", "markdown"],
    storeUuid: true,
  },

  // Images
  images: {
    key: "images",
    path: "/Pawkit/_Images",
    description: "Image files",
    extensions: [
      "jpg", "jpeg", "jfif", "png", "gif", "webp", "svg", "ico", "bmp",
      "tiff", "tif", "heic", "heif", "avif", "raw"
    ],
    storeUuid: true,
  },

  // Audio
  audio: {
    key: "audio",
    path: "/Pawkit/_Audio",
    description: "Audio files",
    extensions: [
      "mp3", "wav", "m4a", "flac", "ogg", "aac", "wma",
      "aiff", "alac", "opus"
    ],
    storeUuid: true,
  },

  // Videos
  videos: {
    key: "videos",
    path: "/Pawkit/_Videos",
    description: "Video files",
    extensions: [
      "mp4", "mov", "avi", "mkv", "wmv", "flv", "webm",
      "m4v", "mpeg", "mpg", "3gp"
    ],
    storeUuid: true,
  },

  // Documents (includes PDF)
  documents: {
    key: "documents",
    path: "/Pawkit/_Documents",
    description: "Documents, PDFs, spreadsheets",
    extensions: [
      // PDF
      "pdf",
      // Microsoft Office
      "doc", "docx", "xls", "xlsx", "ppt", "pptx",
      // OpenDocument
      "odt", "ods", "odp",
      // Apple iWork
      "pages", "numbers", "keynote",
      // Other
      "rtf", "csv"
    ],
    storeUuid: true,
  },

  // Other - everything else
  other: {
    key: "other",
    path: "/Pawkit/_Other",
    description: "Other files",
    // No extensions list - this is the catch-all
    storeUuid: true,
  },
};

/**
 * Get all folders that need to be created (in order)
 */
export function getAllFolderPaths(): string[] {
  return [
    "/Pawkit",
    PAWKIT_FOLDERS.bookmarks.path,
    PAWKIT_FOLDERS.bookmarksJson.path,
    PAWKIT_FOLDERS.bookmarksHtml.path,
    PAWKIT_FOLDERS.notes.path,
    PAWKIT_FOLDERS.images.path,
    PAWKIT_FOLDERS.audio.path,
    PAWKIT_FOLDERS.videos.path,
    PAWKIT_FOLDERS.documents.path,
    PAWKIT_FOLDERS.other.path,
  ];
}

/**
 * Get folders that need their UUIDs stored in session
 */
export function getFoldersWithUuids(): PawkitFolder[] {
  return Object.values(PAWKIT_FOLDERS).filter((f) => f.storeUuid);
}

/**
 * Get the folder key for a given file extension
 */
export function getFolderKeyForExtension(extension: string): PawkitFolderKey {
  const ext = extension.toLowerCase().replace(/^\./, "");

  for (const folder of Object.values(PAWKIT_FOLDERS)) {
    if (folder.extensions?.includes(ext)) {
      return folder.key;
    }
  }

  return "other";
}

/**
 * Get the folder key for a given MIME type
 */
export function getFolderKeyForMimeType(mimeType: string): PawkitFolderKey {
  const mime = mimeType.toLowerCase();

  if (mime.startsWith("image/")) return "images";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "videos";
  if (mime.startsWith("text/markdown")) return "notes";
  if (mime === "text/plain") return "notes";
  if (mime === "application/pdf") return "documents";
  if (mime.includes("spreadsheet") || mime.includes("excel")) return "documents";
  if (mime.includes("document") || mime.includes("word")) return "documents";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "documents";

  return "other";
}

/**
 * Get the target folder for a file (by extension or mime type)
 */
export function getTargetFolder(filename: string, mimeType?: string): PawkitFolder {
  // Try extension first
  const ext = filename.split(".").pop() || "";
  const keyByExt = getFolderKeyForExtension(ext);

  if (keyByExt !== "other") {
    return PAWKIT_FOLDERS[keyByExt];
  }

  // Fall back to MIME type
  if (mimeType) {
    const keyByMime = getFolderKeyForMimeType(mimeType);
    return PAWKIT_FOLDERS[keyByMime];
  }

  return PAWKIT_FOLDERS.other;
}
