/**
 * Image Persistence Service
 *
 * Handles background downloading and storing of expiring image URLs to Convex Storage.
 * This service is NON-BLOCKING - it queues images for background processing and returns immediately.
 *
 * Flow:
 * 1. Metadata fetch completes with image URL
 * 2. queueImagePersistence() called - returns immediately
 * 3. Convex action downloads image server-side
 * 4. Uploads to Convex Storage
 * 5. Updates card with permanent Convex URL
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// =============================================================================
// CONFIGURATION
// =============================================================================

const MAX_CONCURRENT_UPLOADS = 2;

// Domains known to have expiring image URLs
const EXPIRING_DOMAINS = [
  'tiktokcdn.com',          // TikTok CDN (any subdomain)
  'scontent.cdninstagram.com',
  'cdn.discordapp.com/attachments',
  'pbs.twimg.com',          // Twitter/X images
];

// URL params that indicate expiring URLs
const EXPIRY_PARAMS = ['x-expires', 'expires', 'Expires'];

// =============================================================================
// CONVEX CLIENT
// =============================================================================

let convexClient: ConvexHttpClient | null = null;

function getConvexClient(): ConvexHttpClient | null {
  if (convexClient) return convexClient;

  const url = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (!url) {
    console.warn('[ImagePersistence] No Convex URL configured');
    return null;
  }

  convexClient = new ConvexHttpClient(url);
  return convexClient;
}

// =============================================================================
// URL DETECTION
// =============================================================================

/**
 * Check if a URL is already stored in Convex Storage
 */
export function isStoredImageUrl(url: string): boolean {
  if (!url) return false;
  // Convex storage URLs contain convex.cloud or convex.site
  return url.includes('convex.cloud') || url.includes('convex.site');
}

/**
 * Check if an image URL needs to be persisted (i.e., will expire)
 *
 * Detects expiring URLs by:
 * 1. Checking for expiry-related URL params (x-expires, expires, Expires)
 * 2. Checking if domain is known to serve expiring URLs
 */
export function needsPersistence(imageUrl: string): boolean {
  if (!imageUrl) return false;

  // Already stored in Convex - no need to persist again
  if (isStoredImageUrl(imageUrl)) {
    return false;
  }

  try {
    const url = new URL(imageUrl);

    // Check for expiry params in URL
    for (const param of EXPIRY_PARAMS) {
      if (url.searchParams.has(param)) {
        return true;
      }
    }

    // Check if domain is known to expire
    const hostname = url.hostname.toLowerCase();
    for (const domain of EXPIRING_DOMAINS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return true;
      }
      // Special case: check if domain is contained in hostname (e.g., p16-sign-sg.tiktokcdn.com)
      if (hostname.includes(domain.replace('.com', ''))) {
        return true;
      }
    }

    return false;
  } catch {
    // Invalid URL - don't try to persist
    return false;
  }
}

// =============================================================================
// QUEUE MANAGEMENT
// =============================================================================

interface QueueItem {
  cardId: string;
  imageUrl: string;
  retryCount: number;
}

// In-memory queue for background processing
const persistenceQueue: QueueItem[] = [];
let activeUploads = 0;

// Track processed items to avoid duplicates
const processedCards = new Set<string>();

/**
 * Queue an image for background persistence
 *
 * This function is NON-BLOCKING - it adds to the queue and returns immediately.
 * The actual download/upload happens in the background via Convex action.
 *
 * @param cardId - The card ID that will be updated with the new URL
 * @param imageUrl - The expiring image URL to download and store
 */
export function queueImagePersistence(cardId: string, imageUrl: string): void {
  // Skip if already processed or queued
  if (processedCards.has(cardId)) {
    console.log('[ImagePersistence] Skipping already processed card:', cardId);
    return;
  }

  // Skip if already in queue
  if (persistenceQueue.some(item => item.cardId === cardId)) {
    console.log('[ImagePersistence] Skipping already queued card:', cardId);
    return;
  }

  // Skip if URL doesn't need persistence
  if (!needsPersistence(imageUrl)) {
    console.log('[ImagePersistence] URL does not need persistence:', imageUrl.substring(0, 60));
    return;
  }

  console.log('[ImagePersistence] Queuing image for persistence:', cardId, imageUrl.substring(0, 60));

  persistenceQueue.push({
    cardId,
    imageUrl,
    retryCount: 0,
  });

  // Trigger queue processing (non-blocking)
  processQueue();
}

/**
 * Process the persistence queue with concurrency limit
 */
function processQueue(): void {
  while (activeUploads < MAX_CONCURRENT_UPLOADS && persistenceQueue.length > 0) {
    const item = persistenceQueue.shift();
    if (item && !processedCards.has(item.cardId)) {
      activeUploads++;
      processedCards.add(item.cardId);

      processItem(item)
        .catch(error => {
          console.error('[ImagePersistence] Error processing item:', error);
        })
        .finally(() => {
          activeUploads--;
          // Continue processing queue
          processQueue();
        });
    }
  }
}

// =============================================================================
// CONVEX PERSISTENCE
// =============================================================================

/**
 * Process a single queue item - call Convex action to download and store image
 */
async function processItem(item: QueueItem): Promise<void> {
  const { cardId, imageUrl } = item;

  console.log('[ImagePersistence] Processing:', cardId);

  const client = getConvexClient();
  if (!client) {
    console.warn('[ImagePersistence] No Convex client available');
    return;
  }

  try {
    // Call Convex action to persist the image
    // The action handles download, storage, and card update
    const result = await client.action(api.storage.persistImageFromUrl, {
      cardId: cardId as Id<"cards">,
      imageUrl,
    });

    if (result.success) {
      console.log('[ImagePersistence] Successfully persisted image:', cardId);
    } else {
      console.warn('[ImagePersistence] Failed to persist:', cardId, result.error);
    }
  } catch (error) {
    console.error('[ImagePersistence] Error calling Convex action:', cardId, error);
  }
}

// =============================================================================
// CLIENT-SIDE UPLOAD (for user-selected images)
// =============================================================================

/**
 * Upload a file to Convex storage and return the permanent URL
 *
 * @param cardId - The card ID (for logging)
 * @param blob - The image blob to upload
 * @param contentType - The MIME type of the image
 * @returns The permanent URL of the uploaded image, or null on failure
 */
export async function uploadToConvex(
  cardId: string,
  blob: Blob,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _contentType: string
): Promise<string | null> {
  const client = getConvexClient();
  if (!client) {
    console.error('[ImagePersistence] No Convex client available');
    return null;
  }

  try {
    // Get upload URL from Convex
    const uploadUrl = await client.mutation(api.storage.generateUploadUrl, {});

    // Upload the blob to Convex storage
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': blob.type },
      body: blob,
    });

    if (!response.ok) {
      console.error('[ImagePersistence] Upload failed:', response.status);
      return null;
    }

    // Get the storage ID from the response
    const { storageId } = await response.json();

    // Get the permanent URL
    const permanentUrl = await client.query(api.storage.getUrl, { storageId });

    console.log('[ImagePersistence] Uploaded to Convex:', cardId, permanentUrl?.substring(0, 60));

    return permanentUrl;
  } catch (error) {
    console.error('[ImagePersistence] Upload error:', error);
    return null;
  }
}

// Legacy export name for compatibility
export const uploadToSupabase = uploadToConvex;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get current queue status (for debugging)
 */
export function getQueueStatus() {
  return {
    queueLength: persistenceQueue.length,
    activeUploads,
    processedCount: processedCards.size,
  };
}

/**
 * Clear processed cards cache (useful for retrying failed items)
 */
export function clearProcessedCache(): void {
  processedCards.clear();
}
