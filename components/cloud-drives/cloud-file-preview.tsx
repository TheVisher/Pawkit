"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Download, Loader2, FileText, Image, Film, Music, File } from "lucide-react";
import { GlowButton } from "@/components/ui/glow-button";
import { cloudStorage } from "@/lib/services/cloud-storage";
import { formatFileSize } from "@/lib/utils/file-utils";
import type { CloudFile, CloudProviderId } from "@/lib/services/cloud-storage/types";

interface CloudFilePreviewProps {
  file: CloudFile;
  providerId: CloudProviderId;
  onClose: () => void;
  onDownload: () => void;
}

function getFileTypeInfo(file: CloudFile) {
  const mimeType = file.mimeType.toLowerCase();

  if (mimeType.startsWith("image/")) {
    return { type: "image", icon: Image, color: "text-green-400" };
  }
  if (mimeType.startsWith("video/")) {
    return { type: "video", icon: Film, color: "text-accent" };
  }
  if (mimeType.startsWith("audio/")) {
    return { type: "audio", icon: Music, color: "text-pink-400" };
  }
  if (mimeType === "text/markdown" || file.name.endsWith(".md")) {
    return { type: "markdown", icon: FileText, color: "text-blue-400" };
  }
  if (mimeType === "application/pdf") {
    return { type: "pdf", icon: FileText, color: "text-red-400" };
  }
  if (mimeType.startsWith("text/")) {
    return { type: "text", icon: FileText, color: "text-gray-400" };
  }

  return { type: "other", icon: File, color: "text-gray-400" };
}

export function CloudFilePreview({ file, providerId, onClose, onDownload }: CloudFilePreviewProps) {
  const [loading, setLoading] = useState(true);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInfo = getFileTypeInfo(file);
  const Icon = fileInfo.icon;

  useEffect(() => {
    const loadPreview = async () => {
      setLoading(true);
      setError(null);

      try {
        const provider = cloudStorage.getProvider(providerId);
        if (!provider) {
          setError("Provider not found");
          return;
        }

        // For images, create blob URL
        if (fileInfo.type === "image") {
          const blob = await provider.downloadFile(file.cloudId);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
        // For text/markdown, read content
        else if (fileInfo.type === "markdown" || fileInfo.type === "text") {
          const blob = await provider.downloadFile(file.cloudId);
          const text = await blob.text();
          setPreviewContent(text);
        }
        // For PDF, create blob URL
        else if (fileInfo.type === "pdf") {
          const blob = await provider.downloadFile(file.cloudId);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
        // For other types, just show file info
        else {
          setPreviewContent(null);
        }
      } catch (err) {
        console.error("[CloudFilePreview] Failed to load preview:", err);
        setError("Failed to load preview");
      } finally {
        setLoading(false);
      }
    };

    loadPreview();

    return () => {
      // Clean up blob URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file, providerId, fileInfo.type]);

  const modalContent = (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <Icon className={`h-6 w-6 ${fileInfo.color} flex-shrink-0`} />
            <div className="min-w-0">
              <h2 className="text-lg font-medium text-white truncate">{file.name}</h2>
              <p className="text-sm text-gray-400">{formatFileSize(file.size)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GlowButton onClick={onDownload} variant="primary" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </GlowButton>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
              <p className="text-sm text-gray-400">Loading preview...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Icon className={`h-12 w-12 ${fileInfo.color} opacity-50 mb-4`} />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : fileInfo.type === "image" && previewUrl ? (
            <div className="flex items-center justify-center">
              <img
                src={previewUrl}
                alt={file.name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          ) : fileInfo.type === "pdf" && previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-[70vh] rounded-lg bg-white"
              title={file.name}
            />
          ) : (fileInfo.type === "markdown" || fileInfo.type === "text") && previewContent ? (
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-black/30 p-4 rounded-lg overflow-auto max-h-[70vh]">
              {previewContent}
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center h-64">
              <Icon className={`h-16 w-16 ${fileInfo.color} opacity-50 mb-4`} />
              <p className="text-lg font-medium text-white mb-2">{file.name}</p>
              <p className="text-sm text-gray-400 mb-4">
                Preview not available for this file type
              </p>
              <GlowButton onClick={onDownload} variant="primary" size="md">
                <Download className="h-4 w-4 mr-2" />
                Download File
              </GlowButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
