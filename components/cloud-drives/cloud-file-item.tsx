"use client";

import { Folder, FileText, Image as ImageIcon, Film, Music, File, MoreVertical, Download, Trash2, Eye } from "lucide-react";
import type { CloudFile } from "@/lib/services/cloud-storage/types";
import { formatFileSize } from "@/lib/utils/file-utils";

interface CloudFileItemProps {
  file: CloudFile;
  onClick: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onPreview?: () => void;
}

function getFileIcon(file: CloudFile) {
  if (file.isFolder) {
    return <Folder className="h-5 w-5 text-yellow-400" />;
  }

  const mimeType = file.mimeType.toLowerCase();

  if (mimeType.startsWith("image/")) {
    return <ImageIcon className="h-5 w-5 text-green-400" />;
  }
  if (mimeType.startsWith("video/")) {
    return <Film className="h-5 w-5 text-accent" />;
  }
  if (mimeType.startsWith("audio/")) {
    return <Music className="h-5 w-5 text-pink-400" />;
  }
  if (mimeType === "text/markdown" || file.name.endsWith(".md")) {
    return <FileText className="h-5 w-5 text-blue-400" />;
  }
  if (mimeType === "application/pdf") {
    return <FileText className="h-5 w-5 text-red-400" />;
  }

  return <File className="h-5 w-5 text-gray-400" />;
}

function formatDate(date: Date) {
  const now = new Date();
  const fileDate = new Date(date);
  const diffDays = Math.floor((now.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return fileDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: fileDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function CloudFileItem({ file, onClick, onDownload, onDelete, onPreview }: CloudFileItemProps) {
  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div
      className="group flex items-center gap-4 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-b-0"
      onClick={onClick}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {getFileIcon(file)}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{file.name}</p>
      </div>

      {/* Size */}
      <div className="hidden sm:block w-24 text-right">
        <span className="text-xs text-gray-500">
          {file.isFolder ? "-" : formatFileSize(file.size)}
        </span>
      </div>

      {/* Modified */}
      <div className="hidden md:block w-28 text-right">
        <span className="text-xs text-gray-500">
          {formatDate(file.modifiedAt)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!file.isFolder && onPreview && (
          <button
            onClick={(e) => handleActionClick(e, onPreview)}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Preview"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
        {!file.isFolder && (
          <button
            onClick={(e) => handleActionClick(e, onDownload)}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={(e) => handleActionClick(e, onDelete)}
          className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
