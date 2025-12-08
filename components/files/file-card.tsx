"use client";

import { useState, useEffect } from "react";
import { StoredFile } from "@/lib/types";
import { useFileStore } from "@/lib/stores/file-store";
import {
  getFileIcon,
  formatFileSize,
} from "@/lib/utils/file-utils";
import { MoreVertical, Trash2, Download, Eye, Paperclip, Cloud } from "lucide-react";
import { SyncStatusBadge, SyncStatusIcon } from "./sync-status-badge";
import { filenService } from "@/lib/services/filen-service";

interface FileCardProps {
  file: StoredFile;
  selected?: boolean;
  onClick?: () => void;
  onPreview?: () => void;
  layout?: "grid" | "list" | "compact";
}

export function FileCard({
  file,
  selected = false,
  onClick,
  onPreview,
  layout = "grid",
}: FileCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const deleteFile = useFileStore((state) => state.deleteFile);
  const getFileUrl = useFileStore((state) => state.getFileUrl);

  const FileIcon = getFileIcon(file.mimeType);
  const isImage = file.category === "image";

  // Load thumbnail URL
  useEffect(() => {
    if (file.thumbnailBlob) {
      const url = URL.createObjectURL(file.thumbnailBlob);
      setThumbnailUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (isImage && file.blob) {
      // Use the file itself as thumbnail for images without generated thumbnail
      const url = URL.createObjectURL(file.blob);
      setThumbnailUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file.thumbnailBlob, file.blob, isImage]);

  const handleDownload = () => {
    const url = getFileUrl(file.id);
    if (!url) return;

    const a = document.createElement("a");
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDelete = async () => {
    await deleteFile(file.id);
    setShowMenu(false);
  };

  if (layout === "list") {
    return (
      <div
        className={`flex items-center gap-3 rounded-xl border bg-surface p-3 cursor-pointer transition-all hover:bg-surface-soft ${
          selected ? "border-accent ring-2 ring-accent/20" : "border-subtle"
        }`}
        onClick={onClick}
      >
        {/* Thumbnail or icon */}
        <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-surface-soft flex items-center justify-center overflow-hidden">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={file.filename}
              className="h-full w-full object-cover"
            />
          ) : (
            <FileIcon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {file.filename}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatFileSize(file.size)}</span>
            {filenService.isLoggedIn() && (
              <SyncStatusIcon status={file.syncStatus} />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview?.();
            }}
            className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            title="Preview"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="p-2 rounded-lg hover:bg-white/10 text-red-400 hover:text-red-300 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative cursor-pointer rounded-2xl border bg-surface p-3 transition-all hover:bg-surface-soft ${
        selected ? "border-accent ring-2 ring-accent/20" : "border-subtle"
      }`}
      onClick={onClick}
    >
      {/* File indicators - top right corner */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        {/* Sync status indicator (only when Filen connected) */}
        {filenService.isLoggedIn() && (
          <SyncStatusBadge status={file.syncStatus} size="sm" />
        )}
        {/* File attachment indicator */}
        {file.cardId && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-accent">
            <Paperclip className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      {/* Thumbnail/Preview area */}
      <div
        className={`relative mb-3 w-full rounded-xl bg-surface-soft overflow-hidden ${
          layout === "compact" ? "aspect-square" : "aspect-video"
        }`}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={file.filename}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileIcon className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}

        {/* Hover overlay with actions */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview?.();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            title="Preview"
          >
            <Eye className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            title="Download"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* File info */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground truncate">
          {file.filename}
        </h3>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatFileSize(file.size)}</span>
          <span className="capitalize">{file.category}</span>
        </div>
      </div>

      {/* Cloud-only overlay for ghost files */}
      {file.syncStatus === "cloud-only" && !file.blob && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
          <div className="flex flex-col items-center gap-2 text-center px-4">
            <Cloud className="h-8 w-8 text-accent" />
            <span className="text-xs text-gray-300">Available in cloud</span>
          </div>
        </div>
      )}

      {/* Context menu trigger */}
      <div className="absolute top-2 left-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {/* Dropdown menu */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
              }}
            />
            <div className="absolute left-0 top-8 z-50 w-48 rounded-lg border border-subtle bg-surface shadow-xl">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview?.();
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-soft transition-colors"
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-soft transition-colors"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <div className="border-t border-subtle my-1" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-surface-soft transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Compact file chip for inline display
interface FileChipProps {
  file: StoredFile;
  onRemove?: () => void;
  onClick?: () => void;
}

export function FileChip({ file, onRemove, onClick }: FileChipProps) {
  const FileIcon = getFileIcon(file.mimeType);
  const showSyncStatus = filenService.isLoggedIn();

  return (
    <div
      className="inline-flex items-center gap-2 rounded-lg bg-surface-soft px-2.5 py-1.5 text-sm cursor-pointer hover:bg-surface transition-colors"
      onClick={onClick}
    >
      <FileIcon className="h-4 w-4 text-muted-foreground" />
      <span className="truncate max-w-[120px] text-foreground">
        {file.filename}
      </span>
      <span className="text-xs text-muted-foreground">
        {formatFileSize(file.size)}
      </span>
      {showSyncStatus && (
        <SyncStatusIcon status={file.syncStatus} />
      )}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 text-muted-foreground hover:text-red-400 transition-colors"
        >
          ×
        </button>
      )}
    </div>
  );
}
