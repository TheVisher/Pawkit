"use client";

import { Loader2, FolderOpen } from "lucide-react";
import type { CloudFile } from "@/lib/services/cloud-storage/types";
import { CloudFileItem } from "./cloud-file-item";

interface CloudFileListProps {
  files: CloudFile[];
  loading: boolean;
  currentPath: string;
  onNavigate: (path: string) => void;
  onDownload: (file: CloudFile) => void;
  onDelete: (file: CloudFile) => void;
  onPreview: (file: CloudFile) => void;
}

export function CloudFileList({
  files,
  loading,
  currentPath,
  onNavigate,
  onDownload,
  onDelete,
  onPreview,
}: CloudFileListProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-sm">Loading files...</p>
      </div>
    );
  }

  // Sort: folders first, then files, alphabetically within each group
  const sortedFiles = [...files].sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return a.name.localeCompare(b.name);
  });

  if (sortedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <FolderOpen className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">This folder is empty</p>
      </div>
    );
  }

  const handleFileClick = (file: CloudFile) => {
    if (file.isFolder) {
      onNavigate(file.path);
    } else {
      onPreview(file);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white/5 border-b border-white/10 text-xs font-medium text-gray-400 uppercase tracking-wider">
        <div className="w-5" /> {/* Icon space */}
        <div className="flex-1">Name</div>
        <div className="hidden sm:block w-24 text-right">Size</div>
        <div className="hidden md:block w-28 text-right">Modified</div>
        <div className="w-20" /> {/* Actions space */}
      </div>

      {/* Parent folder navigation */}
      {currentPath !== "/" && currentPath !== "" && (
        <div
          className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5"
          onClick={() => {
            const parentPath = currentPath.split("/").slice(0, -1).join("/") || "/";
            onNavigate(parentPath);
          }}
        >
          <div className="flex-shrink-0">
            <FolderOpen className="h-5 w-5 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-400">..</p>
          </div>
          <div className="hidden sm:block w-24 text-right">
            <span className="text-xs text-gray-500">-</span>
          </div>
          <div className="hidden md:block w-28 text-right">
            <span className="text-xs text-gray-500">-</span>
          </div>
          <div className="w-20" />
        </div>
      )}

      {/* File list */}
      {sortedFiles.map((file) => (
        <CloudFileItem
          key={file.cloudId}
          file={file}
          onClick={() => handleFileClick(file)}
          onDownload={() => onDownload(file)}
          onDelete={() => onDelete(file)}
          onPreview={() => onPreview(file)}
        />
      ))}
    </div>
  );
}
