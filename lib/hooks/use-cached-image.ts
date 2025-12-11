'use client';

import { useState, useEffect, useRef } from 'react';
import { imageCache } from '@/lib/services/image-cache';

/**
 * Hook to load images from cache or fetch and cache them
 *
 * Usage:
 * const { src, isLoading, error } = useCachedImage(card.image);
 *
 * Features:
 * - Returns cached blob URL instantly if available
 * - Falls back to fetching and caching if not cached
 * - Falls back to original URL if caching fails
 * - Handles cleanup of blob URLs on unmount
 */
export function useCachedImage(imageUrl: string | null | undefined) {
  const [src, setSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const currentUrlRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    // Reset state when URL changes
    if (imageUrl !== currentUrlRef.current) {
      setSrc(null);
      setIsLoading(true);
      setError(null);
      currentUrlRef.current = imageUrl || null;
    }

    if (!imageUrl) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadImage() {
      try {
        const cachedSrc = await imageCache.getOrFetch(imageUrl);

        if (!cancelled && mountedRef.current) {
          setSrc(cachedSrc);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled && mountedRef.current) {
          setError(err as Error);
          setIsLoading(false);
          // Fallback to original URL if caching fails
          setSrc(imageUrl);
        }
      }
    }

    loadImage();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      // Note: We don't revoke blob URLs here because they may be used
      // by other components showing the same image. The cache service
      // handles cleanup during eviction.
    };
  }, [imageUrl]);

  return { src, isLoading, error };
}

/**
 * Hook to preload multiple images in background
 * Useful when you know which images will be needed soon
 */
export function usePreloadImages(imageUrls: (string | null | undefined)[]) {
  useEffect(() => {
    const validUrls = imageUrls.filter((url): url is string => !!url);
    if (validUrls.length === 0) return;

    // Use requestIdleCallback to avoid blocking the UI
    if (typeof requestIdleCallback !== 'undefined') {
      const handle = requestIdleCallback(() => {
        imageCache.preCacheImages(validUrls);
      }, { timeout: 5000 });

      return () => cancelIdleCallback(handle);
    } else {
      const timeout = setTimeout(() => {
        imageCache.preCacheImages(validUrls);
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [imageUrls.join(',')]); // Dependency on joined string to avoid array reference issues
}
