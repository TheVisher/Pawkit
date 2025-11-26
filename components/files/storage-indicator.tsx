"use client";

import { useEffect, useState } from "react";
import { useFileStore } from "@/lib/stores/file-store";
import {
  formatFileSize,
  getStorageUsagePercent,
  isStorageNearLimit,
  STORAGE_SOFT_LIMIT,
} from "@/lib/utils/file-utils";
import { HardDrive, AlertTriangle } from "lucide-react";

interface StorageIndicatorProps {
  variant?: "compact" | "full";
  showWarning?: boolean;
  className?: string;
}

export function StorageIndicator({
  variant = "compact",
  showWarning = true,
  className = "",
}: StorageIndicatorProps) {
  const totalSize = useFileStore((state) => state.totalSize);
  const loadFiles = useFileStore((state) => state.loadFiles);
  const files = useFileStore((state) => state.files);
  const [isLoading, setIsLoading] = useState(true);

  // Load files on mount to get accurate storage size
  useEffect(() => {
    loadFiles().then(() => setIsLoading(false));
  }, [loadFiles]);

  const usagePercent = getStorageUsagePercent(totalSize);
  const nearLimit = isStorageNearLimit(totalSize);
  const usedFormatted = formatFileSize(totalSize);
  const limitFormatted = formatFileSize(STORAGE_SOFT_LIMIT);

  if (isLoading) {
    // Show placeholder while loading to avoid layout shift
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground/50 ${className}`}>
        <HardDrive className="h-3.5 w-3.5 flex-shrink-0 animate-pulse" />
        <span>Loading storage...</span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={`flex items-center gap-2 text-xs ${
          nearLimit ? "text-amber-400" : "text-muted-foreground"
        } ${className}`}
        title={`${usedFormatted} of ${limitFormatted} used (${files.length} files)`}
      >
        {nearLimit ? (
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
        ) : (
          <HardDrive className="h-3.5 w-3.5 flex-shrink-0" />
        )}
        <span>Storage: {usedFormatted} / {limitFormatted}</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground">Local Storage</span>
        </div>
        <span className="text-muted-foreground">
          {usedFormatted} / {limitFormatted}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-surface-soft overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            usagePercent >= 90
              ? "bg-red-500"
              : usagePercent >= 75
                ? "bg-amber-500"
                : "bg-accent"
          }`}
          style={{ width: `${Math.min(usagePercent, 100)}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{files.length} file(s)</span>
        <span>{Math.round(usagePercent)}% used</span>
      </div>

      {/* Warning message */}
      {showWarning && nearLimit && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            Storage is almost full. Delete some files to free up space.
          </span>
        </div>
      )}
    </div>
  );
}

// Inline storage badge for use in headers/footers
export function StorageBadge({ className = "" }: { className?: string }) {
  const totalSize = useFileStore((state) => state.totalSize);
  const loadFiles = useFileStore((state) => state.loadFiles);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const usagePercent = getStorageUsagePercent(totalSize);
  const nearLimit = isStorageNearLimit(totalSize);

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs ${
        nearLimit
          ? "bg-amber-500/10 text-amber-400"
          : "bg-surface-soft text-muted-foreground"
      } ${className}`}
      title={`${formatFileSize(totalSize)} used (${Math.round(usagePercent)}%)`}
    >
      <HardDrive className="h-3 w-3" />
      <span>{formatFileSize(totalSize)}</span>
    </div>
  );
}
