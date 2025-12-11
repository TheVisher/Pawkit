/**
 * IMAGE CACHE SERVICE
 *
 * Caches card thumbnail images in IndexedDB to avoid re-downloading
 * on every page load. This dramatically improves load times on slow
 * networks and enables offline viewing of previously seen images.
 *
 * Features:
 * - Normalizes Supabase URLs (strips auth tokens) for consistent caching
 * - LRU eviction when cache exceeds size limit (default 500MB)
 * - Background pre-caching of card images
 * - Blob URL management to prevent memory leaks
 */

import { localDb } from '@/lib/services/local-storage';

// Track blob URLs for cleanup
const activeBlobUrls = new Map<string, string>();

class ImageCacheService {
  private readonly MAX_CACHE_SIZE_MB = 500;
  private readonly BATCH_SIZE = 5; // Number of images to fetch concurrently

  /**
   * Normalize URL by removing auth tokens and query params
   * Supabase URLs have token=xxx which changes, so we cache by base path
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove common auth-related query params
      parsed.searchParams.delete('token');
      parsed.searchParams.delete('t');
      // Keep the path and host, remove most query params
      // But keep transformation params like width/height
      const keysToKeep = ['width', 'height', 'quality', 'w', 'h', 'q'];
      const keysToRemove: string[] = [];
      parsed.searchParams.forEach((_, key) => {
        if (!keysToKeep.includes(key.toLowerCase())) {
          keysToRemove.push(key);
        }
      });
      keysToRemove.forEach(key => parsed.searchParams.delete(key));
      return parsed.toString();
    } catch {
      // If URL parsing fails, use as-is
      return url;
    }
  }

  /**
   * Get image from cache, returns blob URL if found
   */
  async get(imageUrl: string): Promise<string | null> {
    const normalizedId = this.normalizeUrl(imageUrl);

    // Check if we already have a blob URL for this
    const existingBlobUrl = activeBlobUrls.get(normalizedId);
    if (existingBlobUrl) {
      return existingBlobUrl;
    }

    try {
      const cached = await localDb.getCachedImage(normalizedId);
      if (!cached) return null;

      // Create blob URL
      const blobUrl = URL.createObjectURL(cached.blob);
      activeBlobUrls.set(normalizedId, blobUrl);

      return blobUrl;
    } catch (error) {
      console.warn('[ImageCache] Error getting cached image:', error);
      return null;
    }
  }

  /**
   * Cache an image from URL
   */
  async cacheFromUrl(imageUrl: string): Promise<string> {
    const normalizedId = this.normalizeUrl(imageUrl);

    // Check if already cached first
    const existing = await this.get(imageUrl);
    if (existing) return existing;

    try {
      // Fetch the image
      const response = await fetch(imageUrl, {
        mode: 'cors',
        credentials: 'omit', // Don't send cookies for cross-origin requests
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();
      const mimeType = blob.type || 'image/jpeg';

      // Store in IndexedDB
      await localDb.cacheImage(normalizedId, blob, mimeType);

      // Create and return blob URL
      const blobUrl = URL.createObjectURL(blob);
      activeBlobUrls.set(normalizedId, blobUrl);

      return blobUrl;
    } catch (error) {
      console.warn('[ImageCache] Error caching image:', error);
      // Return original URL as fallback
      return imageUrl;
    }
  }

  /**
   * Get cached image or fetch and cache it (main method to use)
   * Only caches Supabase images - external images have CORS issues
   */
  async getOrFetch(imageUrl: string): Promise<string> {
    // Only cache Supabase images - external images have CORS issues
    if (!imageUrl.includes('supabase.co/storage')) {
      return imageUrl;
    }

    // Try cache first
    const cached = await this.get(imageUrl);
    if (cached) return cached;

    // Not cached, fetch and cache it
    return this.cacheFromUrl(imageUrl);
  }

  /**
   * Check if image is cached without loading it
   */
  async isCached(imageUrl: string): Promise<boolean> {
    const normalizedId = this.normalizeUrl(imageUrl);
    return localDb.isImageCached(normalizedId);
  }

  /**
   * Pre-cache multiple images in background
   * Only caches Supabase images - external images have CORS issues
   */
  async preCacheImages(imageUrls: string[]): Promise<void> {
    if (!imageUrls.length) return;

    // Filter to only Supabase images (external images have CORS issues)
    const supabaseUrls = imageUrls.filter(url => url.includes('supabase.co/storage'));
    if (!supabaseUrls.length) {
      console.log('[ImageCache] No Supabase images to cache');
      return;
    }

    // Filter out already cached images
    const uncachedUrls: string[] = [];
    for (const url of supabaseUrls) {
      const isCached = await this.isCached(url);
      if (!isCached) {
        uncachedUrls.push(url);
      }
    }

    if (!uncachedUrls.length) {
      console.log('[ImageCache] All images already cached');
      return;
    }

    console.log(`[ImageCache] Pre-caching ${uncachedUrls.length} images in background`);

    // Process in batches to avoid overwhelming the connection
    for (let i = 0; i < uncachedUrls.length; i += this.BATCH_SIZE) {
      const batch = uncachedUrls.slice(i, i + this.BATCH_SIZE);

      // Use requestIdleCallback if available, otherwise setTimeout
      await new Promise<void>((resolve) => {
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(async () => {
            await Promise.allSettled(batch.map(url => this.cacheFromUrl(url)));
            resolve();
          }, { timeout: 10000 });
        } else {
          setTimeout(async () => {
            await Promise.allSettled(batch.map(url => this.cacheFromUrl(url)));
            resolve();
          }, 100);
        }
      });
    }

    console.log('[ImageCache] Pre-caching complete');

    // Check if we need to evict old entries
    await this.evictOldEntries();
  }

  /**
   * Get cache stats
   */
  async getStats(): Promise<{ count: number; totalSize: number; totalSizeMB: number }> {
    const stats = await localDb.getImageCacheStats();
    return {
      ...stats,
      totalSizeMB: Math.round(stats.totalSize / 1024 / 1024 * 100) / 100,
    };
  }

  /**
   * Clear old cache entries if needed (LRU eviction)
   */
  async evictOldEntries(maxSizeMB: number = this.MAX_CACHE_SIZE_MB): Promise<void> {
    const stats = await this.getStats();
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (stats.totalSize <= maxSizeBytes) {
      return; // Under limit, no eviction needed
    }

    console.log(`[ImageCache] Cache size ${stats.totalSizeMB}MB exceeds limit ${maxSizeMB}MB, evicting old entries`);

    // Get oldest images and delete until we're under the limit
    let currentSize = stats.totalSize;
    const targetSize = maxSizeBytes * 0.8; // Target 80% of limit after eviction

    while (currentSize > targetSize) {
      const oldest = await localDb.getOldestCachedImages(10);
      if (!oldest.length) break;

      for (const img of oldest) {
        await localDb.deleteCachedImage(img.id);
        // Clean up blob URL if exists
        const blobUrl = activeBlobUrls.get(img.id);
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
          activeBlobUrls.delete(img.id);
        }
        currentSize -= img.size;
        if (currentSize <= targetSize) break;
      }
    }

    const newStats = await this.getStats();
    console.log(`[ImageCache] Eviction complete, new size: ${newStats.totalSizeMB}MB`);
  }

  /**
   * Clear all cached images
   */
  async clear(): Promise<void> {
    // Revoke all blob URLs
    activeBlobUrls.forEach((blobUrl) => {
      URL.revokeObjectURL(blobUrl);
    });
    activeBlobUrls.clear();

    // Clear IndexedDB cache
    await localDb.clearImageCache();
    console.log('[ImageCache] Cache cleared');
  }

  /**
   * Revoke a specific blob URL (call when component unmounts)
   */
  revokeBlobUrl(imageUrl: string): void {
    const normalizedId = this.normalizeUrl(imageUrl);
    const blobUrl = activeBlobUrls.get(normalizedId);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      activeBlobUrls.delete(normalizedId);
    }
  }

  /**
   * Get count of active blob URLs (for debugging)
   */
  getActiveBlobUrlCount(): number {
    return activeBlobUrls.size;
  }
}

// Export singleton instance
export const imageCache = new ImageCacheService();
