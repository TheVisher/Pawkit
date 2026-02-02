/**
 * Shared utilities for detecting expiring image URLs.
 *
 * Used by both cards.ts (extension cards) and metadata.ts (scraped cards)
 * to determine when images should be persisted to Convex storage.
 *
 * NOTE: src/lib/metadata/image-persistence.ts has its own copy of the domain
 * list for client-side use. This duplication is an explicit accepted tradeoff -
 * the client copy is rarely used (server-side persistence is the primary path),
 * and sharing code between Convex server and client would add complexity.
 * If the domain list changes, both locations need updating.
 */

// Domains known to have expiring image URLs
export const EXPIRING_IMAGE_DOMAINS = [
  "tiktokcdn.com",
  "tiktokcdn-us.com",
  "tiktokv.com",
  "fbcdn.net", // Facebook CDN
  "cdninstagram.com", // Instagram CDN
  "twimg.com", // Twitter/X images (some expire)
  "discordapp.com",
  "discord.com",
  "redd.it", // Reddit short URLs
  "redditmedia.com", // Reddit media CDN
  "preview.redd.it", // Reddit preview images
];

// URL params that indicate expiring URLs
export const EXPIRY_URL_PARAMS = ["x-expires", "expires", "Expires", "_nc_exp"];

/**
 * Check if an image URL needs to be persisted (i.e., will expire).
 * Returns true if the URL is from a known expiring domain or has expiry params.
 */
export function needsImagePersistence(imageUrl: string | null | undefined): boolean {
  if (!imageUrl) return false;

  // Already stored in Convex storage - no need to persist again
  if (imageUrl.includes("convex.cloud") || imageUrl.includes("convex.site")) {
    return false;
  }

  try {
    const url = new URL(imageUrl);

    // Check for expiry params in URL
    for (const param of EXPIRY_URL_PARAMS) {
      if (url.searchParams.has(param)) {
        return true;
      }
    }

    // Check if domain is known to have expiring URLs
    const hostname = url.hostname.toLowerCase();
    for (const domain of EXPIRING_IMAGE_DOMAINS) {
      if (hostname === domain || hostname.endsWith("." + domain)) {
        return true;
      }
    }

    return false;
  } catch {
    // Invalid URL - don't try to persist
    return false;
  }
}
