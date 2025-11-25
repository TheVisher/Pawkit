/**
 * Standalone metadata fetching for mobile app
 * Extracts title, description, and images from URLs without calling external APIs
 */

export type SiteMetadata = {
  title?: string;
  description?: string;
  image?: string;
};

const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// YouTube helpers
function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname.includes('youtube.com')) {
      const videoId = urlObj.searchParams.get('v');
      if (videoId) return videoId;

      const shortsMatch = urlObj.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) return shortsMatch[1];

      const embedMatch = urlObj.pathname.match(/^\/embed\/([a-zA-Z0-9_-]+)/);
      if (embedMatch) return embedMatch[1];
    }

    if (hostname === 'youtu.be') {
      const videoId = urlObj.pathname.slice(1).split('/')[0];
      if (videoId) return videoId;
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchYouTubeMetadata(url: string, videoId: string): Promise<SiteMetadata> {
  // YouTube's reliable thumbnail API
  const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  try {
    // Try YouTube's oEmbed API for title
    const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(oEmbedUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        title: data.title || `YouTube Video - ${videoId}`,
        description: data.author_name ? `by ${data.author_name}` : 'Watch on YouTube',
        image: thumbnail,
      };
    }
  } catch (error) {
    console.log('[YouTube] oEmbed failed:', error);
  }

  return {
    title: `YouTube Video - ${videoId}`,
    description: 'Watch on YouTube',
    image: thumbnail,
  };
}

// TikTok helpers
function isTikTokUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase().includes('tiktok.com');
  } catch {
    return false;
  }
}

async function fetchTikTokMetadata(url: string): Promise<SiteMetadata | null> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(oembedUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        title: data.title || 'TikTok Video',
        description: data.author_name ? `By ${data.author_name}` : 'Watch on TikTok',
        image: data.thumbnail_url,
      };
    }
  } catch (error) {
    console.log('[TikTok] oEmbed failed:', error);
  }

  return null;
}

// Generic HTML metadata extraction
function extractMetaTag(html: string, patterns: string[]): string | undefined {
  for (const pattern of patterns) {
    // Match meta tags with property or name attribute
    const propertyRegex = new RegExp(
      `<meta[^>]*(?:property|name)=["']${pattern}["'][^>]*content=["']([^"']*)["']`,
      'i'
    );
    const contentRegex = new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${pattern}["']`,
      'i'
    );

    const propertyMatch = html.match(propertyRegex);
    if (propertyMatch) return propertyMatch[1].trim();

    const contentMatch = html.match(contentRegex);
    if (contentMatch) return contentMatch[1].trim();
  }
  return undefined;
}

function extractTitle(html: string): string | undefined {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : undefined;
}

// Extract image from JSON-LD structured data (Schema.org Product, Article, etc.)
function extractJsonLdImage(html: string, baseUrl: string): string | undefined {
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const jsonLd = JSON.parse(match[1]);
      const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd];

      for (const item of items) {
        const image = extractImageFromJsonLdItem(item, baseUrl);
        if (image) return image;

        // Check @graph structure (used by some sites like Yoast SEO)
        if (item['@graph'] && Array.isArray(item['@graph'])) {
          for (const graphItem of item['@graph']) {
            const graphImage = extractImageFromJsonLdItem(graphItem, baseUrl);
            if (graphImage) return graphImage;
          }
        }
      }
    } catch {
      // Invalid JSON, skip this script tag
    }
  }
  return undefined;
}

// JSON-LD item structure - can have various image formats
interface JsonLdItem {
  image?: string | string[] | { url?: string; contentUrl?: string } | { url?: string; contentUrl?: string }[];
  thumbnailUrl?: string | string[];
  primaryImageOfPage?: { url?: string };
  [key: string]: unknown;
}

// Helper to extract image from a single JSON-LD item
function extractImageFromJsonLdItem(item: unknown, baseUrl: string): string | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const jsonLdItem = item as JsonLdItem;

  const resolveUrl = (url: string): string | undefined => {
    if (!url) return undefined;
    try {
      return new URL(url, baseUrl).toString();
    } catch {
      return undefined;
    }
  };

  // Check direct image property
  if (jsonLdItem.image) {
    if (typeof jsonLdItem.image === 'string') {
      return resolveUrl(jsonLdItem.image);
    }
    if (Array.isArray(jsonLdItem.image)) {
      const first = jsonLdItem.image[0];
      if (typeof first === 'string') return resolveUrl(first);
      if (first && typeof first === 'object') {
        if (first.url) return resolveUrl(first.url);
        if (first.contentUrl) return resolveUrl(first.contentUrl);
      }
    }
    if (typeof jsonLdItem.image === 'object' && !Array.isArray(jsonLdItem.image)) {
      if (jsonLdItem.image.url) return resolveUrl(jsonLdItem.image.url);
      if (jsonLdItem.image.contentUrl) return resolveUrl(jsonLdItem.image.contentUrl);
    }
  }

  // Check thumbnailUrl (common in VideoObject, Product)
  if (jsonLdItem.thumbnailUrl) {
    if (typeof jsonLdItem.thumbnailUrl === 'string') {
      return resolveUrl(jsonLdItem.thumbnailUrl);
    }
    if (Array.isArray(jsonLdItem.thumbnailUrl) && jsonLdItem.thumbnailUrl[0]) {
      return resolveUrl(jsonLdItem.thumbnailUrl[0]);
    }
  }

  // Check primaryImageOfPage (WebPage schema)
  if (jsonLdItem.primaryImageOfPage?.url) {
    return resolveUrl(jsonLdItem.primaryImageOfPage.url);
  }

  return undefined;
}

async function scrapeGenericMetadata(url: string): Promise<SiteMetadata | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Extract OpenGraph and Twitter Card metadata
    const title =
      extractMetaTag(html, ['og:title', 'twitter:title']) ||
      extractTitle(html);

    const description = extractMetaTag(html, [
      'og:description',
      'twitter:description',
      'description',
    ]);

    let image = extractMetaTag(html, [
      'og:image',
      'og:image:url',
      'twitter:image',
      'twitter:image:src',
    ]);

    // Fallback: Try JSON-LD structured data
    if (!image) {
      const baseUrlObj = new URL(url);
      image = extractJsonLdImage(html, baseUrlObj.origin);
      if (image) {
        console.log('[Metadata] Found image from JSON-LD:', image.substring(0, 100));
      }
    }

    // Convert relative URLs to absolute
    if (image && !image.startsWith('http')) {
      try {
        const baseUrl = new URL(url);
        image = new URL(image, baseUrl.origin).toString();
      } catch {
        image = undefined;
      }
    }

    // Convert HTTP to HTTPS to avoid mixed content issues
    if (image?.startsWith('http://')) {
      image = image.replace('http://', 'https://');
    }

    return {
      title,
      description,
      image,
    };
  } catch (error) {
    console.error('[Metadata] Scraping failed:', error);
    return null;
  }
}

/**
 * Fetch metadata for a URL
 * Handles special cases (YouTube, TikTok) and falls back to generic scraping
 */
export async function fetchMetadata(url: string): Promise<SiteMetadata | null> {
  try {
    // YouTube - use reliable thumbnail API
    const youtubeVideoId = extractYouTubeVideoId(url);
    if (youtubeVideoId) {
      return await fetchYouTubeMetadata(url, youtubeVideoId);
    }

    // TikTok - use oEmbed API
    if (isTikTokUrl(url)) {
      const tiktokMeta = await fetchTikTokMetadata(url);
      if (tiktokMeta) return tiktokMeta;
    }

    // Generic scraping for other sites
    return await scrapeGenericMetadata(url);
  } catch (error) {
    console.error('[Metadata] Fetch failed:', error);
    return null;
  }
}
