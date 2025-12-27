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
