"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useFileStore } from "@/lib/stores/file-store";
import { ZoomIn, ZoomOut, Maximize2, Minimize2, X } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfReaderViewProps {
  fileId: string;
  title: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
}

export function PdfReaderView({
  fileId,
  title,
  isExpanded,
  onToggleExpand,
  onClose,
}: PdfReaderViewProps) {
  const files = useFileStore((state) => state.files);
  const file = files.find((f) => f.id === fileId);

  const [pages, setPages] = useState<string[]>([]);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate optimal scale based on container width
  const calculateFitScale = useCallback(
    async (pdf: pdfjsLib.PDFDocumentProxy) => {
      const containerWidth = containerRef.current?.clientWidth || 680;
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });
      // Fit to container with padding, cap at 1.5x for readability
      const fitScale = Math.min((containerWidth - 48) / viewport.width, 1.5);
      return fitScale;
    },
    []
  );

  // Load and render PDF
  useEffect(() => {
    if (!file?.blob) return;

    let cancelled = false;

    const loadPdf = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const arrayBuffer = await file.blob.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        if (cancelled) return;

        // Calculate fit scale
        const fitScale = await calculateFitScale(pdf);
        setScale(fitScale);

        // Render all pages at higher resolution for clarity
        const renderedPages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;

          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: fitScale * 1.5 }); // Higher res

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext("2d");

          if (!context) continue;

          // @ts-expect-error - pdfjs-dist types require canvas but it works with canvasContext
          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          renderedPages.push(canvas.toDataURL("image/png"));
        }

        if (!cancelled) {
          setPages(renderedPages);
        }
      } catch (err) {
        console.error("[PdfReaderView] Error loading PDF:", err);
        if (!cancelled) {
          setError("Failed to load PDF for reading.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [file?.blob, calculateFitScale]);

  // Track scroll position to update current page
  const handleScroll = useCallback(() => {
    if (!containerRef.current || pages.length === 0) return;

    const container = containerRef.current;
    const containerHeight = container.clientHeight;

    for (let i = 0; i < pages.length; i++) {
      const pageElement = document.getElementById(`reader-page-${i + 1}`);
      if (!pageElement) continue;

      const rect = pageElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      if (
        rect.top < containerRect.bottom &&
        rect.bottom > containerRect.top
      ) {
        const visibleTop = Math.max(rect.top, containerRect.top);
        const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
        const visibleHeight = visibleBottom - visibleTop;

        if (visibleHeight > containerHeight * 0.3) {
          setCurrentPage(i + 1);
          break;
        }
      }
    }
  }, [pages.length]);

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        File not found
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-[#faf8f3]">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-gray-600" />
            <p className="text-sm text-gray-600">Loading PDF for reading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-[#faf8f3]">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${isExpanded ? "bg-[#faf8f3]" : ""}`}>
      {/* Header - only show in expanded mode */}
      {isExpanded && (
        <div className="border-b border-gray-200 bg-[#faf8f3] px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleExpand}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              title="Exit fullscreen"
            >
              <X className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 truncate max-w-2xl">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>
              Page {currentPage} of {pages.length}
            </span>
          </div>
        </div>
      )}

      {/* PDF Content - reader style */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto bg-[#faf8f3] ${
          isExpanded ? "px-8 py-12" : "p-6"
        }`}
      >
        <div className="mx-auto max-w-[680px]">
          {/* Title and controls - show in non-expanded mode */}
          {!isExpanded && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight font-serif">
                {title}
              </h1>
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-200">
                <span className="text-sm text-gray-600">
                  {pages.length} {pages.length === 1 ? "page" : "pages"}
                </span>
                <button
                  onClick={onToggleExpand}
                  className="ml-auto text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  title="Expand to fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                  Expand
                </button>
              </div>
            </>
          )}

          {/* PDF Pages */}
          <div className="space-y-8">
            {pages.map((dataUrl, index) => (
              <div
                key={index}
                id={`reader-page-${index + 1}`}
                className="relative"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dataUrl}
                  alt={`Page ${index + 1}`}
                  className="w-full shadow-lg rounded-lg"
                />
                {/* Page number indicator */}
                <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/60 text-xs text-white">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer with zoom controls - minimal */}
      {!isExpanded && (
        <div className="flex items-center justify-center gap-4 py-2 border-t border-gray-200 bg-[#faf8f3]">
          <span className="text-xs text-gray-500">
            Page {currentPage} of {pages.length}
          </span>
        </div>
      )}
    </div>
  );
}
