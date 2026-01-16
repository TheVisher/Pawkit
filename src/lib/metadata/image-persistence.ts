/**
 * Image Persistence Service
 *
 * Handles background downloading and storing of expiring image URLs to Supabase Storage.
 * This service is NON-BLOCKING - it queues images for background processing and returns immediately.
 *
 * Flow:
 * 1. Metadata fetch completes with image URL
 * 2. queueImagePersistence() called - returns immediately
 * 3. Background worker downloads image (10s timeout)
 * 4. Uploads to Supabase Storage
 * 5. Updates card with permanent Supabase URL
 */

import { getClient } from '@/lib/supabase/client';
import { db } from '@/lib/db';
import { addToQueue, triggerSync } from '@/lib/services/sync-queue';

// =============================================================================
// CONFIGURATION
// =============================================================================

const BUCKET_NAME = 'card-images';
const DOWNLOAD_TIMEOUT_MS = 10000; // 10 seconds
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
// URL DETECTION
// =============================================================================

/**
 * Check if a URL is already stored in Supabase Storage
 */
export function isStoredImageUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('supabase.co/storage');
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

  // Already stored in Supabase - no need to persist again
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
 * The actual download/upload happens in the background.
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
// DOWNLOAD & UPLOAD
// =============================================================================

/**
 * Process a single queue item - download image and upload to Supabase
 */
async function processItem(item: QueueItem): Promise<void> {
  const { cardId, imageUrl } = item;

  console.log('[ImagePersistence] Processing:', cardId);

  try {
    // Download the image with timeout
    const imageData = await downloadImage(imageUrl);
    if (!imageData) {
      console.warn('[ImagePersistence] Failed to download image:', cardId);
      return;
    }

    // Upload to Supabase Storage
    const storedUrl = await uploadToSupabase(cardId, imageData.blob, imageData.contentType);
    if (!storedUrl) {
      console.warn('[ImagePersistence] Failed to upload to Supabase:', cardId);
      return;
    }

    // Update card with new permanent URL
    await updateCardImage(cardId, storedUrl);

    console.log('[ImagePersistence] Successfully persisted image:', cardId, storedUrl.substring(0, 80));
  } catch (error) {
    console.error('[ImagePersistence] Error processing:', cardId, error);
  }
}

/**
 * Download an image with timeout
 */
async function downloadImage(url: string): Promise<{ blob: Blob; contentType: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('[ImagePersistence] Download failed with status:', response.status);
      return null;
    }

    const blob = await response.blob();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return { blob, contentType };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[ImagePersistence] Download timed out');
    } else {
      console.error('[ImagePersistence] Download error:', error);
    }
    return null;
  }
}

/**
 * Upload image to Supabase Storage
 *
 * @param cardId - The card ID (used for filename generation)
 * @param blob - The image blob to upload
 * @param contentType - The MIME type of the image
 * @returns The public URL of the uploaded image, or null on failure
 */
export async function uploadToSupabase(
  cardId: string,
  blob: Blob,
  contentType: string
): Promise<string | null> {
  try {
    const supabase = getClient();

    // Generate filename from cardId and content hash
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');

    // Determine file extension from content type
    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg';
    const filename = `${cardId}-${hash}.${ext}`;

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, blob, {
        contentType,
        cacheControl: '31536000', // 1 year cache
        upsert: true, // Overwrite if exists
      });

    if (error) {
      console.error('[ImagePersistence] Supabase upload error:', error);
      return null;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    return urlData.publicUrl;
  } catch (error) {
    console.error('[ImagePersistence] Upload error:', error);
    return null;
  }
}

/**
 * Update card with new permanent image URL
 */
async function updateCardImage(cardId: string, newImageUrl: string): Promise<void> {
  try {
    // Get current card to preserve other fields
    const card = await db.cards.get(cardId);
    if (!card) {
      console.warn('[ImagePersistence] Card not found:', cardId);
      return;
    }

    // Update in Dexie (local-first)
    await db.cards.update(cardId, {
      image: newImageUrl,
      _synced: false,
      _lastModified: new Date(),
    });

    // Queue for server sync (skip conflict check - image URL is additive, not destructive)
    await addToQueue('card', cardId, 'update', { image: newImageUrl }, { skipConflictCheck: true });

    // Trigger sync to push update to server
    triggerSync();

    console.log('[ImagePersistence] Updated card with persisted image:', cardId);
  } catch (error) {
    console.error('[ImagePersistence] Error updating card:', error);
  }
}

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
