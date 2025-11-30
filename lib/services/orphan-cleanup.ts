/**
 * Orphan File Cleanup Utility
 *
 * Detects and removes orphaned files that are consuming storage but
 * are no longer referenced by any cards.
 *
 * Orphan conditions:
 * 1. File has `deleted === true` (soft-deleted but never purged)
 * 2. File has `cardId` but that card doesn't exist or is deleted
 * 3. File was created for a file card but that card no longer exists or is deleted
 */

import { localDb } from "./local-storage";
import { StoredFile } from "@/lib/types";
import { filenService } from "./filen-service";
import { useConnectorStore } from "@/lib/stores/connector-store";

export interface OrphanedFile {
  id: string;
  filename: string;
  size: number;
  filenUuid?: string;
  reason: "soft-deleted" | "missing-card" | "missing-file-card";
  cardId?: string;
}

export interface OrphanDetectionResult {
  orphans: OrphanedFile[];
  totalSize: number;
  totalCount: number;
}

export interface CleanupResult {
  deleted: number;
  freedBytes: number;
  filenDeleted: number;
  errors: string[];
}

/**
 * Find all orphaned files in IndexedDB
 */
export async function findOrphanedFiles(): Promise<OrphanDetectionResult> {
  const orphans: OrphanedFile[] = [];

  // Get all files from IndexedDB (including deleted ones)
  const allFiles = await localDb.getAllFiles(true); // includeDeleted = true

  // Get all cards (including deleted ones to check references)
  const allCards = await localDb.getAllCards(true); // includeDeleted = true

  // Create maps for quick lookup
  const cardMap = new Map(allCards.map(card => [card.id, card]));
  const activeCardIds = new Set(
    allCards.filter(card => card.deleted !== true).map(card => card.id)
  );
  const fileCardFileIds = new Set(
    allCards
      .filter(card => card.isFileCard && card.fileId && card.deleted !== true)
      .map(card => card.fileId!)
  );

  for (const file of allFiles) {
    let isOrphan = false;
    let reason: OrphanedFile["reason"] | null = null;

    // Check 1: Soft-deleted files that were never purged
    if (file.deleted === true) {
      isOrphan = true;
      reason = "soft-deleted";
    }

    // Check 2: File has cardId but card doesn't exist or is deleted
    else if (file.cardId) {
      const card = cardMap.get(file.cardId);
      if (!card || card.deleted === true) {
        isOrphan = true;
        reason = "missing-card";
      }
    }

    // Check 3: Standalone file (no cardId) - check if it's referenced by a file card
    else if (!file.cardId) {
      // A standalone file should be referenced by a file card
      // If no active file card references it, it's orphaned
      if (!fileCardFileIds.has(file.id)) {
        // Double-check: maybe this file was uploaded but never linked
        // Only consider it orphaned if it's older than 1 hour (to avoid race conditions)
        const fileAge = Date.now() - new Date(file.createdAt).getTime();
        const oneHour = 60 * 60 * 1000;

        if (fileAge > oneHour) {
          isOrphan = true;
          reason = "missing-file-card";
        }
      }
    }

    if (isOrphan && reason) {
      orphans.push({
        id: file.id,
        filename: file.filename,
        size: file.size,
        filenUuid: file.filenUuid,
        reason,
        cardId: file.cardId,
      });
    }
  }

  const totalSize = orphans.reduce((sum, f) => sum + f.size, 0);

  return {
    orphans,
    totalSize,
    totalCount: orphans.length,
  };
}

/**
 * Delete all orphaned files from IndexedDB and Filen
 */
export async function deleteOrphanedFiles(
  onProgress?: (current: number, total: number) => void
): Promise<CleanupResult> {
  const { orphans } = await findOrphanedFiles();

  let deleted = 0;
  let freedBytes = 0;
  let filenDeleted = 0;
  const errors: string[] = [];

  // Check if Filen is connected
  const { filen } = useConnectorStore.getState();
  const filenConnected = filen.connected;

  for (let i = 0; i < orphans.length; i++) {
    const orphan = orphans[i];

    try {
      // Report progress
      onProgress?.(i + 1, orphans.length);

      // Delete from Filen if connected and file has UUID
      if (filenConnected && orphan.filenUuid) {
        try {
          await filenService.deleteFile(orphan.filenUuid);
          filenDeleted++;
          console.warn(`[OrphanCleanup] Deleted from Filen: ${orphan.filename} (${orphan.filenUuid})`);
        } catch (filenError) {
          // Log but continue - file might already be deleted from Filen
          console.warn(`[OrphanCleanup] Filen delete failed for ${orphan.filename}:`, filenError);
        }
      }

      // Delete from IndexedDB
      await localDb.permanentlyDeleteFile(orphan.id);

      deleted++;
      freedBytes += orphan.size;

      console.warn(`[OrphanCleanup] Deleted: ${orphan.filename} (${formatBytes(orphan.size)}) - reason: ${orphan.reason}`);
    } catch (error) {
      const errorMsg = `Failed to delete ${orphan.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[OrphanCleanup] ${errorMsg}`);
    }
  }

  console.warn(`[OrphanCleanup] Complete: ${deleted} files deleted, ${formatBytes(freedBytes)} freed, ${filenDeleted} removed from Filen`);

  return {
    deleted,
    freedBytes,
    filenDeleted,
    errors,
  };
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(1)} ${units[i]}`;
}

/**
 * Get orphan summary without full file list (for UI display)
 */
export async function getOrphanSummary(): Promise<{
  count: number;
  totalSize: number;
  formattedSize: string;
}> {
  const { totalCount, totalSize } = await findOrphanedFiles();
  return {
    count: totalCount,
    totalSize,
    formattedSize: formatBytes(totalSize),
  };
}
