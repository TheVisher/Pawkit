"use client";

import { useState, useEffect } from "react";
import { useFileStore } from "@/lib/stores/file-store";
import {
  FileText,
  User,
  Calendar,
  Hash,
  Tag,
  FileCode,
  Clock,
  Layers,
  Info,
} from "lucide-react";
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
    <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
          <FileText className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-200">
            PDF Information
          </h3>
          <p className="text-sm text-gray-500">Document metadata and details</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-400">
          {error}
        </div>
      )}

      <div className="space-y-1">
        {/* Always show filename and file size */}
        <MetadataRow
          icon={FileText}
          label="Filename"
          value={pdfInfo?.filename}
        />
        <MetadataRow
          icon={Layers}
          label="Pages"
          value={pdfInfo?.pageCount?.toString()}
        />
        <MetadataRow
          icon={Hash}
          label="File Size"
          value={pdfInfo?.fileSize ? formatFileSize(pdfInfo.fileSize) : undefined}
        />

        {/* Document metadata - only show if available */}
        {pdfInfo?.title && (
          <MetadataRow icon={FileText} label="Title" value={pdfInfo.title} />
        )}
        {pdfInfo?.author && (
          <MetadataRow icon={User} label="Author" value={pdfInfo.author} />
        )}
        {pdfInfo?.subject && (
          <MetadataRow icon={Tag} label="Subject" value={pdfInfo.subject} />
        )}
        {pdfInfo?.keywords && (
          <MetadataRow icon={Tag} label="Keywords" value={pdfInfo.keywords} />
        )}

        {/* Dates */}
        {pdfInfo?.creationDate && (
          <MetadataRow
            icon={Calendar}
            label="Created"
            value={pdfInfo.creationDate}
          />
        )}
        {pdfInfo?.modDate && (
          <MetadataRow
            icon={Clock}
            label="Modified"
            value={pdfInfo.modDate}
          />
        )}

        {/* Technical info */}
        {pdfInfo?.creator && (
          <MetadataRow
            icon={FileCode}
            label="Created With"
            value={pdfInfo.creator}
          />
        )}
        {pdfInfo?.producer && (
          <MetadataRow
            icon={FileCode}
            label="PDF Producer"
            value={pdfInfo.producer}
          />
        )}
        {pdfInfo?.pdfVersion && (
          <MetadataRow
            icon={Info}
            label="PDF Version"
            value={pdfInfo.pdfVersion}
          />
        )}
      </div>

      {/* Show note if minimal metadata */}
      {!pdfInfo?.title && !pdfInfo?.author && !pdfInfo?.creationDate && (
        <div className="mt-6 p-4 rounded-lg bg-gray-800/50 border border-white/5">
          <p className="text-sm text-gray-400">
            This PDF has limited embedded metadata. Some documents don&apos;t
            include author or creation information.
          </p>
        </div>
      )}
    </div>
  );
}

function MetadataRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
}) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <Icon className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm text-gray-200 break-words">{value}</p>
      </div>
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
