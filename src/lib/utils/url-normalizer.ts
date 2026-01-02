/**
 * URL Normalizer
 * Normalizes URLs for duplicate detection
 */

// Common tracking parameters to remove
const TRACKING_PARAMS = [
  // Google Analytics
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  // Facebook
  'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_source', 'fb_ref',
  // Twitter
  'twclid',
  // Microsoft
  'msclkid',
  // General tracking
  'ref', 'source', 'ref_src', 'ref_url',
  // Social
  's', 'share', 'si',
  // E-commerce
  'affiliate', 'aff_id', 'partner',
  // Analytics
  'mc_cid', 'mc_eid', '_ga', 'gclid',
  // Misc
  'ncid', 'ocid', 'cmpid',
];

/**
 * Normalize a URL for comparison
 * Removes tracking params, trailing slashes, www prefix, etc.
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Lowercase hostname
    let hostname = parsed.hostname.toLowerCase();

    // Remove www prefix
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }

    // Remove tracking parameters
    for (const param of TRACKING_PARAMS) {
      parsed.searchParams.delete(param);
    }

    // Sort remaining params for consistent comparison
    const sortedParams = new URLSearchParams();
    const entries = Array.from(parsed.searchParams.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    for (const [key, value] of entries) {
      sortedParams.append(key, value);
    }

    // Remove trailing slash from pathname
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    // Rebuild URL
    const searchString = sortedParams.toString();
    const normalizedUrl = `${parsed.protocol}//${hostname}${pathname}${
      searchString ? `?${searchString}` : ''
    }${parsed.hash}`;

    return normalizedUrl;
  } catch {
    // If URL parsing fails, return lowercase trimmed version
    return url.toLowerCase().trim();
  }
}

/**
 * Check if two URLs are duplicates
 */
export function areUrlsDuplicates(url1: string, url2: string): boolean {
  return normalizeUrl(url1) === normalizeUrl(url2);
}

/**
 * Find duplicate URL in a list
 * Returns the first matching URL or null
 */
export function findDuplicateUrl(
  targetUrl: string,
  existingUrls: string[]
): string | null {
  const normalizedTarget = normalizeUrl(targetUrl);

  for (const url of existingUrls) {
    if (normalizeUrl(url) === normalizedTarget) {
      return url;
    }
  }

  return null;
}

// =============================================================================
// IMAGE URL DETECTION AND CONVERSION
// =============================================================================

/**
 * Common image file extensions
 */
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];

/**
 * Check if a URL points to an image file
 */
export function isImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    // Check file extension
    if (IMAGE_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
      return true;
    }

    // Check common image CDN patterns
    if (urlObj.hostname.includes('i.ytimg.com')) return true;
    if (urlObj.hostname.includes('img.youtube.com')) return true;
    if (urlObj.hostname.includes('pbs.twimg.com')) return true;
    if (urlObj.hostname.includes('cdn.discordapp.com') && pathname.includes('/attachments/')) return true;
    if (urlObj.hostname.includes('i.imgur.com')) return true;
    if (urlObj.hostname.includes('images.unsplash.com')) return true;
    if (urlObj.hostname.includes('preview.redd.it')) return true;
    if (urlObj.hostname.includes('i.redd.it')) return true;

    return false;
  } catch {
    return false;
  }
}

interface ImageToPageResult {
  url: string;
  wasConverted: boolean;
  originalType: 'page' | 'image' | 'video-thumbnail';
}

/**
 * Try to convert an image/thumbnail URL to its source page URL
 *
 * For example:
 * - YouTube thumbnail → YouTube video URL
 * - Vimeo thumbnail → Vimeo video URL
 */
export function convertImageUrlToPageUrl(url: string): ImageToPageResult {
  try {
    const urlObj = new URL(url);

    // YouTube thumbnail → video URL
    // Patterns:
    // - https://i.ytimg.com/vi/VIDEO_ID/sddefault.jpg
    // - https://i.ytimg.com/vi/VIDEO_ID/maxresdefault.jpg
    // - https://img.youtube.com/vi/VIDEO_ID/0.jpg
    if (urlObj.hostname === 'i.ytimg.com' || urlObj.hostname === 'img.youtube.com') {
      const match = urlObj.pathname.match(/\/vi\/([a-zA-Z0-9_-]+)\//);
      if (match) {
        return {
          url: `https://www.youtube.com/watch?v=${match[1]}`,
          wasConverted: true,
          originalType: 'video-thumbnail',
        };
      }
    }

    // Vimeo thumbnail → video URL
    // Pattern: https://i.vimeocdn.com/video/VIDEO_ID_...
    if (urlObj.hostname === 'i.vimeocdn.com') {
      const match = urlObj.pathname.match(/\/video\/(\d+)/);
      if (match) {
        return {
          url: `https://vimeo.com/${match[1]}`,
          wasConverted: true,
          originalType: 'video-thumbnail',
        };
      }
    }

    // Generic image URL detection - can't convert but flag it
    if (isImageUrl(url)) {
      return {
        url,
        wasConverted: false,
        originalType: 'image',
      };
    }

    // Not an image URL, return as-is
    return {
      url,
      wasConverted: false,
      originalType: 'page',
    };
  } catch {
    return {
      url,
      wasConverted: false,
      originalType: 'page',
    };
  }
}

/**
 * Smart URL processor for dropped URLs
 * Converts image URLs to page URLs where possible
 */
export function processDroppedUrl(url: string): { url: string; warning?: string } {
  const result = convertImageUrlToPageUrl(url);

  if (result.wasConverted) {
    console.log(`[URL] Converted ${result.originalType} to page URL:`, url, '→', result.url);
    return { url: result.url };
  }

  if (result.originalType === 'image') {
    console.warn(`[URL] Dropped URL is an image, could not find source page:`, url);
    return {
      url,
      warning: 'This appears to be an image URL. The saved card will link to the image, not the webpage it came from.',
    };
  }

  return { url };
}
