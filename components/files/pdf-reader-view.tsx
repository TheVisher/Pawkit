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

  // Zoom state for reader mode (1 = fit to width)
  const [zoom, setZoom] = useState(1);

  const zoomIn = useCallback(() => setZoom(z => Math.min(2, z + 0.25)), []);
  const zoomOut = useCallback(() => setZoom(z => Math.max(0.5, z - 0.25)), []);
  const resetZoom = useCallback(() => setZoom(1), []);

  // Keyboard shortcuts for zoom (only in expanded mode)
  useEffect(() => {
    if (!isExpanded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoomIn();
      }
      if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      }
      if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, zoomIn, zoomOut, resetZoom]);

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
    <div className={`flex flex-col h-full ${isExpanded ? "min-h-screen bg-[#faf9f6]" : "bg-[#faf8f3]"}`}>
      {/* Floating Exit Button - only in expanded mode */}
      {isExpanded && (
        <button
          onClick={onToggleExpand}
          className="fixed top-6 right-6 z-50 p-3 bg-gray-800/90 hover:bg-gray-700 rounded-full text-white shadow-lg transition-all hover:scale-105"
          title="Exit Reader (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Floating Zoom Controls - only in expanded mode */}
      {isExpanded && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-800/90 backdrop-blur rounded-full px-4 py-2 text-white text-sm shadow-lg">
          <button
            onClick={zoomOut}
            disabled={zoom <= 0.5}
            className="p-1.5 hover:bg-gray-700 rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Zoom out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetZoom}
            className="w-14 text-center hover:bg-gray-700 rounded px-2 py-1 transition-colors"
            title="Reset zoom (0)"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={zoomIn}
            disabled={zoom >= 2}
            className="p-1.5 hover:bg-gray-700 rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Zoom in (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-600 mx-1" />
          <span className="text-gray-400 text-xs">
            {currentPage}/{pages.length}
          </span>
        </div>
      )}

      {/* PDF Content - reader style */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto ${
          isExpanded ? "py-16 px-4" : "p-6 bg-[#faf8f3]"
        }`}
      >
        <div className={`mx-auto ${isExpanded ? "max-w-4xl" : "max-w-[680px]"}`}>
          {/* Title - always show, bigger in expanded mode */}
          <div className={`${isExpanded ? "mb-12 text-center" : "mb-8"}`}>
            <h1 className={`font-bold text-gray-900 leading-tight font-serif ${
              isExpanded ? "text-4xl md:text-5xl" : "text-3xl"
            }`}>
              {title}
            </h1>
            <div className={`flex items-center gap-4 ${isExpanded ? "justify-center mt-4" : "mt-4 pb-6 border-b border-gray-200"}`}>
              <span className="text-sm text-gray-600">
                {pages.length} {pages.length === 1 ? "page" : "pages"}
              </span>
              {!isExpanded && (
                <button
                  onClick={onToggleExpand}
                  className="ml-auto text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  title="Expand to fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                  Expand
                </button>
              )}
            </div>
          </div>

          {/* PDF Pages */}
          <div className={`space-y-8 ${isExpanded ? "space-y-12" : ""}`}>
            {pages.map((dataUrl, index) => (
              <div
                key={index}
                id={`reader-page-${index + 1}`}
                className="relative"
                style={isExpanded ? {
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                  marginBottom: zoom > 1 ? `${(zoom - 1) * 100}%` : undefined,
                } : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dataUrl}
                  alt={`Page ${index + 1}`}
                  className={`w-full shadow-xl rounded-lg transition-shadow ${isExpanded ? "shadow-2xl" : "shadow-lg"}`}
                />
                {/* Page number indicator - only in non-expanded */}
                {!isExpanded && (
                  <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/60 text-xs text-white">
                    {index + 1}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Keyboard hints at bottom in expanded mode */}
          {isExpanded && (
            <div className="mt-16 text-center text-gray-400 text-sm space-y-2">
              <div>
                <kbd className="px-2 py-1 bg-gray-200 rounded text-gray-600 font-mono text-xs">+</kbd>
                <span className="mx-1">/</span>
                <kbd className="px-2 py-1 bg-gray-200 rounded text-gray-600 font-mono text-xs">-</kbd>
                <span className="ml-2">Zoom</span>
                <span className="mx-3 text-gray-300">|</span>
                <kbd className="px-2 py-1 bg-gray-200 rounded text-gray-600 font-mono text-xs">0</kbd>
                <span className="ml-2">Reset</span>
                <span className="mx-3 text-gray-300">|</span>
                <kbd className="px-2 py-1 bg-gray-200 rounded text-gray-600 font-mono text-xs">Esc</kbd>
                <span className="ml-2">Exit</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer with zoom controls - only in non-expanded mode */}
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
