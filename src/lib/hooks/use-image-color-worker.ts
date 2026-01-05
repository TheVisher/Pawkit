'use client';

/**
 * Image Color Worker Hook
 *
 * Singleton manager for the image processing Web Worker.
 * Provides async API for extracting dominant color + aspect ratio from images.
 *
 * Usage:
 * const { extractImageData } = useImageColorWorker();
 * const result = await extractImageData(cardId, imageUrl);
 */

import { useCallback, useEffect, useRef } from 'react';

interface ImageProcessResponse {
  id: string;
  dominantColor?: string;
  aspectRatio?: number;
  error?: boolean;
}

interface PendingRequest {
  resolve: (result: ImageProcessResponse) => void;
  reject: (error: Error) => void;
}

// Singleton worker instance (shared across all hook consumers)
let workerInstance: Worker | null = null;
let pendingRequests: Map<string, PendingRequest> = new Map();
let initializationPromise: Promise<Worker | null> | null = null;
let workerFailed = false; // Track if worker initialization failed

/**
 * Initialize the worker singleton
 * Uses dynamic import to work with Next.js bundling
 * Returns null if worker fails to initialize (graceful degradation)
 */
async function getWorker(): Promise<Worker | null> {
  // If worker previously failed, don't retry (avoid spamming errors)
  if (workerFailed) {
    return null;
  }

  // Return existing instance
  if (workerInstance) {
    return workerInstance;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = new Promise<Worker | null>((resolve) => {
    try {
      // Create worker using dynamic URL
      // Next.js/Turbopack may have issues with this - we handle gracefully
      const worker = new Worker(
        new URL('../workers/image-worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Set up error handler BEFORE the worker starts
      // This catches initialization errors
      worker.onerror = (error) => {
        // Log but don't crash - worker will be disabled
        console.warn('[ImageWorker] Worker failed to initialize, color extraction disabled:', error.message || 'Unknown error');
        workerFailed = true;
        workerInstance = null;

        // Resolve pending requests with null (graceful failure)
        for (const [id, pending] of pendingRequests) {
          pending.resolve({ id, error: true });
          pendingRequests.delete(id);
        }

        resolve(null);
      };

      // Handle responses
      worker.onmessage = (e: MessageEvent<ImageProcessResponse>) => {
        const { id } = e.data;
        const pending = pendingRequests.get(id);
        if (pending) {
          pending.resolve(e.data);
          pendingRequests.delete(id);
        }
      };

      // Give the worker a moment to initialize, then resolve
      // If onerror fires first, this won't run (already resolved)
      setTimeout(() => {
        if (!workerFailed) {
          workerInstance = worker;
          resolve(worker);
        }
      }, 100);
    } catch (error) {
      console.warn('[ImageWorker] Failed to create worker:', error);
      workerFailed = true;
      resolve(null);
    }
  });

  return initializationPromise;
}

/**
 * Hook to interact with the image processing worker
 */
export function useImageColorWorker() {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Extract dominant color and aspect ratio from an image
   * Returns null if extraction fails (CORS, network error, worker unavailable, etc.)
   */
  const extractImageData = useCallback(
    async (
      cardId: string,
      imageSrc: string
    ): Promise<{ dominantColor?: string; aspectRatio?: number } | null> => {
      try {
        const worker = await getWorker();

        // Worker unavailable (failed to initialize) - graceful degradation
        if (!worker) {
          return null;
        }

        return new Promise((resolve) => {
          // Store the pending request
          pendingRequests.set(cardId, {
            resolve: (result) => {
              if (!mountedRef.current) {
                resolve(null);
                return;
              }

              if (result.error) {
                resolve(null);
              } else {
                resolve({
                  dominantColor: result.dominantColor,
                  aspectRatio: result.aspectRatio,
                });
              }
            },
            reject: () => resolve(null), // Convert rejections to null
          });

          // Send request to worker
          worker.postMessage({ id: cardId, imageSrc });

          // Timeout after 10 seconds
          setTimeout(() => {
            if (pendingRequests.has(cardId)) {
              pendingRequests.delete(cardId);
              resolve(null); // Silent failure on timeout
            }
          }, 10000);
        });
      } catch (error) {
        // Silently fail - color extraction is optional enhancement
        return null;
      }
    },
    []
  );

  /**
   * Process multiple images in batch
   * Useful for backfilling existing cards without dominantColor
   */
  const extractBatch = useCallback(
    async (
      items: Array<{ cardId: string; imageSrc: string }>
    ): Promise<Map<string, { dominantColor?: string; aspectRatio?: number }>> => {
      const results = new Map<string, { dominantColor?: string; aspectRatio?: number }>();

      // Process in parallel (worker handles sequentially internally)
      const promises = items.map(async ({ cardId, imageSrc }) => {
        const result = await extractImageData(cardId, imageSrc);
        if (result) {
          results.set(cardId, result);
        }
      });

      await Promise.all(promises);
      return results;
    },
    [extractImageData]
  );

  return {
    extractImageData,
    extractBatch,
  };
}

/**
 * Utility to check if the worker is supported in this environment
 */
export function isImageWorkerSupported(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof createImageBitmap !== 'undefined'
  );
}
