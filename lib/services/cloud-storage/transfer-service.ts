/**
 * Cloud Storage Transfer Service
 *
 * Handles file transfers between different cloud providers.
 * Downloads from source provider and uploads to target provider.
 */

import { cloudStorage } from "./cloud-storage-manager";
import type { CloudFile, CloudProviderId, CloudUploadResult } from "./types";

export interface TransferOptions {
  sourceProvider: CloudProviderId;
  sourceFile: CloudFile;
  targetProvider: CloudProviderId;
  targetPath: string;
  onProgress?: (percent: number, status: string) => void;
}

export interface TransferResult {
  success: boolean;
  cloudId?: string;
  path?: string;
  error?: string;
}

/**
 * Transfer a file from one cloud provider to another.
 * Downloads the file from source and uploads to target.
 */
export async function transferFile(options: TransferOptions): Promise<TransferResult> {
  const { sourceProvider, sourceFile, targetProvider, targetPath, onProgress } = options;

  try {
    // Get source provider
    const source = cloudStorage.getProvider(sourceProvider);
    if (!source) {
      return { success: false, error: `Source provider '${sourceProvider}' not found` };
    }

    // Get target provider
    const target = cloudStorage.getProvider(targetProvider);
    if (!target) {
      return { success: false, error: `Target provider '${targetProvider}' not found` };
    }

    // Can't transfer to the same provider (for now)
    if (sourceProvider === targetProvider) {
      return { success: false, error: "Cannot transfer to the same provider" };
    }

    // Step 1: Download from source
    onProgress?.(10, "Downloading from source...");
    let blob: Blob;
    try {
      blob = await source.downloadFile(sourceFile.cloudId);
    } catch (downloadErr) {
      return {
        success: false,
        error: `Failed to download: ${downloadErr instanceof Error ? downloadErr.message : "Unknown error"}`,
      };
    }

    onProgress?.(50, "Downloaded, uploading to target...");

    // Step 2: Upload to target
    let uploadResult: CloudUploadResult;
    try {
      uploadResult = await target.uploadFile(blob, sourceFile.name, targetPath);
    } catch (uploadErr) {
      return {
        success: false,
        error: `Failed to upload: ${uploadErr instanceof Error ? uploadErr.message : "Unknown error"}`,
      };
    }

    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error || "Upload failed" };
    }

    onProgress?.(100, "Transfer complete");

    return {
      success: true,
      cloudId: uploadResult.cloudId,
      path: uploadResult.path,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Transfer failed",
    };
  }
}

/**
 * Transfer multiple files from one provider to another.
 * Processes files sequentially to avoid overwhelming the APIs.
 */
export async function transferFiles(
  files: CloudFile[],
  sourceProvider: CloudProviderId,
  targetProvider: CloudProviderId,
  targetPath: string,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<{ successful: number; failed: number; errors: string[] }> {
  const errors: string[] = [];
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length, file.name);

    const result = await transferFile({
      sourceProvider,
      sourceFile: file,
      targetProvider,
      targetPath,
    });

    if (result.success) {
      successful++;
    } else {
      failed++;
      errors.push(`${file.name}: ${result.error}`);
    }
  }

  return { successful, failed, errors };
}
