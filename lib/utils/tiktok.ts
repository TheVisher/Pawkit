export function extractTikTokId(url: string): string | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url);

    // TikTok patterns:
    // https://www.tiktok.com/@username/video/1234567890123456789
    // https://www.tiktok.com/t/ZMabcdef/ (short URL)
    // https://vm.tiktok.com/ZMabcdef/ (short URL)
    // https://m.tiktok.com/v/1234567890123456789

    const patterns = [
      /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
      /tiktok\.com\/t\/([\w-]+)/,
      /tiktok\.com\/v\/(\d+)/,
      /vm\.tiktok\.com\/([\w-]+)/,
      /m\.tiktok\.com\/v\/(\d+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function isTikTokUrl(url: string): boolean {
  if (!url) return false;
  return /tiktok\.com/.test(url);
}

export function getTikTokEmbedUrl(videoId: string): string {
  return `https://www.tiktok.com/player/v1/${videoId}?music_info=1&description=1`;
}
