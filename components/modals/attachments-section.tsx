"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Paperclip, Plus, X, FileText, FileImage, FileAudio, FileVideo, File } from "lucide-react";
import { useFileStore } from "@/lib/stores/file-store";
import { StoredFile, FileCategory } from "@/lib/types";
import { formatFileSize } from "@/lib/utils/file-utils";
import { FilePreviewModal } from "@/components/files/file-preview-modal";

interface AttachmentsSectionProps {
  cardId: string;
}

// Get icon based on file category
function getFileIcon(category: FileCategory) {
  switch (category) {
    case "image":
      return FileImage;
    case "pdf":
    case "document":
      return FileText;
    case "audio":
      return FileAudio;
    case "video":
      return FileVideo;
    default:
      return File;
  }
}

function AttachmentItem({
  file,
  onClick,
  onRemove,
}: {
  file: StoredFile;
  onClick: () => void;
  onRemove: () => void;
}) {
  // Create blob URL for thumbnail
  const thumbnailUrl = useMemo(() => {
    if (file.thumbnailBlob) {
      return URL.createObjectURL(file.thumbnailBlob);
    }
    return null;
  }, [file.thumbnailBlob]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [thumbnailUrl]);

  const Icon = getFileIcon(file.category);

  return (
    <div
      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors"
      onClick={onClick}
    >
      {/* Thumbnail or icon */}
      <div className="w-8 h-8 rounded bg-surface-soft flex items-center justify-center overflow-hidden flex-shrink-0">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground truncate">{file.filename}</p>
        <p className="text-[10px] text-muted-foreground">
          {formatFileSize(file.size)}
        </p>
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity"
        title="Remove attachment"
      >
        <X className="w-3 h-3 text-muted-foreground" />
      </button>
    </div>
  );
}

export function AttachmentsSection({ cardId }: AttachmentsSectionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<StoredFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const files = useFileStore((state) => state.files);
  const uploadFile = useFileStore((state) => state.uploadFile);
  const deleteFile = useFileStore((state) => state.deleteFile);

  // Get files attached to this card (have cardId set)
  const attachedFiles = useMemo(
    () => files.filter((f) => f.cardId === cardId && !f.deleted),
    [files, cardId]
  );

  // Get index of preview file for navigation
  const previewFileIndex = useMemo(() => {
    if (!previewFile) return -1;
    return attachedFiles.findIndex((f) => f.id === previewFile.id);
  }, [attachedFiles, previewFile]);

  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(selectedFiles)) {
        // Upload with cardId - this attaches it without creating a separate card
        await uploadFile(file, "", cardId);
      }
    } catch (error) {
      console.error("[AttachmentsSection] Error uploading files:", error);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async (fileId: string) => {
    await deleteFile(fileId);
  };

  const handleFileClick = (file: StoredFile) => {
    setPreviewFile(file);
  };

  const handleNavigatePreview = (direction: "prev" | "next") => {
    if (previewFileIndex === -1) return;

    const newIndex =
      direction === "prev"
        ? (previewFileIndex - 1 + attachedFiles.length) % attachedFiles.length
        : (previewFileIndex + 1) % attachedFiles.length;

    setPreviewFile(attachedFiles[newIndex]);
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Paperclip className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">Attachments</h3>
        {attachedFiles.length > 0 && (
          <span className="text-xs text-muted-foreground">
            ({attachedFiles.length})
          </span>
        )}
      </div>

      {/* Attached Files List */}
      {attachedFiles.length === 0 ? (
        <p className="text-xs text-muted-foreground pl-6">
          No attachments yet. Add receipts, documents, or images.
        </p>
      ) : (
        <div className="space-y-1 pl-2">
          {attachedFiles.map((file) => (
            <AttachmentItem
              key={file.id}
              file={file}
              onClick={() => handleFileClick(file)}
              onRemove={() => handleRemove(file.id)}
            />
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleAttach}
      />

      {/* Attach button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="flex items-center gap-2 text-xs text-accent hover:text-accent/80 pl-6 transition-colors disabled:opacity-50"
      >
        <Plus className="w-3 h-3" />
        {isUploading ? "Uploading..." : "Attach File"}
      </button>

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onPrevious={
          attachedFiles.length > 1
            ? () => handleNavigatePreview("prev")
            : undefined
        }
        onNext={
          attachedFiles.length > 1
            ? () => handleNavigatePreview("next")
            : undefined
        }
        hasPrevious={attachedFiles.length > 1}
        hasNext={attachedFiles.length > 1}
      />
    </div>
  );
}
