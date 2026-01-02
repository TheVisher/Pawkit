/**
 * URL Detection Utilities
 * Functions to detect and extract information from URLs
 */

/**
 * Extract YouTube video ID from URL
 * Handles: youtube.com/watch, youtube.com/shorts, youtube.com/embed, youtu.be
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname.includes('youtube.com')) {
      // Standard: youtube.com/watch?v=VIDEO_ID
      const videoId = urlObj.searchParams.get('v');
      if (videoId) return videoId;

      // Shorts: youtube.com/shorts/VIDEO_ID
      const shortsMatch = urlObj.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) return shortsMatch[1];

      // Embed: youtube.com/embed/VIDEO_ID
      const embedMatch = urlObj.pathname.match(/^\/embed\/([a-zA-Z0-9_-]+)/);
      if (embedMatch) return embedMatch[1];
    }

    // youtu.be/VIDEO_ID
    if (hostname === 'youtu.be') {
      return urlObj.pathname.slice(1).split('/')[0];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if URL is a YouTube video
 */
export function isYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}
