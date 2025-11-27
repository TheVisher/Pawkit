"use client";

import { useState, useEffect } from "react";
import { useFileStore } from "@/lib/stores/file-store";
import * as pdfjsLib from "pdfjs-dist";
import { formatFileSize } from "@/lib/utils/file-utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfMetadataViewProps {
  fileId: string;
}

interface PdfInfo {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modDate?: string;
  pdfVersion?: string;
  pageCount?: number;
  fileSize?: number;
  filename?: string;
}

export function PdfMetadataView({ fileId }: PdfMetadataViewProps) {
  const files = useFileStore((state) => state.files);
  const file = files.find((f) => f.id === fileId);

  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file?.blob) return;

    let cancelled = false;

    const extractMetadata = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const arrayBuffer = await file.blob.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const metadata = await pdf.getMetadata();
        const info = metadata.info as Record<string, unknown>;

        if (cancelled) return;

        setPdfInfo({
          title: info?.Title as string | undefined,
          author: info?.Author as string | undefined,
          subject: info?.Subject as string | undefined,
          keywords: info?.Keywords as string | undefined,
          creator: info?.Creator as string | undefined,
          producer: info?.Producer as string | undefined,
          creationDate: info?.CreationDate
            ? formatPdfDate(info.CreationDate as string)
            : undefined,
          modDate: info?.ModDate
            ? formatPdfDate(info.ModDate as string)
            : undefined,
          pdfVersion: info?.PDFFormatVersion as string | undefined,
          pageCount: pdf.numPages,
          fileSize: file.size,
          filename: file.filename,
        });
      } catch (err) {
        console.error("[PdfMetadataView] Error extracting metadata:", err);
        if (!cancelled) {
          setError("Failed to extract PDF metadata.");
          // Still show basic file info
          setPdfInfo({
            filename: file.filename,
            fileSize: file.size,
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    extractMetadata();

    return () => {
      cancelled = true;
    };
  }, [file?.blob, file?.size, file?.filename]);

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        File not found
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-500 border-t-accent" />
          <p className="text-sm text-gray-400">Extracting PDF metadata...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-6">
      <h3 className="text-lg font-semibold text-gray-200 mb-6">
        PDF Information
      </h3>

      {error && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-400 mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3 text-sm">
        {/* Always show filename and file size */}
        <MetadataRow label="Filename" value={pdfInfo?.filename} />
        <MetadataRow label="Pages" value={pdfInfo?.pageCount?.toString()} />
        <MetadataRow
          label="File Size"
          value={pdfInfo?.fileSize ? formatFileSize(pdfInfo.fileSize) : undefined}
        />

        {/* Document metadata - only show if available */}
        {pdfInfo?.title && <MetadataRow label="Title" value={pdfInfo.title} />}
        {pdfInfo?.author && <MetadataRow label="Author" value={pdfInfo.author} />}
        {pdfInfo?.subject && <MetadataRow label="Subject" value={pdfInfo.subject} />}
        {pdfInfo?.keywords && <MetadataRow label="Keywords" value={pdfInfo.keywords} />}

        {/* Dates */}
        {pdfInfo?.creationDate && (
          <MetadataRow label="Created" value={pdfInfo.creationDate} />
        )}
        {pdfInfo?.modDate && (
          <MetadataRow label="Modified" value={pdfInfo.modDate} />
        )}

        {/* Technical info */}
        {pdfInfo?.creator && (
          <MetadataRow label="Created With" value={pdfInfo.creator} />
        )}
        {pdfInfo?.producer && (
          <MetadataRow label="PDF Producer" value={pdfInfo.producer} />
        )}
        {pdfInfo?.pdfVersion && (
          <MetadataRow label="PDF Version" value={pdfInfo.pdfVersion} />
        )}

        {/* Show note if minimal metadata */}
        {!pdfInfo?.title && !pdfInfo?.author && !pdfInfo?.creationDate && (
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-gray-400">Note</span>
            <span className="text-gray-500 text-right max-w-md">
              This PDF has limited embedded metadata
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function MetadataRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  if (!value) return null;

  return (
    <div className="flex justify-between py-2 border-b border-white/10">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-200 text-right max-w-md truncate">{value}</span>
    </div>
  );
}

function formatPdfDate(pdfDate: string): string {
  // PDF dates are in format: D:YYYYMMDDHHmmSS or D:YYYYMMDDHHmmSSOHH'mm'
  try {
    const match = pdfDate.match(
      /D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/
    );
    if (!match) return pdfDate;

    const [, year, month, day, hour = "00", min = "00"] = match;
    const date = new Date(`${year}-${month}-${day}T${hour}:${min}:00`);

    if (isNaN(date.getTime())) return pdfDate;

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return pdfDate;
  }
}
