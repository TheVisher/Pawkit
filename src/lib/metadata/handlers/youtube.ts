/**
 * YouTube Metadata Handler
 * Extracts metadata from YouTube videos using oEmbed API (primary) with fallback to scraping
 */

import type { MetadataResult } from '../types';

// oEmbed API timeout (5 seconds as specified)
const OEMBED_TIMEOUT = 5000;

// HEAD request timeout for thumbnail validation
const HEAD_TIMEOUT = 3000;

// YouTube thumbnail URL base (using i.ytimg.com for better reliability)
const THUMBNAIL_BASE = 'https://i.ytimg.com/vi';

// Thumbnail quality tiers (try in order)
const THUMBNAIL_QUALITIES = ['maxresdefault', 'sddefault', 'hqdefault'] as const;

// YouTube favicon URL
const YOUTUBE_FAVICON = 'https://www.youtube.com/favicon.ico';

/**
 * oEmbed response structure from YouTube
 */
interface YouTubeOEmbedResponse {
  title?: string;
  author_name?: string;
  author_url?: string;
  type?: string;
  height?: number;
  width?: number;
  version?: string;
  provider_name?: string;
  provider_url?: string;
  thumbnail_height?: number;
  thumbnail_width?: number;
  thumbnail_url?: string;
  html?: string;
}

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - youtube.com/watch?v=VIDEO_ID
 * - youtube.com/shorts/VIDEO_ID
 * - youtube.com/embed/VIDEO_ID
 * - youtu.be/VIDEO_ID
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Handle youtube.com URLs
    if (hostname.includes('youtube.com')) {
      // Standard watch URL: youtube.com/watch?v=VIDEO_ID
      const videoId = urlObj.searchParams.get('v');
      if (videoId) return videoId;

      // Shorts URL: youtube.com/shorts/VIDEO_ID
      const shortsMatch = urlObj.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) return shortsMatch[1];

      // Embed URL: youtube.com/embed/VIDEO_ID
      const embedMatch = urlObj.pathname.match(/^\/embed\/([a-zA-Z0-9_-]+)/);
      if (embedMatch) return embedMatch[1];
    }

    // Handle youtu.be URLs: youtu.be/VIDEO_ID
    if (hostname === 'youtu.be') {
      const videoId = urlObj.pathname.slice(1).split('/')[0];
      if (videoId) return videoId;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname.includes('youtube.com') || hostname === 'youtu.be';
  } catch {
    return false;
  }
}

/**
 * Validate a thumbnail URL exists using HEAD request
 * Returns the URL if valid, null otherwise
 */
async function validateThumbnail(thumbnailUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEAD_TIMEOUT);

    const response = await fetch(thumbnailUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    // Check content type is an image
    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      return null;
    }

    // YouTube returns a placeholder image for non-existent maxresdefault
    // Check content-length to detect this (placeholder is usually very small)
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) === 0) {
      return null;
    }

    return thumbnailUrl;
  } catch {
    return null;
  }
}

/**
 * Find the best available thumbnail for a video
 * Tries maxresdefault -> sddefault -> hqdefault
 */
async function findBestThumbnail(videoId: string): Promise<string | null> {
  for (const quality of THUMBNAIL_QUALITIES) {
    const thumbnailUrl = `${THUMBNAIL_BASE}/${videoId}/${quality}.jpg`;
    const validated = await validateThumbnail(thumbnailUrl);
    if (validated) {
      return validated;
    }
  }

  // Fallback: return hqdefault without validation (always exists)
  return `${THUMBNAIL_BASE}/${videoId}/hqdefault.jpg`;
}

/**
 * Fetch metadata using YouTube oEmbed API (primary method - FAST)
 */
async function fetchOEmbedMetadata(
  url: string
): Promise<{ title: string | null; author: string | null } | null> {
  try {
    const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OEMBED_TIMEOUT);

    const response = await fetch(oEmbedUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data: YouTubeOEmbedResponse = await response.json();

    return {
      title: data.title || null,
      author: data.author_name || null,
    };
  } catch (error) {
    console.log(
      '[YouTube oEmbed] Failed:',
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * YouTube metadata handler
 * Primary method: oEmbed API (fast, reliable)
 * Returns metadata in the standard MetadataResult format
 */
export async function handleYouTube(url: string): Promise<MetadataResult> {
  // Extract video ID
  const videoId = extractYouTubeVideoId(url);

  if (!videoId) {
    // Not a valid YouTube URL, return minimal result
    return {
      title: null,
      description: null,
      image: null,
      images: null,
      favicon: YOUTUBE_FAVICON,
      domain: 'youtube.com',
      source: 'youtube-oembed',
      shouldPersistImage: false,
    };
  }

  // Run oEmbed and thumbnail fetch in parallel for speed
  const [oEmbedResult, thumbnail] = await Promise.all([
    fetchOEmbedMetadata(url),
    findBestThumbnail(videoId),
  ]);

  // Build description from author name
  const description = oEmbedResult?.author ? `by ${oEmbedResult.author}` : null;

  // Determine source based on what succeeded
  const source = oEmbedResult ? 'youtube-oembed' : 'youtube-scrape';

  // Build title (fallback to video ID if oEmbed failed)
  const title = oEmbedResult?.title || `YouTube Video - ${videoId}`;

  return {
    title,
    description,
    image: thumbnail,
    images: thumbnail ? [thumbnail] : null,
    favicon: YOUTUBE_FAVICON,
    domain: 'youtube.com',
    source,
    // YouTube thumbnail URLs are stable CDN URLs that don't expire
    // No need to persist them to our storage
    shouldPersistImage: false,
  };
}

// Default export for handler registration
export default handleYouTube;
