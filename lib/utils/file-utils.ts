import { FileCategory } from "@/lib/types";
import {
  File,
  FileImage,
  FileText,
  FileAudio,
  FileVideo,
  FileIcon,
  LucideIcon,
} from "lucide-react";

// MIME type to category mapping (matches cloud folder structure)
const FILE_CATEGORIES: Record<string, FileCategory> = {
  // Images
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/svg+xml": "image",
  "image/bmp": "image",
  "image/tiff": "image",
  "image/heic": "image",
  "image/heif": "image",
  "image/avif": "image",

  // Documents (includes PDF, word processors, spreadsheets, presentations)
  "application/pdf": "document",
  "application/msword": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
  "application/rtf": "document",
  "text/plain": "document",
  "text/markdown": "document",
  "application/vnd.oasis.opendocument.text": "document",
  "application/vnd.ms-excel": "document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "document",
  "text/csv": "document",
  "application/vnd.oasis.opendocument.spreadsheet": "document",
  "application/vnd.ms-powerpoint": "document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "document",
  "application/vnd.oasis.opendocument.presentation": "document",

  // Audio
  "audio/mpeg": "audio",
  "audio/mp3": "audio",
  "audio/wav": "audio",
  "audio/ogg": "audio",
  "audio/aac": "audio",
  "audio/flac": "audio",
  "audio/m4a": "audio",
  "audio/webm": "audio",
  "audio/x-m4a": "audio",
  "audio/x-aiff": "audio",
  "audio/opus": "audio",

  // Video
  "video/mp4": "video",
  "video/webm": "video",
  "video/ogg": "video",
  "video/quicktime": "video",
  "video/x-msvideo": "video",
  "video/x-matroska": "video",
  "video/3gpp": "video",
  "video/x-flv": "video",
  "video/x-ms-wmv": "video",
};

// Category to icon mapping (matches cloud folder structure)
const CATEGORY_ICONS: Record<FileCategory, LucideIcon> = {
  image: FileImage,
  document: FileText,
  audio: FileAudio,
  video: FileVideo,
  other: File,
};

// Maximum file size (50MB)
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Soft storage limit (800MB)
export const STORAGE_SOFT_LIMIT = 800 * 1024 * 1024;

// Thumbnail settings - larger size for crisp display in grid view
const THUMBNAIL_MAX_SIZE = 800;
const THUMBNAIL_QUALITY = 0.85;

/**
 * Get the category for a given MIME type
 */
export function getFileCategory(mimeType: string): FileCategory {
  // Check exact match first
  if (FILE_CATEGORIES[mimeType]) {
    return FILE_CATEGORIES[mimeType];
  }

  // Check by prefix for broader matching
  const prefix = mimeType.split("/")[0];
  switch (prefix) {
    case "image":
      return "image";
    case "audio":
      return "audio";
    case "video":
      return "video";
    case "text":
      return "document";
    default:
      return "other";
  }
}

/**
 * Get the appropriate icon for a file based on its MIME type
 */
export function getFileIcon(mimeType: string): LucideIcon {
  const category = getFileCategory(mimeType);
  return CATEGORY_ICONS[category];
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  // Use 1 decimal place for KB and above
  if (i === 0) {
    return `${bytes} B`;
  }

  return `${size.toFixed(1)} ${units[i]}`;
}

/**
 * Validate file size
 */
export function isFileSizeValid(bytes: number): boolean {
  return bytes <= MAX_FILE_SIZE;
}

/**
 * Generate a thumbnail for a PDF file using pdf.js
 * Returns null if thumbnail generation fails
 */
export async function generatePdfThumbnail(file: File): Promise<Blob | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = await import("pdfjs-dist");

    // Set worker path - must match pdf-viewer.tsx
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const scale = 1.0;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return null;

    // Calculate thumbnail size maintaining aspect ratio
    const maxSize = THUMBNAIL_MAX_SIZE;
    const ratio = Math.min(maxSize / viewport.width, maxSize / viewport.height);
    canvas.width = viewport.width * ratio;
    canvas.height = viewport.height * ratio;

    // @ts-expect-error - pdfjs-dist types require canvas but it works with canvasContext
    await page.render({
      canvasContext: context,
      viewport: page.getViewport({ scale: scale * ratio }),
    }).promise;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", THUMBNAIL_QUALITY);
    });
  } catch (error) {
    console.error("[file-utils] Failed to generate PDF thumbnail:", error);
    return null;
  }
}

/**
 * Generate a thumbnail for an image or PDF file
 * Returns null if the file type doesn't support thumbnails or generation fails
 */
export async function generateThumbnail(file: File): Promise<Blob | null> {
  // Generate thumbnails for PDFs (check by MIME type since PDF is now in document category)
  if (file.type === "application/pdf") {
    return generatePdfThumbnail(file);
  }

  // Only generate thumbnails for images
  const category = getFileCategory(file.type);
  if (category !== "image") {
    return null;
  }

  // Skip SVGs - they don't need thumbnails
  if (file.type === "image/svg+xml") {
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      try {
        // Calculate thumbnail dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > THUMBNAIL_MAX_SIZE) {
            height = (height * THUMBNAIL_MAX_SIZE) / width;
            width = THUMBNAIL_MAX_SIZE;
          }
        } else {
          if (height > THUMBNAIL_MAX_SIZE) {
            width = (width * THUMBNAIL_MAX_SIZE) / height;
            height = THUMBNAIL_MAX_SIZE;
          }
        }

        // Create canvas and draw resized image
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob - preserve PNG for transparency support
        const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const quality = file.type === "image/png" ? undefined : THUMBNAIL_QUALITY;

        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          outputType,
          quality
        );
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

/**
 * Generate a unique file ID
 */
export function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

/**
 * Check if storage is near the soft limit
 */
export function isStorageNearLimit(currentSize: number): boolean {
  return currentSize >= STORAGE_SOFT_LIMIT * 0.9; // 90% of soft limit
}

/**
 * Check if adding a file would exceed the soft limit
 */
export function wouldExceedStorageLimit(
  currentSize: number,
  fileSize: number
): boolean {
  return currentSize + fileSize > STORAGE_SOFT_LIMIT;
}

/**
 * Get storage usage percentage
 */
export function getStorageUsagePercent(currentSize: number): number {
  return Math.min(100, (currentSize / STORAGE_SOFT_LIMIT) * 100);
}

/**
 * Supported file types for upload (for file input accept attribute)
 */
export const ACCEPTED_FILE_TYPES = [
  // Images
  "image/*",
  // PDF
  "application/pdf",
  // Documents
  ".doc",
  ".docx",
  ".txt",
  ".md",
  ".rtf",
  ".odt",
  // Spreadsheets
  ".xls",
  ".xlsx",
  ".csv",
  ".ods",
  // Audio
  "audio/*",
  // Video
  "video/*",
].join(",");
