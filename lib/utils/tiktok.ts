/**
 * Extract TikTok video ID from various TikTok URL formats
 * Supports:
 * - https://www.tiktok.com/@username/video/VIDEO_ID
 * - https://vm.tiktok.com/SHORT_CODE/ (short URLs - may require resolution)
 * - https://www.tiktok.com/t/SHORT_CODE/ (short URLs - may require resolution)
 * - https://m.tiktok.com/v/VIDEO_ID.html (mobile URLs)
 *
 * Uses URL parsing for robust handling of edge cases.
 */
export function extractTikTokId(url: string): string | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Handle standard tiktok.com URLs
    if (hostname.includes('tiktok.com')) {
      // Standard video URL: tiktok.com/@username/video/VIDEO_ID
      const videoMatch = urlObj.pathname.match(/\/video\/(\d+)/);
      if (videoMatch) return videoMatch[1];

      // Mobile URL: m.tiktok.com/v/VIDEO_ID.html
      const mobileMatch = urlObj.pathname.match(/\/v\/(\d+)/);
      if (mobileMatch) return mobileMatch[1];

      // Short URL: tiktok.com/t/SHORT_CODE
      // Note: These require resolution to get the actual video ID
      // For now, we'll return the short code and note it may not work in embeds
      const shortMatch = urlObj.pathname.match(/\/t\/([a-zA-Z0-9_-]+)/);
      if (shortMatch) {
        // Return null for short URLs as they need resolution
        // Could be enhanced later to resolve these
        return null;
      }
    }

    // Handle vm.tiktok.com short URLs
    if (hostname === 'vm.tiktok.com') {
      // These are redirect URLs that need resolution
      // Return null as they require an additional fetch to resolve
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get the TikTok embed URL for a video ID
 * @param videoId The TikTok video ID
 * @returns The embed URL for the iframe
 */
export function getTikTokEmbedUrl(videoId: string): string {
  return `https://www.tiktok.com/embed/v2/${videoId}`;
}

/**
 * Check if a URL is a TikTok link
 */
export function isTikTokUrl(url: string): boolean {
  return extractTikTokId(url) !== null;
}
