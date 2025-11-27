"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Loader2,
  FileText,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { cn } from "@/lib/utils";

// Configure PDF.js worker - use local file to avoid CSP issues
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfViewerProps {
  url: string; // Blob URL or regular URL
  filename?: string;
  onDownload?: () => void;
  className?: string;
}

export function PdfViewer({
  url,
  filename = "Document.pdf",
  onDownload,
  className,
}: PdfViewerProps) {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderedPages, setRenderedPages] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Define callbacks BEFORE the useEffects that use them
  const scrollToPage = useCallback((pageNumber: number) => {
    const pageElement = document.getElementById(`pdf-page-${pageNumber}`);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const goToPrevPage = useCallback(() => {
    setCurrentPage((p) => {
      const newPage = Math.max(1, p - 1);
      scrollToPage(newPage);
      return newPage;
    });
  }, [scrollToPage]);

  const goToNextPage = useCallback(() => {
    setCurrentPage((p) => {
      const newPage = Math.min(totalPages, p + 1);
      scrollToPage(newPage);
      return newPage;
    });
  }, [totalPages, scrollToPage]);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(3, s + 0.25));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(0.5, s - 0.25));
  }, []);

  // Track scroll position to update current page indicator
  const handleScroll = useCallback(() => {
    if (!containerRef.current || renderedPages.length === 0) return;

    const container = containerRef.current;
    const containerHeight = container.clientHeight;

    // Find which page is most visible
    for (let i = 0; i < renderedPages.length; i++) {
      const pageElement = document.getElementById(`pdf-page-${i + 1}`);
      if (!pageElement) continue;

      const rect = pageElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Check if page is in view
      if (
        rect.top < containerRect.bottom &&
        rect.bottom > containerRect.top
      ) {
        // Calculate how much of the page is visible
        const visibleTop = Math.max(rect.top, containerRect.top);
        const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
        const visibleHeight = visibleBottom - visibleTop;

        if (visibleHeight > containerHeight * 0.3) {
          setCurrentPage(i + 1);
          break;
        }
      }
    }
  }, [renderedPages.length]);

  // Load PDF document
  useEffect(() => {
    let cancelled = false;

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const loadingTask = pdfjsLib.getDocument(url);
        const pdfDoc = await loadingTask.promise;

        if (cancelled) return;

        setPdf(pdfDoc);
        setTotalPages(pdfDoc.numPages);
        setCurrentPage(1);
      } catch (err) {
        if (cancelled) return;
        console.error("[PdfViewer] Error loading PDF:", err);
        setError("Failed to load PDF. The file may be corrupted or unsupported.");
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
  }, [url]);

  // Render all pages for continuous scroll
  useEffect(() => {
    let cancelled = false;

    const renderAllPages = async () => {
      if (!pdf) return;

      try {
        const pages: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;

          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: scale * 1.5 }); // Higher resolution for clarity

          const canvas = document.createElement("canvas");
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          const context = canvas.getContext("2d");

          if (!context) continue;

          // @ts-expect-error - pdfjs-dist types require canvas but it works with canvasContext
          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          pages.push(canvas.toDataURL("image/png"));
        }

        if (!cancelled) {
          setRenderedPages(pages);
        }
      } catch (err) {
        console.error("[PdfViewer] Error rendering pages:", err);
      }
    };

    renderAllPages();

    return () => {
      cancelled = true;
    };
  }, [pdf, scale]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          goToPrevPage();
          break;
        case "ArrowRight":
          goToNextPage();
          break;
        case "+":
        case "=":
          zoomIn();
          break;
        case "-":
          zoomOut();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevPage, goToNextPage, zoomIn, zoomOut]);

  const zoomPercent = Math.round(scale * 100);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex flex-col h-full bg-gray-900/50", className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Loading PDF...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("flex flex-col h-full bg-gray-900/50", className)}>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <FileText className="w-16 h-16 text-muted-foreground" />
          <p className="text-sm text-red-400 text-center">{error}</p>
          {onDownload && (
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Instead
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/40 backdrop-blur-sm border-b border-white/10">
        {/* Left: Filename and page info */}
        <div className="flex items-center gap-4 min-w-0">
          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-gray-300 truncate max-w-[150px]">
            {filename}
          </span>
          <span className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {/* Center: Page navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous page (←)"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next page (→)"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Right: Zoom controls + Download */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
            title="Zoom out (-)"
          >
            <ZoomOut className="w-4 h-4 text-white" />
          </button>
          <span className="text-xs text-gray-400 w-10 text-center">
            {zoomPercent}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= 3}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
            title="Zoom in (+)"
          >
            <ZoomIn className="w-4 h-4 text-white" />
          </button>

          {onDownload && (
            <>
              <div className="w-px h-4 bg-white/20 mx-2" />
              <button
                onClick={onDownload}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4 text-white" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* PDF pages - continuous scroll */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto bg-gray-800/50"
      >
        <div className="flex flex-col items-center gap-4 p-4">
          {renderedPages.length === 0 ? (
            // Show loading while rendering pages
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : (
            renderedPages.map((dataUrl, index) => (
              <div
                key={index}
                id={`pdf-page-${index + 1}`}
                className="relative"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dataUrl}
                  alt={`Page ${index + 1}`}
                  className="shadow-lg rounded-lg max-w-full"
                  style={{
                    maxHeight: "calc(100vh - 200px)",
                  }}
                />
                {/* Page number badge */}
                <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/60 backdrop-blur-sm text-xs text-gray-300">
                  {index + 1}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer with keyboard shortcuts */}
      <div className="flex items-center justify-center gap-6 px-4 py-1.5 bg-black/40 border-t border-white/10 text-[10px] text-muted-foreground">
        <span>← → Navigate</span>
        <span>+/- Zoom</span>
      </div>
    </div>
  );
}
