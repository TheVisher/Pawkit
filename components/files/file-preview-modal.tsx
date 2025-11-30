"use client";

import { useState, useEffect } from "react";
import { StoredFile } from "@/lib/types";
import { useFileStore } from "@/lib/stores/file-store";
import {
  getFileIcon,
  formatFileSize,
} from "@/lib/utils/file-utils";
import {
  X,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from "lucide-react";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with pdf.js
const PdfViewer = dynamic(
  () => import("./pdf-viewer").then((mod) => mod.PdfViewer),
  { ssr: false }
);

interface FilePreviewModalProps {
  file: StoredFile | null;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export function FilePreviewModal({
  file,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
}: FilePreviewModalProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const deleteFile = useFileStore((state) => state.deleteFile);
  const getFileUrl = useFileStore((state) => state.getFileUrl);

  const FileIcon = file ? getFileIcon(file.mimeType) : null;
  const isImage = file?.category === "image";
  const isPdf = file?.mimeType === "application/pdf"; // Check MIME type since PDF is in document category
  const isVideo = file?.category === "video";
  const isAudio = file?.category === "audio";

  // Load file URL
  useEffect(() => {
    if (file?.blob) {
      const url = URL.createObjectURL(file.blob);
      setFileUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setFileUrl(null);
  }, [file]);

  // Reset zoom and rotation when file changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [file?.id]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowRight":
          if (hasNext) onNext?.();
          break;
        case "ArrowLeft":
          if (hasPrevious) onPrevious?.();
          break;
        case "+":
        case "=":
          setZoom((z) => Math.min(z + 0.25, 3));
          break;
        case "-":
          setZoom((z) => Math.max(z - 0.25, 0.5));
          break;
        case "r":
          setRotation((r) => (r + 90) % 360);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, hasNext, hasPrevious, onNext, onPrevious, onClose]);

  if (!isOpen || !file) return null;

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
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[501] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/50">
          <div className="flex items-center gap-3 min-w-0">
            {FileIcon && <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-white truncate">
                {file.filename}
              </h3>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)} · {file.category}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom controls for images */}
            {isImage && (
              <>
                <button
                  onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                  className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut className="h-5 w-5" />
                </button>
                <span className="text-xs text-muted-foreground w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                  className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
                  title="Rotate"
                >
                  <RotateCw className="h-5 w-5" />
                </button>
                <div className="w-px h-6 bg-white/20 mx-2" />
              </>
            )}

            <button
              onClick={handleDownload}
              className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
              title="Download"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg hover:bg-white/10 text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          {/* Navigation arrows */}
          {hasPrevious && (
            <button
              onClick={onPrevious}
              className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {hasNext && (
            <button
              onClick={onNext}
              className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Preview content */}
          <div className="max-w-full max-h-full">
            {isImage && fileUrl && (
              <img
                src={fileUrl}
                alt={file.filename}
                className="max-w-full max-h-[calc(100vh-120px)] object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                }}
              />
            )}

            {isPdf && fileUrl && (
              <div className="w-[90vw] h-[calc(100vh-120px)] rounded-lg overflow-hidden">
                <PdfViewer
                  url={fileUrl}
                  filename={file.filename}
                  onDownload={handleDownload}
                />
              </div>
            )}

            {isVideo && fileUrl && (
              <video
                src={fileUrl}
                controls
                className="max-w-full max-h-[calc(100vh-120px)] rounded-lg"
              >
                Your browser does not support video playback.
              </video>
            )}

            {isAudio && fileUrl && (
              <div className="flex flex-col items-center gap-6 p-8 bg-surface rounded-xl">
                {FileIcon && (
                  <FileIcon className="h-24 w-24 text-accent" />
                )}
                <div className="text-center">
                  <h4 className="text-lg font-medium text-foreground">
                    {file.filename}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <audio
                  src={fileUrl}
                  controls
                  className="w-full max-w-md"
                >
                  Your browser does not support audio playback.
                </audio>
              </div>
            )}

            {/* Fallback for unsupported types */}
            {!isImage && !isPdf && !isVideo && !isAudio && (
              <div className="flex flex-col items-center gap-6 p-8 bg-surface rounded-xl">
                {FileIcon && (
                  <FileIcon className="h-24 w-24 text-muted-foreground" />
                )}
                <div className="text-center">
                  <h4 className="text-lg font-medium text-foreground">
                    {file.filename}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {formatFileSize(file.size)} · {file.mimeType}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Preview not available for this file type.
                  </p>
                </div>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download File
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer with keyboard shortcuts hint */}
        <div className="flex items-center justify-center gap-6 px-4 py-2 bg-black/50 text-xs text-muted-foreground">
          <span>← → Navigate</span>
          <span>Esc Close</span>
          {isImage && (
            <>
              <span>+/- Zoom</span>
              <span>R Rotate</span>
            </>
          )}
        </div>
      </div>
    </>
  );
}
