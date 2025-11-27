"use client";

import { useState, useEffect, useMemo } from "react";
import { Download, ZoomIn, ZoomOut, RotateCw, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { useFileStore } from "@/lib/stores/file-store";
import { StoredFile } from "@/lib/types";
import { formatFileSize } from "@/lib/utils/file-utils";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with pdf.js
const PdfViewer = dynamic(
  () => import("@/components/files/pdf-viewer").then((mod) => mod.PdfViewer),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full"><div className="animate-spin h-8 w-8 border-2 border-gray-500 border-t-accent rounded-full" /></div> }
);

interface AttachmentsTabContentProps {
  cardId: string;
  initialFileId?: string;
}

export function AttachmentsTabContent({ cardId, initialFileId }: AttachmentsTabContentProps) {
  const files = useFileStore((state) => state.files);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(initialFileId || null);

  const attachments = useMemo(
    () => files.filter((f) => f.cardId === cardId && !f.deleted),
    [files, cardId]
  );

  const selectedFile = useMemo(
    () => attachments.find((f) => f.id === selectedFileId) || null,
    [attachments, selectedFileId]
  );

  // Auto-select first file if none selected
  useEffect(() => {
    if (attachments.length > 0 && !selectedFileId) {
      setSelectedFileId(attachments[0].id);
    }
  }, [attachments, selectedFileId]);

  // Update selection when initialFileId changes
  useEffect(() => {
    if (initialFileId) {
      setSelectedFileId(initialFileId);
    }
  }, [initialFileId]);

  const handleNavigate = (direction: "prev" | "next") => {
    if (!selectedFile) return;
    const currentIndex = attachments.findIndex((f) => f.id === selectedFile.id);
    const newIndex =
      direction === "prev"
        ? (currentIndex - 1 + attachments.length) % attachments.length
        : (currentIndex + 1) % attachments.length;
    setSelectedFileId(attachments[newIndex].id);
  };

  if (attachments.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">No attachments</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Main preview area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
        {selectedFile && <AttachmentPreview file={selectedFile} />}

        {/* Navigation arrows for multiple attachments */}
        {attachments.length > 1 && (
          <>
            <button
              onClick={() => handleNavigate("prev")}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white hover:bg-black/60 transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleNavigate("next")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white hover:bg-black/60 transition-colors"
              title="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip (if multiple attachments) */}
      {attachments.length > 1 && (
        <div className="flex gap-2 p-3 border-t border-white/10 overflow-x-auto">
          {attachments.map((file) => (
            <AttachmentThumbnail
              key={file.id}
              file={file}
              isSelected={selectedFileId === file.id}
              onClick={() => setSelectedFileId(file.id)}
            />
          ))}
        </div>
      )}

      {/* Controls bar */}
      {selectedFile && (
        <AttachmentControls file={selectedFile} />
      )}
    </div>
  );
}

function AttachmentThumbnail({
  file,
  isSelected,
  onClick,
}: {
  file: StoredFile;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file.thumbnailBlob) {
      const url = URL.createObjectURL(file.thumbnailBlob);
      setThumbnailUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file.thumbnailBlob]);

  const isImage = file.mimeType.startsWith("image/");

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all",
        isSelected
          ? "border-accent ring-2 ring-accent/30"
          : "border-transparent hover:border-white/30"
      )}
    >
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt={file.filename}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-surface-soft flex items-center justify-center">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
    </button>
  );
}

function AttachmentPreview({ file }: { file: StoredFile }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (file.blob) {
      const url = URL.createObjectURL(file.blob);
      setBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file.blob]);

  // Reset zoom and rotation when file changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [file.id]);

  if (!blobUrl) {
    return (
      <div className="flex items-center justify-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-gray-500 border-t-accent rounded-full" />
      </div>
    );
  }

  const isImage = file.mimeType.startsWith("image/");
  const isPdf = file.mimeType === "application/pdf";
  const isVideo = file.mimeType.startsWith("video/");
  const isAudio = file.mimeType.startsWith("audio/");

  if (isImage) {
    return (
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={blobUrl}
          alt={file.filename}
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
        />
        {/* Zoom/Rotate controls overlay */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4 text-white" />
          </button>
          <span className="text-xs text-white min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4 text-white" />
          </button>
          <div className="w-px h-4 bg-white/20" />
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            title="Rotate"
          >
            <RotateCw className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    );
  }

  if (isPdf && blobUrl) {
    const handlePdfDownload = () => {
      if (!file.blob) return;
      const url = URL.createObjectURL(file.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    return (
      <div className="w-full h-full">
        <PdfViewer
          url={blobUrl}
          filename={file.filename}
          onDownload={handlePdfDownload}
        />
      </div>
    );
  }

  if (isVideo) {
    return (
      <video
        src={blobUrl}
        controls
        className="max-w-full max-h-full rounded-lg"
      >
        Your browser does not support video playback.
      </video>
    );
  }

  if (isAudio) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <FileText className="w-16 h-16 text-muted-foreground" />
        <p className="text-foreground">{file.filename}</p>
        <audio src={blobUrl} controls className="w-full max-w-md">
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  }

  // Document/other - show download prompt
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <FileText className="w-16 h-16 text-muted-foreground" />
      <p className="text-foreground">{file.filename}</p>
      <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
      <p className="text-xs text-muted-foreground">
        This file type cannot be previewed. Download to view.
      </p>
    </div>
  );
}

function AttachmentControls({ file }: { file: StoredFile }) {
  const handleDownload = () => {
    if (!file.blob) return;
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-white/10 bg-surface-soft/50">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{file.filename}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
      </div>
      <button
        onClick={handleDownload}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors text-sm"
        title="Download"
      >
        <Download className="w-4 h-4" />
        Download
      </button>
    </div>
  );
}
