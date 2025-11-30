"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { findOrphanedFiles, deleteOrphanedFiles, OrphanDetectionResult } from "@/lib/services/orphan-cleanup";
import { formatFileSize } from "@/lib/utils/file-utils";

export function StorageCleanupSection() {
  const [orphanData, setOrphanData] = useState<OrphanDetectionResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupProgress, setCleanupProgress] = useState<{ current: number; total: number } | null>(null);
  const [cleanupResult, setCleanupResult] = useState<{
    deleted: number;
    freedBytes: number;
    filenDeleted: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const scanForOrphans = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    setCleanupResult(null);

    try {
      const result = await findOrphanedFiles();
      setOrphanData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan for orphaned files");
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Scan on mount
  useEffect(() => {
    scanForOrphans();
  }, [scanForOrphans]);

  const handleCleanup = async () => {
    setShowConfirm(false);
    setIsCleaning(true);
    setError(null);
    setCleanupProgress(null);

    try {
      const result = await deleteOrphanedFiles((current, total) => {
        setCleanupProgress({ current, total });
      });

      setCleanupResult(result);
      setOrphanData(null);

      // Re-scan after cleanup
      await scanForOrphans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clean up orphaned files");
    } finally {
      setIsCleaning(false);
      setCleanupProgress(null);
    }
  };

  const getOrphanBreakdown = () => {
    if (!orphanData) return null;

    const breakdown = {
      softDeleted: 0,
      missingCard: 0,
      missingFileCard: 0,
    };

    for (const orphan of orphanData.orphans) {
      if (orphan.reason === "soft-deleted") breakdown.softDeleted++;
      else if (orphan.reason === "missing-card") breakdown.missingCard++;
      else if (orphan.reason === "missing-file-card") breakdown.missingFileCard++;
    }

    return breakdown;
  };

  const breakdown = getOrphanBreakdown();

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-100">Storage Cleanup</h2>
      <p className="text-xs text-gray-400">
        Scan for orphaned files that are consuming storage but are no longer referenced.
      </p>

      {/* Scan Results */}
      {isScanning ? (
        <div className="flex items-center gap-2 text-gray-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Scanning for orphaned files...</span>
        </div>
      ) : orphanData ? (
        <div className="rounded-lg border border-subtle bg-surface-soft p-4 space-y-3">
          {orphanData.totalCount > 0 ? (
            <>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-100">
                    {orphanData.totalCount} orphaned file{orphanData.totalCount !== 1 ? "s" : ""} detected
                  </p>
                  <p className="text-sm text-gray-400">
                    Using {formatFileSize(orphanData.totalSize)} of storage
                  </p>
                </div>
              </div>

              {breakdown && (
                <div className="text-xs text-gray-500 space-y-1 pl-7">
                  {breakdown.softDeleted > 0 && (
                    <p>{breakdown.softDeleted} soft-deleted (never purged)</p>
                  )}
                  {breakdown.missingCard > 0 && (
                    <p>{breakdown.missingCard} attachments with missing cards</p>
                  )}
                  {breakdown.missingFileCard > 0 && (
                    <p>{breakdown.missingFileCard} files with missing file cards</p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={isCleaning}
                  className="flex items-center gap-2 rounded bg-amber-600 hover:bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Clean up
                </button>
                <button
                  onClick={scanForOrphans}
                  disabled={isCleaning}
                  className="flex items-center gap-2 rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm text-gray-200 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Re-scan
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span>No orphaned files detected</span>
            </div>
          )}
        </div>
      ) : null}

      {/* Cleanup Progress */}
      {isCleaning && cleanupProgress && (
        <div className="rounded-lg border border-subtle bg-surface-soft p-4">
          <div className="flex items-center gap-2 text-gray-300">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>
              Cleaning up... ({cleanupProgress.current}/{cleanupProgress.total})
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gray-700 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${(cleanupProgress.current / cleanupProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Cleanup Result */}
      {cleanupResult && cleanupResult.deleted > 0 && (
        <div className="rounded-lg border border-green-800 bg-green-950/30 p-4">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Cleanup complete!</p>
              <p className="text-sm text-green-500">
                Deleted {cleanupResult.deleted} file{cleanupResult.deleted !== 1 ? "s" : ""},
                freed {formatFileSize(cleanupResult.freedBytes)}
                {cleanupResult.filenDeleted > 0 && (
                  <> ({cleanupResult.filenDeleted} also removed from Filen)</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-xl border border-subtle bg-surface p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-100 mb-2">
              Confirm Cleanup
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              This will permanently delete {orphanData?.totalCount} orphaned file{orphanData?.totalCount !== 1 ? "s" : ""}
              ({formatFileSize(orphanData?.totalSize || 0)}) from local storage and Filen cloud.
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCleanup}
                className="rounded bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                Delete Files
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
